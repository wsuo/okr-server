#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
为指定考核批量补齐 Boss 默认评分（用于线上数据修复/补录）。

设计说明：
1) 只对指定 assessment_id 生效，并且只补齐缺失的 boss 评分（evaluations 中 type='boss' 不存在的记录）。
2) 在写入前校验：所有参与者必须已完成 self + leader（满足“可一键默认评分”的前置条件）。
3) 最终分数按模板 two_tier_weighted 规则计算：boss_weight + employee_leader_weight*(self/leader 内权重)。
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Tuple

import pymysql


def _load_env_file(path: str) -> Dict[str, str]:
    env: Dict[str, str] = {}
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


@dataclass(frozen=True)
class WeightConfig:
    self_weight: Decimal
    leader_weight: Decimal
    boss_weight: Decimal


def _parse_two_tier_weights(template_config: Any) -> WeightConfig:
    """
    解析模板 two_tier_weighted 权重，返回三维度最终权重（小数，例如 0.24）。
    """
    if isinstance(template_config, str):
        template_config = json.loads(template_config)
    scoring_rules = (template_config or {}).get("scoring_rules") or {}
    if scoring_rules.get("scoring_mode") != "two_tier_weighted":
        raise ValueError("该考核模板不是 two_tier_weighted，拒绝执行默认 Boss 评分补齐")

    cfg = scoring_rules.get("two_tier_config") or {}
    boss_weight = Decimal(str(cfg.get("boss_weight", 0))) / Decimal("100")
    employee_leader_weight = Decimal(str(cfg.get("employee_leader_weight", 0))) / Decimal("100")
    self_in_el = Decimal(str(cfg.get("self_weight_in_employee_leader", 0))) / Decimal("100")
    leader_in_el = Decimal(str(cfg.get("leader_weight_in_employee_leader", 0))) / Decimal("100")

    # 两层加权：先在员工+领导层内加权，再乘以 employee_leader_weight，再加上 boss_weight。
    self_weight = employee_leader_weight * self_in_el
    leader_weight = employee_leader_weight * leader_in_el

    # 基本校验（允许少量浮点/配置误差，这里用 Decimal 严格判断）
    if (boss_weight + employee_leader_weight) != Decimal("1"):
        raise ValueError("two_tier_config 第一层权重之和必须为 100")
    if (self_in_el + leader_in_el) != Decimal("1"):
        raise ValueError("two_tier_config 第二层权重之和必须为 100")

    return WeightConfig(self_weight=self_weight, leader_weight=leader_weight, boss_weight=boss_weight)


def _decimal(v: Any) -> Optional[Decimal]:
    if v is None:
        return None
    return Decimal(str(v))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=".env", help="dotenv 文件路径（默认 .env）")
    parser.add_argument("--assessment-id", type=int, required=True, help="assessments.id")
    parser.add_argument("--score", type=Decimal, default=Decimal("90.00"), help="默认 Boss 分数（默认 90）")
    parser.add_argument("--evaluator-id", type=int, default=2, help="Boss 评估人 user_id（默认 2）")
    parser.add_argument("--dry-run", action="store_true", help="只预览，不写入")
    args = parser.parse_args()

    env = _load_env_file(args.env_file)
    host = env.get("DB_HOST", "localhost")
    port = int(env.get("DB_PORT", "3306"))
    user = env.get("DB_USERNAME", "root")
    password = env.get("DB_PASSWORD", "")
    database = env.get("DB_DATABASE", "")

    if not database:
        raise SystemExit("DB_DATABASE 为空，无法连接数据库")

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )

    try:
        with conn.cursor() as cur:
            # 1) 校验考核存在并读取模板配置快照（优先使用 assessments.template_config）
            cur.execute(
                """
                SELECT id, period, title, status, template_config
                FROM assessments
                WHERE id=%s AND deleted_at IS NULL
                """,
                (args.assessment_id,),
            )
            assessment = cur.fetchone()
            if not assessment:
                raise SystemExit(f"未找到考核 assessments.id={args.assessment_id}")

            template_config = assessment.get("template_config")
            if template_config is None:
                raise SystemExit("该考核没有 template_config 快照（不建议对线上进行默认评分补齐）")

            weights = _parse_two_tier_weights(template_config)

            # 2) 拉取参与者并校验 self/leader 均完成
            cur.execute(
                """
                SELECT ap.id AS participant_id,
                       ap.user_id,
                       u.name AS user_name,
                       ap.self_completed, ap.leader_completed, ap.boss_completed,
                       ap.self_score, ap.leader_score, ap.boss_score, ap.final_score
                FROM assessment_participants ap
                JOIN users u ON u.id = ap.user_id AND u.deleted_at IS NULL
                WHERE ap.assessment_id=%s AND ap.deleted_at IS NULL
                ORDER BY ap.user_id
                """,
                (args.assessment_id,),
            )
            participants: List[Dict[str, Any]] = list(cur.fetchall())
            if not participants:
                raise SystemExit("该考核没有参与者，终止")

            not_ready = [
                p
                for p in participants
                if int(p["self_completed"]) != 1 or int(p["leader_completed"]) != 1
            ]
            if not_ready:
                names = ", ".join([f'{p["user_name"]}(user_id={p["user_id"]})' for p in not_ready])
                raise SystemExit(f"存在未完成自评/领导评的参与者，禁止默认 Boss 评分补齐：{names}")

            # 3) 找出缺失的 boss evaluation（以 evaluations 表为准）
            cur.execute(
                """
                SELECT evaluatee_id
                FROM evaluations
                WHERE assessment_id=%s AND type='boss'
                """,
                (args.assessment_id,),
            )
            existing_eval_user_ids: Set[int] = {int(r["evaluatee_id"]) for r in cur.fetchall()}
            all_user_ids: List[int] = [int(p["user_id"]) for p in participants]
            to_insert_user_ids: List[int] = [uid for uid in all_user_ids if uid not in existing_eval_user_ids]

            # 4) 预览：计算期望 final_score
            preview_rows: List[Tuple[int, str, Decimal]] = []
            for p in participants:
                self_score = _decimal(p["self_score"])
                leader_score = _decimal(p["leader_score"])
                if self_score is None or leader_score is None:
                    raise SystemExit(f"参与者 user_id={p['user_id']} 缺少 self_score/leader_score，无法计算")
                expected_final = (self_score * weights.self_weight) + (
                    leader_score * weights.leader_weight
                ) + (args.score * weights.boss_weight)
                expected_final = expected_final.quantize(Decimal("0.01"))
                preview_rows.append((int(p["user_id"]), str(p["user_name"]), expected_final))

            print("✅ 数据库连接成功")
            print(
                f"🔎 目标考核: id={assessment['id']} period={assessment['period']} status={assessment['status']} title={assessment['title']}"
            )
            print(
                f"🧮 权重: self={weights.self_weight} leader={weights.leader_weight} boss={weights.boss_weight}（score={args.score}）"
            )
            print(f"👥 参与者总数: {len(participants)}")
            print(f"📝 将补齐 boss evaluation 的人数: {len(to_insert_user_ids)}")

            if args.dry_run:
                print("\n🔍 Dry-run 预览（仅展示前 12 行）：")
                for uid, name, final_score in preview_rows[:12]:
                    print(f"  - user_id={uid} name={name} expected_final_score={final_score}")
                print("\nℹ️  未执行写入（--dry-run）")
                return

            # 5) 执行写入（事务）
            now_sql = "UTC_TIMESTAMP()"
            try:
                # 5.1 插入缺失的 boss evaluations
                if to_insert_user_ids:
                    insert_sql = f"""
                      INSERT INTO evaluations (
                        assessment_id, evaluator_id, evaluatee_id, type,
                        score, feedback, strengths, improvements, detailed_scores,
                        status, submitted_at, created_at, updated_at
                      )
                      VALUES (
                        %s, %s, %s, 'boss',
                        %s, NULL, NULL, NULL, NULL,
                        'submitted', {now_sql}, {now_sql}, {now_sql}
                      )
                    """
                    cur.executemany(
                        insert_sql,
                        [
                            (
                                args.assessment_id,
                                args.evaluator_id,
                                uid,
                                str(args.score),
                            )
                            for uid in to_insert_user_ids
                        ],
                    )

                # 5.2 更新参与者 boss 字段 + final_score（只更新 boss 未完成的记录）
                update_sql = f"""
                  UPDATE assessment_participants
                  SET boss_completed=1,
                      boss_score=%s,
                      boss_submitted_at={now_sql},
                      final_score=ROUND(self_score * %s + leader_score * %s + %s * %s, 2),
                      updated_at={now_sql}
                  WHERE assessment_id=%s
                    AND deleted_at IS NULL
                    AND boss_completed=0
                """
                cur.execute(
                    update_sql,
                    (
                        str(args.score),
                        str(weights.self_weight),
                        str(weights.leader_weight),
                        str(args.score),
                        str(weights.boss_weight),
                        args.assessment_id,
                    ),
                )

                # 5.3 如果全员完成三维度，自动把考核置为 completed（与后端逻辑保持一致）
                cur.execute(
                    """
                    UPDATE assessments a
                    SET a.status='completed', a.updated_at=UTC_TIMESTAMP()
                    WHERE a.id=%s
                      AND a.status='active'
                      AND NOT EXISTS (
                        SELECT 1
                        FROM assessment_participants ap
                        WHERE ap.assessment_id=%s
                          AND ap.deleted_at IS NULL
                          AND (ap.self_completed<>1 OR ap.leader_completed<>1 OR ap.boss_completed<>1)
                      )
                    """,
                    (args.assessment_id, args.assessment_id),
                )

                conn.commit()
            except Exception:
                conn.rollback()
                raise

            # 6) 写入后验证
            cur.execute(
                """
                SELECT
                  COUNT(*) AS participant_cnt,
                  SUM(self_completed=1) AS self_completed_cnt,
                  SUM(leader_completed=1) AS leader_completed_cnt,
                  SUM(boss_completed=1) AS boss_completed_cnt,
                  ROUND(AVG(self_score), 2) AS avg_self_score,
                  ROUND(AVG(leader_score), 2) AS avg_leader_score,
                  ROUND(AVG(boss_score), 2) AS avg_boss_score,
                  ROUND(AVG(final_score), 2) AS avg_final_score
                FROM assessment_participants
                WHERE assessment_id=%s AND deleted_at IS NULL
                """,
                (args.assessment_id,),
            )
            after_stats = cur.fetchone()

            cur.execute(
                "SELECT COUNT(*) AS boss_eval_cnt FROM evaluations WHERE assessment_id=%s AND type='boss'",
                (args.assessment_id,),
            )
            boss_eval_cnt = cur.fetchone()

            cur.execute(
                "SELECT id, status FROM assessments WHERE id=%s",
                (args.assessment_id,),
            )
            assessment_after = cur.fetchone()

            print("\n✅ 写入完成")
            print(f"📌 assessments.status: {assessment_after['status']}")
            print(f"📊 boss evaluations: {boss_eval_cnt['boss_eval_cnt']}")
            print(
                "📊 participants:",
                after_stats,
            )
    finally:
        conn.close()


if __name__ == "__main__":
    main()

