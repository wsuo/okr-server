import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, DataSource, In } from "typeorm";
import { Assessment } from "../../entities/assessment.entity";
import { AssessmentParticipant } from "../../entities/assessment-participant.entity";
import { User } from "../../entities/user.entity";
import { Okr } from "../../entities/okr.entity";
import { Evaluation } from "../../entities/evaluation.entity";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";
import { EditAssessmentDto } from "./dto/edit-assessment.dto";
import { QueryAssessmentsDto } from "./dto/query-assessments.dto";
import { ScoreCalculationService } from "./services/score-calculation.service";

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    private dataSource: DataSource,
    private scoreCalculationService: ScoreCalculationService
  ) {}

  async findAll(query: QueryAssessmentsDto) {
    const { page = 1, limit = 10, status, period, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.assessmentsRepository
      .createQueryBuilder("assessment")
      .leftJoinAndSelect("assessment.creator", "creator")
      .leftJoinAndSelect("assessment.template", "template")
      .leftJoin(
        "assessment.participants",
        "participants",
        "participants.deleted_at IS NULL"
      )
      .addSelect([
        "COUNT(participants.id) as total_participants",
        "SUM(CASE WHEN participants.self_completed = 1 THEN 1 ELSE 0 END) as self_completed_count",
        "SUM(CASE WHEN participants.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed_count",
        "SUM(CASE WHEN participants.self_completed = 1 AND participants.leader_completed = 1 THEN 1 ELSE 0 END) as fully_completed_count",
      ])
      .where("assessment.deleted_at IS NULL");

    if (status) {
      queryBuilder.andWhere("assessment.status = :status", { status });
    }

    if (period) {
      queryBuilder.andWhere("assessment.period = :period", { period });
    }

    if (search) {
      queryBuilder.andWhere("assessment.title LIKE :search", {
        search: `%${search}%`,
      });
    }

    queryBuilder
      .groupBy("assessment.id")
      .orderBy("assessment.created_at", "DESC")
      .skip(skip)
      .take(limit);

    const [items, total] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      this.assessmentsRepository.count({
        where: {
          deleted_at: null,
          ...(status && { status }),
          ...(period && { period }),
          ...(search && { title: Like(`%${search}%`) }),
        },
      }),
    ]);

    const assessments = items.entities.map((assessment, index) => {
      const raw = items.raw[index];
      return {
        ...assessment,
        statistics: {
          total_participants: parseInt(raw.total_participants) || 0,
          self_completed_count: parseInt(raw.self_completed_count) || 0,
          leader_completed_count: parseInt(raw.leader_completed_count) || 0,
          fully_completed_count: parseInt(raw.fully_completed_count) || 0,
          completion_rate:
            raw.total_participants > 0
              ? ((parseInt(raw.fully_completed_count) || 0) /
                  parseInt(raw.total_participants)) *
                100
              : 0,
        },
      };
    });

    return {
      items: assessments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async findOne(id: number, currentUserId?: number): Promise<Assessment> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id },
      relations: [
        "creator",
        "template",
        "participants",
        "participants.user",
        "participants.user.department",
      ],
    });

    if (!assessment) {
      throw new NotFoundException(`考核 ID ${id} 不存在`);
    }

    // 过滤掉软删除的参与者
    const participants = (assessment.participants || []).filter(
      (p) => !p.deleted_at
    );

    // 计算统计信息
    const statistics = {
      total_participants: participants.length,
      self_completed_count: participants.filter((p) => p.self_completed === 1)
        .length,
      leader_completed_count: participants.filter(
        (p) => p.leader_completed === 1
      ).length,
      fully_completed_count: participants.filter(
        (p) => p.self_completed === 1 && p.leader_completed === 1
      ).length,
      average_score: 0,
      highest_score: 0,
      lowest_score: 0,
    };

    const completedScores = participants
      .filter((p) => p.final_score !== null)
      .map((p) => p.final_score);

    if (completedScores.length > 0) {
      statistics.average_score =
        completedScores.reduce((a, b) => a + b, 0) / completedScores.length;
      statistics.highest_score = Math.max(...completedScores);
      statistics.lowest_score = Math.min(...completedScores);
    }

    // 格式化日期为 YYYY-MM-DD 格式
    const formatDate = (date: Date): string => {
      if (!date) return "";
      return new Date(date).toISOString().split("T")[0];
    };

    // 检查编辑权限
    const canEdit = currentUserId
      ? assessment.creator.id === currentUserId && assessment.status === "draft"
      : false;

    // 返回增强的数据结构
    return {
      // 基本信息
      id: assessment.id,
      title: assessment.title,
      period: assessment.period,
      description: assessment.description || "",
      status: assessment.status,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at,

      // 格式化的日期字段（用于表单）
      start_date: formatDate(assessment.start_date),
      end_date: formatDate(assessment.end_date),
      deadline: formatDate(assessment.deadline),

      // 原始日期字段（用于显示）
      start_date_raw: assessment.start_date,
      end_date_raw: assessment.end_date,
      deadline_raw: assessment.deadline,

      // 模板信息
      template_id: assessment.template?.id || null,
      template: assessment.template
        ? {
            id: assessment.template.id,
            name: assessment.template.name,
            description: assessment.template.description,
          }
        : null,

      // 创建者信息
      creator: {
        id: assessment.creator.id,
        name: assessment.creator.name,
        username: assessment.creator.username,
        email: assessment.creator.email,
      },

      // 参与者信息（用于表单）
      participant_ids: participants.map((p) => p.user.id),

      // 详细的参与者信息
      participants: participants.map((p) => ({
        id: p.id,
        self_completed: p.self_completed,
        leader_completed: p.leader_completed,
        self_score: p.self_score,
        leader_score: p.leader_score,
        final_score: p.final_score,
        user: {
          id: p.user.id,
          name: p.user.name,
          username: p.user.username,
          email: p.user.email,
          department: p.user.department
            ? {
                id: p.user.department.id,
                name: p.user.department.name,
              }
            : null,
        },
      })),

      // 统计信息
      statistics,

      // 权限信息
      canEdit,
      canDelete: currentUserId
        ? assessment.creator.id === currentUserId &&
          assessment.status !== "active"
        : false,
      canPublish: currentUserId
        ? assessment.creator.id === currentUserId &&
          assessment.status === "draft"
        : false,
      canEnd: currentUserId
        ? assessment.creator.id === currentUserId &&
          assessment.status === "active"
        : false,
    } as any;
  }

  async create(
    createAssessmentDto: CreateAssessmentDto,
    createdBy: number
  ): Promise<Assessment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 检查周期是否已存在（排除软删除的记录）
      const existingAssessment = await this.assessmentsRepository.findOne({
        where: { period: createAssessmentDto.period, deleted_at: null },
      });

      if (existingAssessment) {
        throw new BadRequestException(
          `考核周期 ${createAssessmentDto.period} 已存在`
        );
      }

      // 创建考核
      const assessment = this.assessmentsRepository.create({
        ...createAssessmentDto,
        creator: { id: createdBy } as User,
        status: "draft",
      });

      const savedAssessment = await queryRunner.manager.save(assessment);

      // 验证参与者是否存在
      const users = await this.usersRepository.findByIds(
        createAssessmentDto.participant_ids
      );
      if (users.length !== createAssessmentDto.participant_ids.length) {
        throw new BadRequestException("部分参与者用户不存在");
      }

      // 创建参与者记录
      const participants = createAssessmentDto.participant_ids.map((userId) =>
        this.participantsRepository.create({
          assessment: savedAssessment,
          user: { id: userId } as User,
        })
      );

      await queryRunner.manager.save(participants);
      await queryRunner.commitTransaction();

      return this.findOne(savedAssessment.id, createdBy);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: number,
    updateAssessmentDto: UpdateAssessmentDto
  ): Promise<Assessment> {
    const assessment = await this.findOne(id);

    // 检查状态变更的合法性
    if (
      updateAssessmentDto.status &&
      updateAssessmentDto.status !== assessment.status
    ) {
      this.validateStatusTransition(
        assessment.status,
        updateAssessmentDto.status
      );
    }

    await this.assessmentsRepository.update(id, updateAssessmentDto);
    return this.findOne(id);
  }

  async remove(id: number, currentUserId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessment = await this.assessmentsRepository.findOne({
        where: { id },
        relations: ["creator"],
      });

      if (!assessment) {
        throw new NotFoundException(`考核 ID ${id} 不存在`);
      }

      // 状态检查
      if (assessment.status === "active") {
        throw new BadRequestException("无法删除进行中的考核");
      }

      // 权限检查
      if (assessment.creator.id !== currentUserId) {
        throw new BadRequestException("只有考核创建者可以删除考核");
      }

      // 检查关联数据
      const relatedData = await this.checkRelatedDataForDeletion(id);

      if (relatedData.hasCompletedEvaluations) {
        throw new BadRequestException("该考核包含已完成的评估记录，无法删除");
      }

      // 处理关联数据
      await this.handleRelatedDataDeletion(id, queryRunner);

      // 软删除考核
      await queryRunner.manager.softDelete(Assessment, id);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async editAssessment(
    id: number,
    editAssessmentDto: EditAssessmentDto,
    currentUserId: number
  ): Promise<Assessment> {
    const assessment = await this.findOne(id, currentUserId);

    // 检查状态：只能编辑草稿状态的考核
    if (assessment.status !== "draft") {
      throw new BadRequestException("只能编辑草稿状态的考核");
    }

    // 检查权限：只有创建者可以编辑
    if (assessment.creator.id !== currentUserId) {
      throw new BadRequestException("只有考核创建者可以编辑考核");
    }

    // 如果修改了周期，检查唯一性
    if (
      editAssessmentDto.period &&
      editAssessmentDto.period !== assessment.period
    ) {
      const existingAssessment = await this.assessmentsRepository.findOne({
        where: { period: editAssessmentDto.period, deleted_at: null },
      });

      if (existingAssessment) {
        throw new BadRequestException(
          `考核周期 ${editAssessmentDto.period} 已存在`
        );
      }
    }

    // 处理编辑数据，将 template_id 转换为 template 关系
    const editData: any = { ...editAssessmentDto };

    // 如果修改了模板，需要转换 template_id 为 template 关系
    if (editData.template_id !== undefined) {
      const templateId = editData.template_id;
      delete editData.template_id; // 删除 template_id 字段

      if (templateId) {
        editData.template = { id: templateId };
      } else {
        editData.template = null;
      }
    }

    // 如果修改了参与者，需要重新处理参与者关系
    if (editData.participant_ids) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 从editData中移除participant_ids，避免TypeORM错误
        const { participant_ids, ...updateData } = editData;

        // 更新考核基本信息
        await queryRunner.manager.update(Assessment, id, updateData);

        // 验证新参与者是否存在
        const users = await this.usersRepository.findByIds(participant_ids);
        if (users.length !== participant_ids.length) {
          throw new BadRequestException("部分参与者用户不存在");
        }

        // 获取现有参与者（包括软删除的）
        const existingParticipants = await queryRunner.manager.find(
          AssessmentParticipant,
          {
            where: { assessment: { id } },
            relations: ["user"],
            withDeleted: true, // 包括软删除的记录
          }
        );

        // 计算需要添加和删除的参与者
        const existingUserIds = existingParticipants
          .filter((p) => !p.deleted_at)
          .map((p) => p.user.id);

        const toAdd = participant_ids.filter(
          (userId) => !existingUserIds.includes(userId)
        );
        const toRemove = existingUserIds.filter(
          (userId) => !participant_ids.includes(userId)
        );
        const toRestore = participant_ids.filter((userId) => {
          const existing = existingParticipants.find(
            (p) => p.user.id === userId && p.deleted_at
          );
          return !!existing;
        });

        // 软删除不再参与的用户
        if (toRemove.length > 0) {
          await queryRunner.manager.softDelete(AssessmentParticipant, {
            assessment: { id },
            user: { id: toRemove.length === 1 ? toRemove[0] : In(toRemove) },
          });
        }

        // 恢复之前软删除的参与者
        if (toRestore.length > 0) {
          for (const userId of toRestore) {
            await queryRunner.manager.restore(AssessmentParticipant, {
              assessment: { id },
              user: { id: userId },
            });
          }
        }

        // 创建新的参与者记录
        if (toAdd.length > 0) {
          const participants = toAdd.map((userId) =>
            this.participantsRepository.create({
              assessment: { id } as Assessment,
              user: { id: userId } as User,
            })
          );

          await queryRunner.manager.save(participants);
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // 只更新基本信息，不涉及参与者
      // 从editData中移除不属于实体的字段
      const { participant_ids, ...updateData } = editData;
      await this.assessmentsRepository.update(id, updateData);
    }

    return this.findOne(id, currentUserId);
  }

  async validatePublishAssessment(
    id: number,
    currentUserId: number
  ): Promise<{
    canPublish: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const assessment = await this.findOne(id, currentUserId);

    const result = {
      canPublish: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // 检查状态
    if (assessment.status !== "draft") {
      result.errors.push("只能发布草稿状态的考核");
    }

    // 检查权限
    if (assessment.creator.id !== currentUserId) {
      result.errors.push("只有考核创建者可以发布考核");
    }

    try {
      await this.validateAssessmentForPublish(assessment);
    } catch (error) {
      if (error instanceof BadRequestException) {
        result.errors.push(error.message);
      }
    }

    // 添加一些警告信息
    const now = new Date();

    // 需要重新获取原始的assessment数据来比较日期
    const originalAssessment = await this.assessmentsRepository.findOne({
      where: { id },
      relations: ["creator", "template"],
    });

    if (originalAssessment && originalAssessment.start_date <= now) {
      result.warnings.push("考核开始时间已过或即将开始");
    }

    result.canPublish = result.errors.length === 0;
    return result;
  }

  async publishAssessment(
    id: number,
    currentUserId: number
  ): Promise<Assessment> {
    const assessment = await this.findOne(id, currentUserId);

    // 检查状态：只能发布草稿状态的考核
    if (assessment.status !== "draft") {
      throw new BadRequestException("只能发布草稿状态的考核");
    }

    // 检查权限：只有创建者可以发布
    if (assessment.creator.id !== currentUserId) {
      throw new BadRequestException("只有考核创建者可以发布考核");
    }

    // 发布前验证考核配置的完整性
    await this.validateAssessmentForPublish(assessment);

    // 获取完整的模板信息（包括配置）
    const fullAssessment = await this.assessmentsRepository.findOne({
      where: { id },
      relations: ["template"],
    });

    if (!fullAssessment || !fullAssessment.template) {
      throw new BadRequestException("考核模板信息不完整，无法发布");
    }

    // 创建模板配置快照并更新状态为active
    await this.assessmentsRepository.update(id, {
      status: "active",
      template_config: fullAssessment.template.config,
    });

    return this.findOne(id, currentUserId);
  }

  async endAssessment(id: number): Promise<Assessment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessment = await this.findOne(id);

      if (assessment.status !== "active") {
        throw new BadRequestException("只能结束进行中的考核");
      }

      // 检查评估完成度
      await this.checkEvaluationCompleteness(id);

      // 获取考核的完整信息，包括模板配置快照
      const fullAssessment = await this.assessmentsRepository.findOne({
        where: { id },
        relations: ["template"],
      });

      // 获取所有参与者（包含用户信息）
      const participants = await this.participantsRepository.find({
        where: { assessment: { id }, deleted_at: null },
        relations: ["user"],
      });

      // 使用模板配置快照进行得分计算
      const templateConfig =
        fullAssessment.template_config || fullAssessment.template?.config;
      const scoreResults =
        await this.scoreCalculationService.calculateParticipantScores(
          id,
          participants,
          templateConfig
        );

      // 更新参与者的得分信息
      for (const scoreResult of scoreResults) {
        const participant = participants.find(
          (p) => p.user.id === scoreResult.userId
        );
        if (participant) {
          participant.self_score = scoreResult.selfScore;
          participant.leader_score = scoreResult.leaderScore;
          participant.final_score = scoreResult.finalScore;
          participant.self_completed = 1;
          participant.leader_completed = 1;
          await queryRunner.manager.save(participant);
        }
      }

      // 同步更新OKR状态和评分
      await this.syncOkrStatusAndRatings(id, scoreResults, queryRunner);

      // 更新考核状态
      await queryRunner.manager.update(Assessment, id, { status: "completed" });

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 检查评估完成度
   */
  private async checkEvaluationCompleteness(
    assessmentId: number
  ): Promise<void> {
    const participants = await this.participantsRepository.find({
      where: { assessment: { id: assessmentId }, deleted_at: null },
      relations: ["user"],
    });

    const incompleteParticipants: string[] = [];

    for (const participant of participants) {
      const evaluations = await this.evaluationsRepository.find({
        where: {
          assessment: { id: assessmentId },
          evaluatee: { id: participant.user.id },
          status: "submitted",
        },
      });

      const hasSelfEvaluation = evaluations.some((e) => e.type === "self");
      const hasLeaderEvaluation = evaluations.some((e) => e.type === "leader");

      if (!hasSelfEvaluation || !hasLeaderEvaluation) {
        const missing = [];
        if (!hasSelfEvaluation) missing.push("自评");
        if (!hasLeaderEvaluation) missing.push("领导评分");
        incompleteParticipants.push(
          `${participant.user.name}(${missing.join("、")})`
        );
      }
    }

    if (incompleteParticipants.length > 0) {
      throw new BadRequestException(
        `以下参与者尚未完成评估：${incompleteParticipants.join(
          "、"
        )}。请确保所有参与者完成评估后再结束考核。`
      );
    }
  }

  /**
   * 同步更新OKR状态和评分
   */
  private async syncOkrStatusAndRatings(
    assessmentId: number,
    scoreResults: any[],
    queryRunner: any
  ): Promise<void> {
    const okrs = await this.okrsRepository.find({
      where: { assessment: { id: assessmentId } },
      relations: ["user"],
    });

    for (const okr of okrs) {
      const userScoreResult = scoreResults.find(
        (sr) => sr.userId === okr.user.id
      );

      if (userScoreResult) {
        // 获取该用户的评估记录来提取OKR评分
        const evaluations = await this.evaluationsRepository.find({
          where: {
            assessment: { id: assessmentId },
            evaluatee: { id: okr.user.id },
            status: "submitted",
          },
        });

        const selfEvaluation = evaluations.find((e) => e.type === "self");
        const leaderEvaluation = evaluations.find((e) => e.type === "leader");

        // 更新OKR状态和评分
        const updateData: any = {
          status: "completed",
        };

        // 这里可以根据评估结果提取具体的OKR评分
        // 假设评估记录中包含OKR相关的评分信息
        if (selfEvaluation) {
          updateData.self_rating = this.extractOkrRating(
            selfEvaluation,
            okr.id
          );
        }
        if (leaderEvaluation) {
          updateData.leader_rating = this.extractOkrRating(
            leaderEvaluation,
            okr.id
          );
        }

        await queryRunner.manager.update(Okr, okr.id, updateData);
      }
    }
  }

  /**
   * 从评估记录中提取OKR评分
   * 注意：这里需要根据实际的数据结构进行调整
   */
  private extractOkrRating(evaluation: Evaluation, okrId: number): number {
    try {
      // 假设评估记录的feedback字段包含OKR相关的评分
      const feedbackData = JSON.parse(evaluation.feedback || "{}");
      const okrRating = feedbackData.okr_ratings?.[okrId];

      if (okrRating && okrRating >= 1 && okrRating <= 5) {
        return okrRating;
      }

      // 如果没有具体的OKR评分，可以基于总分推算
      const score = evaluation.score;
      if (score >= 90) return 5;
      if (score >= 80) return 4;
      if (score >= 70) return 3;
      if (score >= 60) return 2;
      return 1;
    } catch {
      // 默认评分
      return 3;
    }
  }

  /**
   * 检查删除考核时的关联数据
   */
  private async checkRelatedDataForDeletion(assessmentId: number): Promise<{
    evaluationsCount: number;
    okrsCount: number;
    hasCompletedEvaluations: boolean;
  }> {
    const [evaluationsCount, okrsCount, completedEvaluations] =
      await Promise.all([
        this.evaluationsRepository.count({
          where: { assessment: { id: assessmentId } },
        }),
        this.okrsRepository.count({
          where: { assessment: { id: assessmentId } },
        }),
        this.evaluationsRepository.count({
          where: {
            assessment: { id: assessmentId },
            status: "submitted",
          },
        }),
      ]);

    return {
      evaluationsCount,
      okrsCount,
      hasCompletedEvaluations: completedEvaluations > 0,
    };
  }

  /**
   * 处理删除考核时的关联数据
   */
  private async handleRelatedDataDeletion(
    assessmentId: number,
    queryRunner: any
  ): Promise<void> {
    // 软删除或清理关联数据

    // 1. 删除评估记录（只删除草稿状态的评估）
    await queryRunner.manager.delete(Evaluation, {
      assessment: { id: assessmentId },
      status: "draft",
    });

    // 2. 软删除参与者记录
    await queryRunner.manager.softDelete(AssessmentParticipant, {
      assessment: { id: assessmentId },
    });

    // 3. 更新相关OKR状态（将其设为取消状态而不是删除）
    await queryRunner.manager.update(
      Okr,
      { assessment: { id: assessmentId } },
      { status: "cancelled" }
    );
  }

  /**
   * 验证考核发布前的配置完整性
   */
  private async validateAssessmentForPublish(
    assessment: Assessment
  ): Promise<void> {
    const errors: string[] = [];

    // 检查基本信息
    if (!assessment.title || assessment.title.trim().length === 0) {
      errors.push("考核标题不能为空");
    }

    if (
      !assessment.start_date ||
      !assessment.end_date ||
      !assessment.deadline
    ) {
      errors.push("考核时间配置不完整");
    }

    // 检查时间逻辑
    const startDate = new Date(assessment.start_date);
    const endDate = new Date(assessment.end_date);
    const deadline = new Date(assessment.deadline);

    if (startDate >= endDate) {
      errors.push("开始时间必须早于结束时间");
    }

    if (endDate > deadline) {
      errors.push("结束时间不能晚于截止时间");
    }

    // 检查模板配置
    if (!assessment.template) {
      errors.push("必须选择评估模板");
    }

    // 检查参与者
    const participants = await this.participantsRepository.find({
      where: { assessment: { id: assessment.id }, deleted_at: null },
      relations: ["user"],
    });

    if (participants.length === 0) {
      errors.push("至少需要添加一个考核参与者");
    }

    // 检查参与者的有效性
    const inactiveParticipants = participants.filter(
      (p) => p.user.status !== 1
    );
    if (inactiveParticipants.length > 0) {
      const inactiveNames = inactiveParticipants
        .map((p) => p.user.name)
        .join("、");
      errors.push(`以下参与者状态异常，无法参与考核：${inactiveNames}`);
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `考核配置不完整，无法发布：\n${errors.join("\n")}`
      );
    }
  }

  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions = {
      draft: ["active"],
      active: ["completed", "ended"],
      completed: ["ended"],
      ended: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `无法从状态 "${currentStatus}" 转换到 "${newStatus}"`
      );
    }
  }

  /**
   * 手动结束考核
   * 管理员可以主动结束正在进行的考核
   */
  async manualEndAssessment(id: number, userId: number): Promise<Assessment> {
    const assessment = await this.findOne(id);
    
    if (!assessment) {
      throw new NotFoundException("考核不存在");
    }

    // 检查权限：只有管理员和考核创建者可以结束考核
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    const isAdmin = user?.roles.some(role => role.name === 'admin');
    const isCreator = assessment.creator?.id === userId;

    if (!isAdmin && !isCreator) {
      throw new BadRequestException("没有权限结束此考核");
    }

    // 验证状态转换
    this.validateStatusTransition(assessment.status, "completed");

    // 更新考核状态为已完成
    await this.assessmentsRepository.update(id, {
      status: "completed",
      updated_at: new Date(),
    });

    // 获取参与者统计信息
    const participants = await this.participantsRepository.find({
      where: {
        assessment: { id },
        deleted_at: null,
      },
    });

    const completedCount = participants.filter(p => 
      p.self_completed === 1 && p.leader_completed === 1
    ).length;

    console.log(`📋 考核手动结束 - 考核ID: ${id}, 参与者总数: ${participants.length}, 已完成评分: ${completedCount}`);

    return this.findOne(id);
  }

  /**
   * 检查考核是否可以进行评分操作
   */
  async checkAssessmentStatus(assessmentId: number): Promise<boolean> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
    });

    return assessment?.status === "active";
  }
}
