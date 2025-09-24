import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { User } from "../../entities/user.entity";
import { Assessment } from "../../entities/assessment.entity";
import { AssessmentParticipant } from "../../entities/assessment-participant.entity";
import { Evaluation } from "../../entities/evaluation.entity";
import { Okr } from "../../entities/okr.entity";
import { Department } from "../../entities/department.entity";
import { Template } from "../../entities/template.entity";
import { EvaluationStatus } from "../../common/enums/evaluation.enum";
import { StatisticsQueryDto } from "./dto/statistics-query.dto";

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
    private dataSource: DataSource
  ) {}

  async getDashboard(query?: StatisticsQueryDto) {
    try {
      this.logger.log(`Fetching dashboard statistics with query: ${JSON.stringify(query)}`);

      // 构建时间过滤条件
      const whereConditions = this.buildTimeConditions(query);

      const [
        totalUsers,
        activeAssessments,
        completedAssessments,
        totalEvaluations,
        totalTemplates,
        averageScores,
        departmentStats,
        recentAssessments,
        scoreDistribution,
        participantStats,
      ] = await Promise.all([
        this.getTotalUsersCount(whereConditions),
        this.getAssessmentCount("active", whereConditions),
        this.getAssessmentCount("completed", whereConditions),
        this.getEvaluationCount(whereConditions),
        this.templatesRepository.count({ where: { deleted_at: null } as any }),
        this.getAverageScores(whereConditions),
        this.getDepartmentStatistics(whereConditions),
        this.getRecentAssessments(whereConditions),
        this.getScoreDistribution(whereConditions),
        this.getParticipantCompletionStats(whereConditions),
      ]);

      this.logger.debug(`Dashboard statistics fetched successfully: ${totalUsers} users, ${activeAssessments} active assessments`);

      // 计算完成率：基于参与者的评估完成情况
      const totalParticipants = participantStats.total_participants;
      const completedParticipants = participantStats.completed_participants;
      const completionRate = totalParticipants > 0 
        ? (completedParticipants / totalParticipants) * 100 
        : 0;

      return {
        overview: {
          total_users: totalUsers,
          active_assessments: activeAssessments,
          completed_assessments: completedAssessments,
          total_evaluations: totalEvaluations,
          total_templates: totalTemplates,
          completion_rate: Number(completionRate.toFixed(1)),
          average_score: averageScores.overall,
          self_average: averageScores.self,
          leader_average: averageScores.leader,
        },
        department_stats: departmentStats,
        recent_assessments: recentAssessments,
        score_distribution: scoreDistribution,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch dashboard statistics');
    }
  }

  async getAssessmentStatistics(query: StatisticsQueryDto) {
    try {
      this.logger.log(`Fetching assessment statistics with query: ${JSON.stringify(query)}`);

      const { start_date, end_date, department_id } = query;

      const queryBuilder = this.assessmentsRepository
        .createQueryBuilder("assessment")
        .leftJoin("assessment.participants", "participant")
        .leftJoin("participant.user", "user")
        .leftJoin("user.department", "department")
        .select([
          "assessment.id",
          "assessment.title",
          "assessment.status",
          "assessment.start_date",
          "assessment.end_date",
          "COUNT(participant.id) as participant_count",
          "SUM(CASE WHEN participant.self_completed = 1 THEN 1 ELSE 0 END) as self_completed",
          "SUM(CASE WHEN participant.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed",
          "AVG(participant.self_score) as avg_self_score",
          "AVG(participant.leader_score) as avg_leader_score",
        ])
        .groupBy("assessment.id");

      if (start_date) {
        queryBuilder.andWhere("assessment.start_date >= :start_date", {
          start_date,
        });
      }
      if (end_date) {
        queryBuilder.andWhere("assessment.end_date <= :end_date", { end_date });
      }
      if (department_id) {
        queryBuilder.andWhere("department.id = :department_id", {
          department_id,
        });
      }

      const result = await queryBuilder.getRawMany();
      this.logger.debug(`Assessment statistics fetched: ${result.length} records`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch assessment statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch assessment statistics');
    }
  }

  async getUserStatistics(query: StatisticsQueryDto) {
    try {
      this.logger.log(`Fetching user statistics with query: ${JSON.stringify(query)}`);

      const { department_id, user_id, assessment_id } = query;
      
      // 构建时间过滤条件
      const whereConditions = this.buildTimeConditions(query);

      const queryBuilder = this.participantsRepository
        .createQueryBuilder("participant")
        .leftJoin("participant.user", "user")
        .leftJoin("user.department", "department")
        .leftJoin("participant.assessment", "assessment")
        .leftJoin("user.roles", "role")
        .select([
          "user.id",
          "user.username",
          "user.name",
          "department.name as department_name",
          "COUNT(participant.id) as total_assessments",
          "SUM(CASE WHEN participant.self_completed = 1 THEN 1 ELSE 0 END) as self_completed",
          "SUM(CASE WHEN participant.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed",
          "AVG(participant.self_score) as avg_self_score",
          "AVG(participant.leader_score) as avg_leader_score",
        ])
        .where("participant.deleted_at IS NULL") // Only include non-deleted participants
        .andWhere("user.deleted_at IS NULL") // Only include non-deleted users
        .andWhere("(role.code != 'admin' OR role.code IS NULL)") // Exclude admin users
        .andWhere("(role.code != 'boss' OR role.code IS NULL)") // Exclude boss users
        .groupBy("user.id");

      // 添加时间过滤条件
      if (whereConditions.start_date) {
        queryBuilder.andWhere("assessment.start_date >= :start_date", {
          start_date: whereConditions.start_date,
        });
      }
      if (whereConditions.end_date) {
        queryBuilder.andWhere("assessment.end_date <= :end_date", {
          end_date: whereConditions.end_date,
        });
      }

      if (department_id) {
        queryBuilder.andWhere("department.id = :department_id", {
          department_id,
        });
      }
      if (user_id) {
        queryBuilder.andWhere("user.id = :user_id", { user_id });
      }
      if (assessment_id) {
        queryBuilder.andWhere("assessment.id = :assessment_id", {
          assessment_id,
        });
      }

      const result = await queryBuilder.getRawMany();
      this.logger.debug(`User statistics fetched: ${result.length} records`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch user statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch user statistics');
    }
  }

  async getDepartmentStatistics(whereConditions: any = {}) {
    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        "d.id",
        "d.name",
        "COUNT(DISTINCT u.id) as user_count",
        "COUNT(DISTINCT p.id) as participant_count",
        "AVG(p.self_score) as avg_self_score",
        "AVG(p.leader_score) as avg_leader_score",
        "SUM(CASE WHEN p.self_completed = 1 THEN 1 ELSE 0 END) as self_completed",
        "SUM(CASE WHEN p.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed",
      ])
      .from(Department, "d")
      .leftJoin(User, "u", "u.department_id = d.id AND u.deleted_at IS NULL")
      .leftJoin(AssessmentParticipant, "p", "p.user_id = u.id AND p.deleted_at IS NULL")
      .leftJoin(Assessment, "a", "a.id = p.assessment_id")
      .where("d.deleted_at IS NULL");

    if (whereConditions.start_date) {
      queryBuilder.andWhere("a.start_date >= :start_date", {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere("a.end_date <= :end_date", {
        end_date: whereConditions.end_date,
      });
    }

    const result = await queryBuilder
      .groupBy("d.id")
      .orderBy("d.name")
      .getRawMany();

    return result.map((item) => ({
      id: item.d_id,
      name: item.d_name,
      user_count: parseInt(item.user_count) || 0,
      participant_count: parseInt(item.participant_count) || 0,
      avg_self_score: parseFloat(item.avg_self_score) || 0,
      avg_leader_score: parseFloat(item.avg_leader_score) || 0,
      self_completion_rate:
        item.participant_count > 0
          ? (parseInt(item.self_completed) / parseInt(item.participant_count)) *
            100
          : 0,
      leader_completion_rate:
        item.participant_count > 0
          ? (parseInt(item.leader_completed) /
              parseInt(item.participant_count)) *
            100
          : 0,
    }));
  }

  async getOkrStatistics(query: StatisticsQueryDto) {
    try {
      this.logger.log(`Fetching OKR statistics with query: ${JSON.stringify(query)}`);

      const { department_id, user_id, assessment_id } = query;

      const queryBuilder = this.okrsRepository
        .createQueryBuilder("okr")
        .leftJoinAndSelect("okr.user", "user")
        .leftJoinAndSelect("user.department", "department")
        .leftJoinAndSelect("okr.assessment", "assessment")
        .leftJoinAndSelect("okr.keyResults", "keyResults")
        .select([
          "okr.id",
          "okr.objective", // 修改为 objective 而不是 title
          "okr.progress",
          "okr.self_rating", // 修改为 self_rating 而不是 rating
          "user.name",
          "department.name as department_name",
          "assessment.title as assessment_title",
          "AVG(keyResults.progress) as avg_key_result_progress",
          "COUNT(keyResults.id) as key_result_count",
        ])
        .groupBy("okr.id");

      if (department_id) {
        queryBuilder.andWhere("department.id = :department_id", {
          department_id,
        });
      }
      if (user_id) {
        queryBuilder.andWhere("user.id = :user_id", { user_id });
      }
      if (assessment_id) {
        queryBuilder.andWhere("assessment.id = :assessment_id", {
          assessment_id,
        });
      }

      const result = await queryBuilder.getRawMany();
      this.logger.debug(`OKR statistics fetched: ${result.length} records`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch OKR statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch OKR statistics');
    }
  }

  async getEvaluationStatistics(query: StatisticsQueryDto) {
    const { start_date, end_date, department_id } = query;

    const queryBuilder = this.evaluationsRepository
      .createQueryBuilder("evaluation")
      .leftJoinAndSelect("evaluation.evaluatee", "evaluatee")
      .leftJoinAndSelect("evaluatee.department", "department")
      .leftJoinAndSelect("evaluation.evaluator", "evaluator")
      .leftJoinAndSelect("evaluation.assessment", "assessment")
      .select([
        "evaluation.type",
        "evaluation.score",
        "evaluation.status",
        "evaluation.submitted_at",
        "evaluatee.name as evaluatee_name",
        "evaluator.name as evaluator_name",
        "department.name as department_name",
        "assessment.title as assessment_title",
      ]);

    if (start_date) {
      queryBuilder.andWhere("evaluation.submitted_at >= :start_date", {
        start_date,
      });
    }
    if (end_date) {
      queryBuilder.andWhere("evaluation.submitted_at <= :end_date", {
        end_date,
      });
    }
    if (department_id) {
      queryBuilder.andWhere("department.id = :department_id", {
        department_id,
      });
    }

    return queryBuilder.getMany();
  }

  private async getAverageScores(whereConditions: any = {}) {
    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'AVG(CASE WHEN e.type = "self" THEN e.score END) as self_avg',
        'AVG(CASE WHEN e.type = "leader" THEN e.score END) as leader_avg',
        "AVG(e.score) as overall_avg",
      ])
      .from(Evaluation, "e")
      .leftJoin("e.assessment", "assessment")
      .where("e.status = :status", { status: "submitted" });

    if (whereConditions.start_date) {
      queryBuilder.andWhere("assessment.start_date >= :start_date", {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere("assessment.end_date <= :end_date", {
        end_date: whereConditions.end_date,
      });
    }

    const result = await queryBuilder.getRawOne();

    return {
      self: parseFloat(result.self_avg) || 0,
      leader: parseFloat(result.leader_avg) || 0,
      overall: parseFloat(result.overall_avg) || 0,
    };
  }

  private async getRecentAssessments(whereConditions: any = {}) {
    const queryBuilder = this.assessmentsRepository
      .createQueryBuilder("assessment")
      .leftJoinAndSelect("assessment.creator", "creator")
      .select([
        "assessment.id",
        "assessment.title",
        "assessment.status",
        "assessment.start_date",
        "assessment.end_date",
        "assessment.created_at",
        "creator.id",
        "creator.name",
      ])
      .take(10)
      .orderBy("assessment.created_at", "DESC");

    if (whereConditions.start_date) {
      queryBuilder.andWhere("assessment.start_date >= :start_date", {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere("assessment.end_date <= :end_date", {
        end_date: whereConditions.end_date,
      });
    }

    return await queryBuilder.getMany();
  }

  private async getScoreDistribution(whereConditions: any = {}) {
    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        "SUM(CASE WHEN e.score >= 90 THEN 1 ELSE 0 END) as excellent",
        "SUM(CASE WHEN e.score >= 80 AND e.score < 90 THEN 1 ELSE 0 END) as good",
        "SUM(CASE WHEN e.score >= 70 AND e.score < 80 THEN 1 ELSE 0 END) as average",
        "SUM(CASE WHEN e.score < 70 THEN 1 ELSE 0 END) as poor",
      ])
      .from(Evaluation, "e")
      .leftJoin("e.assessment", "assessment")
      .where("e.status = :status", { status: "submitted" });

    if (whereConditions.start_date) {
      queryBuilder.andWhere("assessment.start_date >= :start_date", {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere("assessment.end_date <= :end_date", {
        end_date: whereConditions.end_date,
      });
    }

    const result = await queryBuilder.getRawOne();

    return {
      excellent: parseInt(result.excellent) || 0,
      good: parseInt(result.good) || 0,
      average: parseInt(result.average) || 0,
      poor: parseInt(result.poor) || 0,
    };
  }

  async getPerformanceTrends(query: StatisticsQueryDto) {
    const {
      start_date,
      end_date,
      time_dimension = "month",
      department_id,
    } = query;

    let timeFormat = "%Y-%m";
    switch (time_dimension) {
      case "day":
        timeFormat = "%Y-%m-%d";
        break;
      case "week":
        timeFormat = "%Y-%u";
        break;
      case "quarter":
        timeFormat = "%Y-Q%q";
        break;
      case "year":
        timeFormat = "%Y";
        break;
    }

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        `DATE_FORMAT(e.submitted_at, '${timeFormat}') as period`,
        "AVG(e.score) as avg_score",
        "COUNT(e.id) as evaluation_count",
        'AVG(CASE WHEN e.type = "self" THEN e.score END) as self_avg',
        'AVG(CASE WHEN e.type = "leader" THEN e.score END) as leader_avg',
      ])
      .from(Evaluation, "e")
      .leftJoin(User, "u", "e.evaluatee_id = u.id")
      .leftJoin(Department, "d", "u.department_id = d.id")
      .where("e.status = :status", { status: "submitted" })
      .groupBy("period")
      .orderBy("period");

    if (start_date) {
      queryBuilder.andWhere("e.submitted_at >= :start_date", { start_date });
    }
    if (end_date) {
      queryBuilder.andWhere("e.submitted_at <= :end_date", { end_date });
    }
    if (department_id) {
      queryBuilder.andWhere("d.id = :department_id", { department_id });
    }

    return queryBuilder.getRawMany();
  }

  async getPerformanceList(query: StatisticsQueryDto) {
    try {
      this.logger.log(`Fetching performance list with query: ${JSON.stringify(query)}`);

      const { department_id, user_id } = query;
      
      // 构建时间过滤条件
      const whereConditions = this.buildTimeConditions(query);

      // Step 1: Get all participants with their assessment data and actual evaluation scores
      const queryBuilder = this.participantsRepository
        .createQueryBuilder("participant")
        .leftJoin("participant.user", "user")
        .leftJoin("user.department", "department")
        .leftJoin("participant.assessment", "assessment")
        .leftJoin("user.roles", "role")
        // Join with evaluations to get actual scores
        .leftJoin(
          "evaluations",
          "self_eval",
          "self_eval.assessment_id = assessment.id AND self_eval.evaluatee_id = user.id AND self_eval.type = 'self' AND self_eval.status = 'submitted'"
        )
        .leftJoin(
          "evaluations",
          "leader_eval",
          "leader_eval.assessment_id = assessment.id AND leader_eval.evaluatee_id = user.id AND leader_eval.type = 'leader' AND leader_eval.status = 'submitted'"
        )
        .leftJoin(
          "evaluations",
          "boss_eval",
          "boss_eval.assessment_id = assessment.id AND boss_eval.evaluatee_id = user.id AND boss_eval.type = 'boss' AND boss_eval.status = 'submitted'"
        )
        .select([
          "participant.id as participant_id",
          "participant.self_completed",
          "participant.leader_completed",
          "participant.final_score as participant_final_score",
          "participant.self_submitted_at",
          "participant.leader_submitted_at",
          "assessment.id as assessment_id",
          "assessment.title as assessment_title",
          "assessment.period as assessment_period",
          "assessment.start_date as assessment_start_date",
          "assessment.end_date as assessment_end_date",
          "assessment.status as assessment_status",
          "user.id as user_id",
          "user.name as user_name",
          "user.username as user_username",
          "user.position as user_position",
          "department.name as department_name",
          // Get actual scores from evaluations table
          "self_eval.score as actual_self_score",
          "self_eval.submitted_at as self_evaluation_submitted_at",
          "leader_eval.score as actual_leader_score",
          "leader_eval.submitted_at as leader_evaluation_submitted_at",
          "boss_eval.score as actual_boss_score",
          "boss_eval.submitted_at as boss_evaluation_submitted_at",
        ])
        .where("participant.deleted_at IS NULL")
        .andWhere("user.deleted_at IS NULL")
        .andWhere("assessment.deleted_at IS NULL")
        .andWhere("(role.code != 'admin' OR role.code IS NULL)") // Exclude admin users
        .andWhere("(role.code != 'boss' OR role.code IS NULL)"); // Exclude boss users

      // 添加时间过滤条件
      if (whereConditions.start_date) {
        queryBuilder.andWhere("assessment.start_date >= :start_date", {
          start_date: whereConditions.start_date,
        });
      }
      if (whereConditions.end_date) {
        queryBuilder.andWhere("assessment.end_date <= :end_date", {
          end_date: whereConditions.end_date,
        });
      }

      if (department_id) {
        queryBuilder.andWhere("department.id = :department_id", {
          department_id,
        });
      }
      if (user_id) {
        queryBuilder.andWhere("user.id = :user_id", { user_id });
      }

      // Order by assessment start date descending to get latest assessments first
      queryBuilder.orderBy("assessment.start_date", "DESC");

      const allResults = await queryBuilder.getRawMany();

      this.logger.debug(`Found ${allResults.length} total participant records`);

      // Step 2: Group by user and get the latest assessment for each user
      // Prioritize assessments with actual evaluation data
      const userLatestAssessments = new Map();

      for (const result of allResults) {
        const userId = result.user_id;
        const hasSelfEval = result.actual_self_score !== null;
        const hasLeaderEval = result.actual_leader_score !== null;
        const hasBossEval = result.actual_boss_score !== null;
        const hasAnyEval = hasSelfEval || hasLeaderEval || hasBossEval;

        if (!userLatestAssessments.has(userId)) {
          // First record for this user
          userLatestAssessments.set(userId, result);
        } else {
          const existing = userLatestAssessments.get(userId);
          const existingHasSelfEval = existing.actual_self_score !== null;
          const existingHasLeaderEval = existing.actual_leader_score !== null;
          const existingHasBossEval = existing.actual_boss_score !== null;
          const existingHasAnyEval = existingHasSelfEval || existingHasLeaderEval || existingHasBossEval;

          // Replace if:
          // 1. Current record has evaluation data and existing doesn't, OR
          // 2. Both have evaluation data but current is more recent, OR
          // 3. Neither has evaluation data but current assessment is more recent
          if (
            (hasAnyEval && !existingHasAnyEval) ||
            (hasAnyEval && existingHasAnyEval &&
             new Date(result.assessment_start_date) > new Date(existing.assessment_start_date)) ||
            (!hasAnyEval && !existingHasAnyEval &&
             new Date(result.assessment_start_date) > new Date(existing.assessment_start_date))
          ) {
            userLatestAssessments.set(userId, result);
          }
        }
      }

      // Step 3: Transform the result to a more readable format
      const transformedResult = Array.from(userLatestAssessments.values()).map(item => {
        const selfScore = parseFloat(item.actual_self_score) || 0;
        const leaderScore = parseFloat(item.actual_leader_score) || 0;
        const bossScore = parseFloat(item.actual_boss_score) || 0;
        const finalScore = parseFloat(item.participant_final_score) || 0;

        return {
          assessment: {
            id: item.assessment_id,
            title: item.assessment_title,
            period: item.assessment_period,
            start_date: item.assessment_start_date,
            end_date: item.assessment_end_date,
            status: item.assessment_status,
          },
          employee: {
            id: item.user_id,
            name: item.user_name,
            username: item.user_username,
            position: item.user_position,
            department: item.department_name,
          },
          scores: {
            self_score: selfScore,
            leader_score: leaderScore,
            boss_score: bossScore,
            final_score: finalScore,
          },
          completion: {
            self_completed: item.actual_self_score !== null,
            leader_completed: item.actual_leader_score !== null,
            boss_completed: item.actual_boss_score !== null,
            self_submitted_at: item.self_evaluation_submitted_at || item.self_submitted_at,
            leader_submitted_at: item.leader_evaluation_submitted_at || item.leader_submitted_at,
            boss_submitted_at: item.boss_evaluation_submitted_at,
          },
        };
      });

      this.logger.debug(`Performance list fetched: ${transformedResult.length} unique employees`);
      return transformedResult;
    } catch (error) {
      this.logger.error(`Failed to fetch performance list: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch performance list');
    }
  }

  /**
   * 获取总用户数量（支持时间过滤：参与了指定时间范围内考核的用户）
   */
  private async getTotalUsersCount(whereConditions: any = {}) {
    // 如果没有时间过滤条件，返回所有活跃用户数量
    if (!whereConditions.start_date && !whereConditions.end_date) {
      return await this.usersRepository.count({
        where: { deleted_at: null } as any
      });
    }

    // 有时间过滤条件时，统计参与了指定时间范围内考核的用户数量
    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT u.id) as user_count')
      .from(User, 'u')
      .leftJoin(AssessmentParticipant, 'p', 'p.user_id = u.id AND p.deleted_at IS NULL')
      .leftJoin(Assessment, 'a', 'a.id = p.assessment_id AND a.deleted_at IS NULL')
      .where('u.deleted_at IS NULL');

    if (whereConditions.start_date) {
      queryBuilder.andWhere('a.start_date >= :start_date', {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere('a.end_date <= :end_date', {
        end_date: whereConditions.end_date,
      });
    }

    const result = await queryBuilder.getRawOne();
    return parseInt(result.user_count) || 0;
  }

  /**
   * 获取参与者完成统计（支持时间过滤）
   */
  private async getParticipantCompletionStats(whereConditions: any = {}) {
    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(p.id) as total_participants',
        'SUM(CASE WHEN (p.self_completed = 1 AND p.leader_completed = 1) THEN 1 ELSE 0 END) as completed_participants',
      ])
      .from(AssessmentParticipant, 'p')
      .leftJoin(Assessment, 'a', 'a.id = p.assessment_id')
      .where('p.deleted_at IS NULL')
      .andWhere('a.deleted_at IS NULL');

    if (whereConditions.start_date) {
      queryBuilder.andWhere('a.start_date >= :start_date', {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere('a.end_date <= :end_date', {
        end_date: whereConditions.end_date,
      });
    }

    const result = await queryBuilder.getRawOne();
    return {
      total_participants: parseInt(result.total_participants) || 0,
      completed_participants: parseInt(result.completed_participants) || 0,
    };
  }

  /**
   * 构建时间过滤条件
   */
  buildTimeConditions(query?: StatisticsQueryDto) {
    if (!query?.month) return {};

    // 解析月份格式 YYYY-MM
    const [year, month] = query.month.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  }

  /**
   * 获取指定状态的考核数量（支持时间过滤）
   */
  private async getAssessmentCount(status: string, whereConditions: any = {}) {
    const queryBuilder = this.assessmentsRepository
      .createQueryBuilder("assessment")
      .where("assessment.status = :status", { status });

    if (whereConditions.start_date) {
      queryBuilder.andWhere("assessment.start_date >= :start_date", {
        start_date: whereConditions.start_date,
      });
    }
    if (whereConditions.end_date) {
      queryBuilder.andWhere("assessment.end_date <= :end_date", {
        end_date: whereConditions.end_date,
      });
    }

    return await queryBuilder.getCount();
  }

  /**
   * 获取评估数量（支持时间过滤，基于评估提交时间）
   */
  private async getEvaluationCount(whereConditions: any = {}) {
    const queryBuilder = this.evaluationsRepository
      .createQueryBuilder("evaluation")
      .leftJoin("evaluation.assessment", "assessment")
      .where("evaluation.status = :status", { status: EvaluationStatus.SUBMITTED });

    // 优先使用评估的提交时间进行过滤，如果没有则使用考核时间
    if (whereConditions.start_date && whereConditions.end_date) {
      // 当有具体的时间范围时，使用评估提交时间
      queryBuilder.andWhere(
        "(evaluation.submitted_at >= :start_date AND evaluation.submitted_at <= :end_date_end) OR " +
        "(evaluation.submitted_at IS NULL AND assessment.start_date >= :start_date AND assessment.end_date <= :end_date)",
        {
          start_date: whereConditions.start_date,
          end_date: whereConditions.end_date,
          end_date_end: whereConditions.end_date + ' 23:59:59',
        }
      );
    } else {
      // 回退到考核时间过滤
      if (whereConditions.start_date) {
        queryBuilder.andWhere("assessment.start_date >= :start_date", {
          start_date: whereConditions.start_date,
        });
      }
      if (whereConditions.end_date) {
        queryBuilder.andWhere("assessment.end_date <= :end_date", {
          end_date: whereConditions.end_date,
        });
      }
    }

    return await queryBuilder.getCount();
  }
}
