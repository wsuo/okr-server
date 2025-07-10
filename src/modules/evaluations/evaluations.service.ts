import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { Evaluation } from "../../entities/evaluation.entity";
import { Assessment } from "../../entities/assessment.entity";
import { AssessmentParticipant } from "../../entities/assessment-participant.entity";
import { User } from "../../entities/user.entity";
import { CreateSelfEvaluationDto } from "./dto/create-self-evaluation.dto";
import { CreateLeaderEvaluationDto } from "./dto/create-leader-evaluation.dto";
import { UpdateEvaluationDto } from "./dto/update-evaluation.dto";
import { QueryEvaluationsDto } from "./dto/query-evaluations.dto";
import {
  CreateDetailedSelfEvaluationDto,
  CreateDetailedLeaderEvaluationDto,
  SaveEvaluationDraftDto,
  UpdateEvaluationDraftDto,
  DetailedCategoryScoreDto,
} from "./dto/detailed-score.dto";
import {
  EvaluationTemplateResponseDto,
  UserEvaluationTemplateDto,
} from "./dto/evaluation-template.dto";
import {
  EvaluationTaskDto,
  EvaluationProgressDto,
  SubordinateEvaluationTaskDto,
} from "./dto/evaluation-task.dto";

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource
  ) {}

  async findAll(query: QueryEvaluationsDto) {
    const {
      page = 1,
      limit = 10,
      assessment_id,
      evaluatee_id,
      evaluator_id,
      type,
      status,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.evaluationsRepository
      .createQueryBuilder("evaluation")
      .leftJoinAndSelect("evaluation.assessment", "assessment")
      .leftJoinAndSelect("evaluation.evaluator", "evaluator")
      .leftJoinAndSelect("evaluation.evaluatee", "evaluatee")
      .leftJoinAndSelect("evaluatee.department", "department");

    if (assessment_id) {
      queryBuilder.andWhere("evaluation.assessment_id = :assessment_id", {
        assessment_id,
      });
    }

    if (evaluatee_id) {
      queryBuilder.andWhere("evaluation.evaluatee_id = :evaluatee_id", {
        evaluatee_id,
      });
    }

    if (evaluator_id) {
      queryBuilder.andWhere("evaluation.evaluator_id = :evaluator_id", {
        evaluator_id,
      });
    }

    if (type) {
      queryBuilder.andWhere("evaluation.type = :type", { type });
    }

    if (status) {
      queryBuilder.andWhere("evaluation.status = :status", { status });
    }

    queryBuilder
      .orderBy("evaluation.created_at", "DESC")
      .skip(skip)
      .take(limit);

    const [items, total] = await Promise.all([
      queryBuilder.getMany(),
      this.evaluationsRepository.count({
        where: {
          ...(assessment_id && { assessment: { id: assessment_id } }),
          ...(evaluatee_id && { evaluatee: { id: evaluatee_id } }),
          ...(evaluator_id && { evaluator: { id: evaluator_id } }),
          ...(type && { type }),
          ...(status && { status }),
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async findOne(id: number): Promise<Evaluation> {
    const evaluation = await this.evaluationsRepository.findOne({
      where: { id },
      relations: [
        "assessment",
        "evaluator",
        "evaluatee",
        "evaluatee.department",
      ],
    });

    if (!evaluation) {
      throw new NotFoundException(`评估记录 ID ${id} 不存在`);
    }

    return evaluation;
  }

  async createSelfEvaluation(
    createSelfEvaluationDto: CreateSelfEvaluationDto,
    evaluatorId: number
  ): Promise<Evaluation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核是否存在且为进行中状态
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createSelfEvaluationDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException("考核不存在");
      }
      if (assessment.status !== "active") {
        throw new BadRequestException("只能为进行中的考核提交评估");
      }

      // 验证用户是否参与了该考核
      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: createSelfEvaluationDto.assessment_id },
          user: { id: evaluatorId },
        },
      });
      if (!participant) {
        throw new BadRequestException("您未参与此考核");
      }

      // 检查是否已提交过自评
      const existingEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: createSelfEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: evaluatorId },
          type: "self",
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === "submitted") {
          throw new BadRequestException("已提交过自评，无法重复提交");
        }
        // 更新现有的草稿
        await this.evaluationsRepository.update(existingEvaluation.id, {
          ...createSelfEvaluationDto,
          status: "submitted",
          submitted_at: new Date(),
        });

        // 更新参与者状态
        await this.participantsRepository.update(participant.id, {
          self_completed: 1,
          self_score: createSelfEvaluationDto.score,
          self_submitted_at: new Date(),
        });

        await queryRunner.commitTransaction();
        return this.findOne(existingEvaluation.id);
      }

      // 创建新的自评记录
      const evaluation = this.evaluationsRepository.create({
        assessment: { id: createSelfEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: evaluatorId },
        type: "self",
        score: createSelfEvaluationDto.score,
        feedback: createSelfEvaluationDto.feedback,
        strengths: createSelfEvaluationDto.strengths,
        improvements: createSelfEvaluationDto.improvements,
        status: "submitted",
        submitted_at: new Date(),
      });

      const savedEvaluation = await queryRunner.manager.save(evaluation);

      // 更新参与者状态
      await this.participantsRepository.update(participant.id, {
        self_completed: 1,
        self_score: createSelfEvaluationDto.score,
        self_submitted_at: new Date(),
      });

      await queryRunner.commitTransaction();
      return this.findOne(savedEvaluation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createLeaderEvaluation(
    createLeaderEvaluationDto: CreateLeaderEvaluationDto,
    evaluatorId: number
  ): Promise<Evaluation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核是否存在且为进行中状态
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createLeaderEvaluationDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException("考核不存在");
      }
      if (assessment.status !== "active") {
        throw new BadRequestException("只能为进行中的考核提交评估");
      }

      // 验证被评估人是否参与了该考核
      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: createLeaderEvaluationDto.assessment_id },
          user: { id: createLeaderEvaluationDto.evaluatee_id },
        },
      });
      if (!participant) {
        throw new BadRequestException("被评估人未参与此考核");
      }

      // 验证评估人是否为被评估人的直属领导
      const evaluatee = await this.usersRepository.findOne({
        where: { id: createLeaderEvaluationDto.evaluatee_id },
        relations: ["leader"],
      });
      if (!evaluatee || evaluatee.leader?.id !== evaluatorId) {
        throw new BadRequestException("您不是该员工的直属领导");
      }

      // 检查是否已提交过对该员工的评分
      const existingEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: createLeaderEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: createLeaderEvaluationDto.evaluatee_id },
          type: "leader",
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === "submitted") {
          throw new BadRequestException("已提交过对该员工的评分，无法重复提交");
        }
        // 更新现有的草稿
        await this.evaluationsRepository.update(existingEvaluation.id, {
          ...createLeaderEvaluationDto,
          status: "submitted",
          submitted_at: new Date(),
        });

        // 更新参与者状态
        await this.participantsRepository.update(participant.id, {
          leader_completed: 1,
          leader_score: createLeaderEvaluationDto.score,
          leader_submitted_at: new Date(),
        });

        await queryRunner.commitTransaction();
        return this.findOne(existingEvaluation.id);
      }

      // 创建新的领导评分记录
      const evaluation = this.evaluationsRepository.create({
        assessment: { id: createLeaderEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: createLeaderEvaluationDto.evaluatee_id },
        type: "leader",
        score: createLeaderEvaluationDto.score,
        feedback: createLeaderEvaluationDto.feedback,
        strengths: createLeaderEvaluationDto.strengths,
        improvements: createLeaderEvaluationDto.improvements,
        status: "submitted",
        submitted_at: new Date(),
      });

      const savedEvaluation = await queryRunner.manager.save(evaluation);

      // 更新参与者状态
      await this.participantsRepository.update(participant.id, {
        leader_completed: 1,
        leader_score: createLeaderEvaluationDto.score,
        leader_submitted_at: new Date(),
      });

      await queryRunner.commitTransaction();
      return this.findOne(savedEvaluation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: number,
    updateEvaluationDto: UpdateEvaluationDto
  ): Promise<Evaluation> {
    const evaluation = await this.findOne(id);

    if (evaluation.status === "submitted") {
      throw new BadRequestException("已提交的评估无法修改");
    }

    await this.evaluationsRepository.update(id, updateEvaluationDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const evaluation = await this.findOne(id);

    if (evaluation.status === "submitted") {
      throw new BadRequestException("已提交的评估无法删除");
    }

    await this.evaluationsRepository.remove(evaluation);
  }

  async getMyEvaluations(userId: number, assessmentId?: number) {
    const where: any = {
      evaluatee: { id: userId },
    };
    if (assessmentId) {
      where.assessment = { id: assessmentId };
    }

    return this.evaluationsRepository.find({
      where,
      relations: ["assessment", "evaluator"],
      order: { created_at: "DESC" },
    });
  }

  async getEvaluationsToGive(userId: number, assessmentId?: number) {
    // 获取需要我评分的下属
    const subordinates = await this.usersRepository.find({
      where: { leader: { id: userId } },
    });

    if (subordinates.length === 0) {
      return [];
    }

    const where: any = {
      evaluatee: { id: subordinates.map((s) => s.id) },
      evaluator: { id: userId },
      type: "leader",
    };
    if (assessmentId) {
      where.assessment = { id: assessmentId };
    }

    return this.evaluationsRepository.find({
      where,
      relations: ["assessment", "evaluatee", "evaluatee.department"],
      order: { created_at: "DESC" },
    });
  }

  // 新增方法：获取评分模板
  async getEvaluationTemplate(
    assessmentId: number
  ): Promise<EvaluationTemplateResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ["template"],
    });

    if (!assessment) {
      throw new NotFoundException(`考核 ID ${assessmentId} 不存在`);
    }

    if (!assessment.template) {
      throw new BadRequestException("该考核没有关联的评分模板");
    }

    // 使用模板配置快照优先
    const templateConfig =
      assessment.template_config || assessment.template.config;

    if (!templateConfig) {
      throw new BadRequestException("评分模板配置不完整");
    }

    return {
      assessment_id: assessmentId,
      assessment_title: assessment.title,
      version: templateConfig.version || "1.0",
      scoring_method: templateConfig.scoring_method || "weighted",
      total_score: templateConfig.total_score || 100,
      scoring_rules: templateConfig.scoring_rules,
      categories: templateConfig.categories,
      usage_instructions: templateConfig.usage_instructions,
    };
  }

  async getUserEvaluationTemplate(
    assessmentId: number,
    userId: number,
    currentUserId: number
  ): Promise<UserEvaluationTemplateDto> {
    // 基础模板信息
    const baseTemplate = await this.getEvaluationTemplate(assessmentId);

    // 检查用户权限
    const hasPermission = await this.checkUserEvaluationPermission(
      assessmentId,
      userId,
      currentUserId
    );
    if (!hasPermission.canEvaluate) {
      throw new BadRequestException(
        hasPermission.reason || "您没有权限对该用户进行评分"
      );
    }

    // 确定评估类型
    const evaluationType = userId === currentUserId ? "self" : "leader";

    // 过滤模板类别（如果是自评，过滤掉仅限领导的项目）
    let filteredCategories = baseTemplate.categories;
    if (evaluationType === "self") {
      filteredCategories = baseTemplate.categories.filter(
        (cat) => !cat.leader_only
      );
    }

    // 检查是否已有评估记录
    const existingEvaluation = await this.evaluationsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        evaluatee: { id: userId },
        evaluator: { id: currentUserId },
        type: evaluationType,
      },
    });

    // 获取被评估人信息（如果不是自评）
    let evaluateeName = "";
    if (evaluationType === "leader") {
      const evaluatee = await this.usersRepository.findOne({
        where: { id: userId },
        select: ["id", "name"],
      });
      evaluateeName = evaluatee?.name || "";
    }

    return {
      ...baseTemplate,
      categories: filteredCategories,
      current_user_id: currentUserId,
      evaluation_type: evaluationType,
      evaluatee_id: evaluationType === "leader" ? userId : undefined,
      evaluatee_name: evaluationType === "leader" ? evaluateeName : undefined,
      existing_evaluation_id: existingEvaluation?.id,
      current_status: existingEvaluation
        ? existingEvaluation.status === "submitted"
          ? "submitted"
          : "draft"
        : "not_started",
    };
  }

  // 详细评分方法
  async createDetailedSelfEvaluation(
    createDetailedSelfEvaluationDto: CreateDetailedSelfEvaluationDto,
    evaluatorId: number
  ): Promise<Evaluation> {
    // 验证评分数据
    await this.validateDetailedScores(
      createDetailedSelfEvaluationDto.assessment_id,
      createDetailedSelfEvaluationDto.detailed_scores,
      "self"
    );

    // 计算总分
    const totalScore = await this.calculateTotalScore(
      createDetailedSelfEvaluationDto.assessment_id,
      createDetailedSelfEvaluationDto.detailed_scores
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核状态和权限（复用原有逻辑）
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createDetailedSelfEvaluationDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException("考核不存在");
      }
      if (assessment.status !== "active") {
        throw new BadRequestException("只能为进行中的考核提交评估");
      }

      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: createDetailedSelfEvaluationDto.assessment_id },
          user: { id: evaluatorId },
        },
      });
      if (!participant) {
        throw new BadRequestException("您未参与此考核");
      }

      // 检查是否已提交过自评
      const existingEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: createDetailedSelfEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: evaluatorId },
          type: "self",
        },
      });

      if (existingEvaluation && existingEvaluation.status === "submitted") {
        throw new BadRequestException("已提交过自评，无法重复提交");
      }

      const evaluationData = {
        assessment: { id: createDetailedSelfEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: evaluatorId },
        type: "self",
        score: totalScore,
        feedback: createDetailedSelfEvaluationDto.overall_feedback,
        strengths: createDetailedSelfEvaluationDto.strengths,
        improvements: createDetailedSelfEvaluationDto.improvements,
        detailed_scores: createDetailedSelfEvaluationDto.detailed_scores,
        status: "submitted",
        submitted_at: new Date(),
      };

      let savedEvaluation;
      if (existingEvaluation) {
        // 更新现有记录
        await queryRunner.manager.update(
          Evaluation,
          existingEvaluation.id,
          evaluationData
        );
        savedEvaluation = { ...existingEvaluation, id: existingEvaluation.id };
      } else {
        // 创建新记录
        const evaluation = this.evaluationsRepository.create(evaluationData);
        savedEvaluation = await queryRunner.manager.save(evaluation);
      }

      // 更新参与者状态
      await queryRunner.manager.update(AssessmentParticipant, participant.id, {
        self_completed: 1,
        self_score: totalScore,
        self_submitted_at: new Date(),
      });

      await queryRunner.commitTransaction();
      return this.findOne(savedEvaluation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createDetailedLeaderEvaluation(
    createDetailedLeaderEvaluationDto: CreateDetailedLeaderEvaluationDto,
    evaluatorId: number
  ): Promise<Evaluation> {
    // 验证评分数据
    await this.validateDetailedScores(
      createDetailedLeaderEvaluationDto.assessment_id,
      createDetailedLeaderEvaluationDto.detailed_scores,
      "leader"
    );

    // 计算总分
    const totalScore = await this.calculateTotalScore(
      createDetailedLeaderEvaluationDto.assessment_id,
      createDetailedLeaderEvaluationDto.detailed_scores
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核状态和权限（复用原有逻辑）
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createDetailedLeaderEvaluationDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException("考核不存在");
      }
      if (assessment.status !== "active") {
        throw new BadRequestException("只能为进行中的考核提交评估");
      }

      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: createDetailedLeaderEvaluationDto.assessment_id },
          user: { id: createDetailedLeaderEvaluationDto.evaluatee_id },
        },
      });
      if (!participant) {
        throw new BadRequestException("被评估人未参与此考核");
      }

      // 验证评估人是否为被评估人的直属领导
      const evaluatee = await this.usersRepository.findOne({
        where: { id: createDetailedLeaderEvaluationDto.evaluatee_id },
        relations: ["leader"],
      });
      if (!evaluatee || evaluatee.leader?.id !== evaluatorId) {
        throw new BadRequestException("您不是该员工的直属领导");
      }

      // 检查是否已提交过对该员工的评分
      const existingEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: createDetailedLeaderEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: createDetailedLeaderEvaluationDto.evaluatee_id },
          type: "leader",
        },
      });

      if (existingEvaluation && existingEvaluation.status === "submitted") {
        throw new BadRequestException("已提交过对该员工的评分，无法重复提交");
      }

      const evaluationData = {
        assessment: { id: createDetailedLeaderEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: createDetailedLeaderEvaluationDto.evaluatee_id },
        type: "leader",
        score: totalScore,
        feedback: createDetailedLeaderEvaluationDto.overall_feedback,
        strengths: createDetailedLeaderEvaluationDto.strengths,
        improvements: createDetailedLeaderEvaluationDto.improvements,
        detailed_scores: createDetailedLeaderEvaluationDto.detailed_scores,
        status: "submitted",
        submitted_at: new Date(),
      };

      let savedEvaluation;
      if (existingEvaluation) {
        // 更新现有记录
        await queryRunner.manager.update(
          Evaluation,
          existingEvaluation.id,
          evaluationData
        );
        savedEvaluation = { ...existingEvaluation, id: existingEvaluation.id };
      } else {
        // 创建新记录
        const evaluation = this.evaluationsRepository.create(evaluationData);
        savedEvaluation = await queryRunner.manager.save(evaluation);
      }

      // 更新参与者状态
      await queryRunner.manager.update(AssessmentParticipant, participant.id, {
        leader_completed: 1,
        leader_score: totalScore,
        leader_submitted_at: new Date(),
      });

      await queryRunner.commitTransaction();
      return this.findOne(savedEvaluation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 私有辅助方法
  private async checkUserEvaluationPermission(
    assessmentId: number,
    userId: number,
    currentUserId: number
  ): Promise<{ canEvaluate: boolean; reason?: string }> {
    // 自评权限检查
    if (userId === currentUserId) {
      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: assessmentId },
          user: { id: userId },
          deleted_at: null,
        },
      });

      if (!participant) {
        return { canEvaluate: false, reason: "您未参与此考核" };
      }

      return { canEvaluate: true };
    }

    // 领导评分权限检查
    const evaluatee = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["leader"],
    });

    if (!evaluatee || evaluatee.leader?.id !== currentUserId) {
      return { canEvaluate: false, reason: "您不是该员工的直属领导" };
    }

    // 检查被评估人是否参与了考核
    const participant = await this.participantsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        user: { id: userId },
        deleted_at: null,
      },
    });

    if (!participant) {
      return { canEvaluate: false, reason: "该员工未参与此考核" };
    }

    return { canEvaluate: true };
  }

  private async validateDetailedScores(
    assessmentId: number,
    detailedScores: DetailedCategoryScoreDto[],
    evaluationType: "self" | "leader"
  ): Promise<void> {
    const template = await this.getEvaluationTemplate(assessmentId);

    // 验证类别完整性
    const requiredCategories = template.categories
      .filter((cat) => evaluationType === "leader" || !cat.leader_only)
      .map((cat) => cat.id);

    const providedCategories = detailedScores.map((score) => score.categoryId);

    const missingCategories = requiredCategories.filter(
      (catId) => !providedCategories.includes(catId)
    );
    if (missingCategories.length > 0) {
      throw new BadRequestException(
        `缺少以下类别的评分：${missingCategories.join(", ")}`
      );
    }

    // 验证每个类别的项目完整性和评分范围
    for (const categoryScore of detailedScores) {
      const templateCategory = template.categories.find(
        (cat) => cat.id === categoryScore.categoryId
      );
      if (!templateCategory) {
        throw new BadRequestException(
          `无效的评分类别：${categoryScore.categoryId}`
        );
      }

      const requiredItems = templateCategory.items.map((item) => item.id);
      const providedItems = categoryScore.items.map((item) => item.itemId);

      const missingItems = requiredItems.filter(
        (itemId) => !providedItems.includes(itemId)
      );
      if (missingItems.length > 0) {
        throw new BadRequestException(
          `类别 ${
            templateCategory.name
          } 缺少以下项目的评分：${missingItems.join(", ")}`
        );
      }

      // 验证评分范围
      for (const itemScore of categoryScore.items) {
        if (itemScore.score < 0 || itemScore.score > 100) {
          throw new BadRequestException(`评分必须在0-100之间`);
        }
      }

      if (
        categoryScore.categoryScore < 0 ||
        categoryScore.categoryScore > 100
      ) {
        throw new BadRequestException(`类别总分必须在0-100之间`);
      }
    }
  }

  private async calculateTotalScore(
    assessmentId: number,
    detailedScores: DetailedCategoryScoreDto[]
  ): Promise<number> {
    const template = await this.getEvaluationTemplate(assessmentId);

    let totalScore = 0;

    for (const categoryScore of detailedScores) {
      const templateCategory = template.categories.find(
        (cat) => cat.id === categoryScore.categoryId
      );
      if (templateCategory) {
        // 按类别权重计算贡献分数
        totalScore +=
          categoryScore.categoryScore * (templateCategory.weight / 100);
      }
    }

    return Math.round(totalScore * 100) / 100; // 保留两位小数
  }

  // 草稿保存功能
  async saveDraft(
    evaluationId: number,
    updateEvaluationDraftDto: UpdateEvaluationDraftDto,
    currentUserId: number
  ): Promise<Evaluation> {
    const evaluation = await this.evaluationsRepository.findOne({
      where: { id: evaluationId },
      relations: ["evaluator", "evaluatee", "assessment"],
    });

    if (!evaluation) {
      throw new NotFoundException(`评估记录 ID ${evaluationId} 不存在`);
    }

    if (evaluation.evaluator.id !== currentUserId) {
      throw new BadRequestException("您没有权限修改此评估");
    }

    if (evaluation.status === "submitted") {
      throw new BadRequestException("已提交的评估无法修改");
    }

    // 计算总分（如果有详细评分数据）
    let totalScore = evaluation.score;
    if (
      updateEvaluationDraftDto.detailed_scores &&
      updateEvaluationDraftDto.detailed_scores.length > 0
    ) {
      totalScore = await this.calculateTotalScore(
        evaluation.assessment.id,
        updateEvaluationDraftDto.detailed_scores
      );
    }

    const updateData = {
      score: totalScore,
      feedback:
        updateEvaluationDraftDto.self_review ||
        updateEvaluationDraftDto.overall_feedback,
      strengths: updateEvaluationDraftDto.strengths,
      improvements: updateEvaluationDraftDto.improvements,
      detailed_scores: updateEvaluationDraftDto.detailed_scores,
    };

    await this.evaluationsRepository.update(evaluationId, updateData);
    return this.findOne(evaluationId);
  }

  async createDraft(
    saveEvaluationDraftDto: SaveEvaluationDraftDto,
    currentUserId: number
  ): Promise<Evaluation> {
    // 验证权限
    const evaluateeId = saveEvaluationDraftDto.evaluatee_id || currentUserId;
    const hasPermission = await this.checkUserEvaluationPermission(
      saveEvaluationDraftDto.assessment_id,
      evaluateeId,
      currentUserId
    );

    if (!hasPermission.canEvaluate) {
      throw new BadRequestException(
        hasPermission.reason || "您没有权限创建此评估"
      );
    }

    // 检查是否已存在评估记录
    const existingEvaluation = await this.evaluationsRepository.findOne({
      where: {
        assessment: { id: saveEvaluationDraftDto.assessment_id },
        evaluator: { id: currentUserId },
        evaluatee: { id: evaluateeId },
        type: saveEvaluationDraftDto.type,
      },
    });

    if (existingEvaluation) {
      // 如果已存在，则更新
      const updateDto: UpdateEvaluationDraftDto = {
        self_review: saveEvaluationDraftDto.self_review,
        detailed_scores: saveEvaluationDraftDto.detailed_scores,
        overall_feedback: saveEvaluationDraftDto.overall_feedback,
        strengths: saveEvaluationDraftDto.strengths,
        improvements: saveEvaluationDraftDto.improvements,
      };
      return this.saveDraft(existingEvaluation.id, updateDto, currentUserId);
    }

    // 计算总分（如果有详细评分数据）
    let totalScore = 0;
    if (
      saveEvaluationDraftDto.detailed_scores &&
      saveEvaluationDraftDto.detailed_scores.length > 0
    ) {
      totalScore = await this.calculateTotalScore(
        saveEvaluationDraftDto.assessment_id,
        saveEvaluationDraftDto.detailed_scores
      );
    }

    // 创建新的草稿记录
    const evaluation = this.evaluationsRepository.create({
      assessment: { id: saveEvaluationDraftDto.assessment_id },
      evaluator: { id: currentUserId },
      evaluatee: { id: evaluateeId },
      type: saveEvaluationDraftDto.type,
      score: totalScore,
      feedback:
        saveEvaluationDraftDto.self_review ||
        saveEvaluationDraftDto.overall_feedback,
      strengths: saveEvaluationDraftDto.strengths,
      improvements: saveEvaluationDraftDto.improvements,
      detailed_scores: saveEvaluationDraftDto.detailed_scores,
      status: "draft",
    });

    const savedEvaluation = await this.evaluationsRepository.save(evaluation);
    return this.findOne(savedEvaluation.id);
  }

  // 任务和进度相关方法
  async getMyTasks(
    userId: number,
    assessmentId?: number
  ): Promise<EvaluationTaskDto[]> {
    const tasks: EvaluationTaskDto[] = [];

    try {
      // 获取自评任务
      const selfTasks = await this.getSelfEvaluationTasks(userId, assessmentId);
      tasks.push(...selfTasks);

      // 获取领导评分任务
      const leaderTasks = await this.getLeaderEvaluationTasks(
        userId,
        assessmentId
      );
      tasks.push(...leaderTasks);

      // 按截止时间排序
      return tasks.sort((a, b) => {
        const dateA = new Date(a.deadline);
        const dateB = new Date(b.deadline);

        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error("Error in getMyTasks:", error);
      throw error;
    }
  }

  async getEvaluationProgress(
    assessmentId: number,
    currentUserId: number
  ): Promise<EvaluationProgressDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: [
        "participants",
        "participants.user",
        "participants.user.department",
      ],
    });

    if (!assessment) {
      throw new NotFoundException(`考核 ID ${assessmentId} 不存在`);
    }

    const participants = assessment.participants.filter((p) => !p.deleted_at);
    const totalParticipants = participants.length;

    // 统计完成情况
    const selfCompletedCount = participants.filter(
      (p) => p.self_completed === 1
    ).length;
    const leaderCompletedCount = participants.filter(
      (p) => p.leader_completed === 1
    ).length;
    const fullyCompletedCount = participants.filter(
      (p) => p.self_completed === 1 && p.leader_completed === 1
    ).length;

    // 计算完成率
    const selfCompletionRate =
      totalParticipants > 0
        ? (selfCompletedCount / totalParticipants) * 100
        : 0;
    const leaderCompletionRate =
      totalParticipants > 0
        ? (leaderCompletedCount / totalParticipants) * 100
        : 0;
    const overallCompletionRate =
      totalParticipants > 0
        ? (fullyCompletedCount / totalParticipants) * 100
        : 0;

    // 计算剩余天数
    const now = new Date();
    const deadline = new Date(assessment.deadline);

    // 检查日期有效性
    let daysRemaining = 0;
    let isOverdue = false;

    if (isNaN(deadline.getTime())) {
      console.warn(
        `Invalid deadline for assessment ${assessmentId}: ${assessment.deadline}`
      );
      daysRemaining = 0;
      isOverdue = false;
    } else {
      const diffTime = deadline.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isOverdue = now > deadline;
    }

    // 详细参与者状态
    const participantDetails = participants.map((p) => ({
      user_id: p.user.id,
      user_name: p.user.name,
      department: p.user.department?.name || "",
      self_status:
        p.self_completed === 1
          ? ("completed" as const)
          : ("not_started" as const),
      leader_status:
        p.leader_completed === 1
          ? ("completed" as const)
          : ("not_started" as const),
      self_completed_at: p.self_submitted_at,
      leader_completed_at: p.leader_submitted_at,
    }));

    return {
      assessment_id: assessmentId,
      assessment_title: assessment.title,
      total_participants: totalParticipants,
      self_completed_count: selfCompletedCount,
      leader_completed_count: leaderCompletedCount,
      fully_completed_count: fullyCompletedCount,
      self_completion_rate: Math.round(selfCompletionRate * 100) / 100,
      leader_completion_rate: Math.round(leaderCompletionRate * 100) / 100,
      overall_completion_rate: Math.round(overallCompletionRate * 100) / 100,
      participants: participantDetails,
      deadline: assessment.deadline,
      days_remaining: daysRemaining,
      is_overdue: isOverdue,
    };
  }

  async getSubordinatesTasks(
    assessmentId: number,
    currentUserId: number
  ): Promise<SubordinateEvaluationTaskDto[]> {
    // 获取当前用户的所有下属
    const subordinates = await this.usersRepository.find({
      where: { leader: { id: currentUserId } },
      relations: ["department"],
    });

    if (subordinates.length === 0) {
      return [];
    }

    // 获取参与该考核的下属
    const participants = await this.participantsRepository.find({
      where: {
        assessment: { id: assessmentId },
        user: { id: In(subordinates.map((s) => s.id)) },
        deleted_at: null,
      },
      relations: ["user", "user.department"],
    });

    const tasks: SubordinateEvaluationTaskDto[] = [];

    for (const participant of participants) {
      // 检查领导评分记录
      const leaderEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: assessmentId },
          evaluator: { id: currentUserId },
          evaluatee: { id: participant.user.id },
          type: "leader",
        },
      });

      let status: "not_started" | "in_progress" | "completed" = "not_started";
      if (leaderEvaluation) {
        status =
          leaderEvaluation.status === "submitted" ? "completed" : "in_progress";
      }

      tasks.push({
        subordinate_id: participant.user.id,
        subordinate_name: participant.user.name,
        subordinate_department: participant.user.department?.name || "",
        status,
        self_evaluation_completed: participant.self_completed === 1,
        self_evaluation_completed_at: participant.self_submitted_at,
        leader_evaluation_id: leaderEvaluation?.id,
        leader_evaluation_completed_at: leaderEvaluation?.submitted_at,
        last_updated: leaderEvaluation?.updated_at,
      });
    }

    return tasks;
  }

  async getDetailedEvaluation(
    evaluationId: number,
    currentUserId: number
  ): Promise<any> {
    const evaluation = await this.evaluationsRepository.findOne({
      where: { id: evaluationId },
      relations: [
        "assessment",
        "evaluator",
        "evaluatee",
        "evaluatee.department",
      ],
    });

    if (!evaluation) {
      throw new NotFoundException(`评估记录 ID ${evaluationId} 不存在`);
    }

    // 权限检查：只有评估者、被评估者或管理员可以查看
    const hasPermission =
      evaluation.evaluator.id === currentUserId ||
      evaluation.evaluatee.id === currentUserId;
    // TODO: 添加管理员权限检查

    if (!hasPermission) {
      throw new BadRequestException("您没有权限查看此评估记录");
    }

    return {
      ...evaluation,
      // 如果有详细评分，增强显示信息
      detailed_scores_with_template: evaluation.detailed_scores
        ? await this.enrichDetailedScoresWithTemplate(
            evaluation.assessment.id,
            evaluation.detailed_scores
          )
        : null,
    };
  }

  async getEvaluationComparison(
    assessmentId: number,
    userId: number,
    currentUserId: number
  ): Promise<any> {
    // 权限检查
    const hasPermission = userId === currentUserId; // 只能查看自己的对比
    // TODO: 添加管理员和直属领导权限

    if (!hasPermission) {
      throw new BadRequestException("您只能查看自己的评分对比");
    }

    // 获取自评和领导评分
    const [selfEvaluation, leaderEvaluation] = await Promise.all([
      this.evaluationsRepository.findOne({
        where: {
          assessment: { id: assessmentId },
          evaluatee: { id: userId },
          type: "self",
          status: "submitted",
        },
        relations: ["evaluator"],
      }),
      this.evaluationsRepository.findOne({
        where: {
          assessment: { id: assessmentId },
          evaluatee: { id: userId },
          type: "leader",
          status: "submitted",
        },
        relations: ["evaluator"],
      }),
    ]);

    if (!selfEvaluation && !leaderEvaluation) {
      throw new NotFoundException("未找到该用户的评估记录");
    }

    // 获取模板信息用于对比分析
    const template = await this.getEvaluationTemplate(assessmentId);

    return {
      assessment_id: assessmentId,
      user_id: userId,
      self_evaluation: selfEvaluation
        ? {
            ...selfEvaluation,
            detailed_scores_with_template: selfEvaluation.detailed_scores
              ? await this.enrichDetailedScoresWithTemplate(
                  assessmentId,
                  selfEvaluation.detailed_scores
                )
              : null,
          }
        : null,
      leader_evaluation: leaderEvaluation
        ? {
            ...leaderEvaluation,
            detailed_scores_with_template: leaderEvaluation.detailed_scores
              ? await this.enrichDetailedScoresWithTemplate(
                  assessmentId,
                  leaderEvaluation.detailed_scores
                )
              : null,
          }
        : null,
      comparison_analysis: this.generateComparisonAnalysis(
        selfEvaluation,
        leaderEvaluation,
        template
      ),
    };
  }

  // 私有辅助方法
  private async getSelfEvaluationTasks(
    userId: number,
    assessmentId?: number
  ): Promise<EvaluationTaskDto[]> {
    const whereCondition: any = {
      user: { id: userId },
      deleted_at: null,
      assessment: { status: "active" },
    };

    if (assessmentId) {
      whereCondition.assessment = {
        ...whereCondition.assessment,
        id: assessmentId,
      };
    }

    const participants = await this.participantsRepository.find({
      where: whereCondition,
      relations: ["assessment", "user", "user.department"],
    });

    const tasks: EvaluationTaskDto[] = [];

    for (const participant of participants) {
      // 检查是否已完成自评
      if (participant.self_completed === 1) {
        continue;
      }

      // 检查是否已有自评记录
      const evaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: participant.assessment.id },
          evaluator: { id: userId },
          evaluatee: { id: userId },
          type: "self",
        },
      });

      let status: "pending" | "in_progress" | "completed" = "pending";
      if (evaluation) {
        status =
          evaluation.status === "submitted" ? "completed" : "in_progress";
      }

      const now = new Date();
      const deadline = new Date(participant.assessment.deadline);

      // 检查日期有效性
      if (isNaN(deadline.getTime())) {
        console.warn(
          `Invalid deadline for assessment ${participant.assessment.id}: ${participant.assessment.deadline}`
        );
        continue;
      }

      const task = {
        id: `self-${participant.assessment.id}-${userId}`,
        assessment_id: participant.assessment.id,
        assessment_title: participant.assessment.title,
        assessment_period: participant.assessment.period,
        type: "self" as const,
        evaluatee_id: userId,
        evaluatee_name: participant.user.name,
        evaluatee_department: participant.user.department?.name || "",
        status,
        deadline,
        is_overdue: now > deadline && status !== "completed",
        evaluation_id: evaluation?.id,
        last_updated: evaluation?.updated_at,
      };

      tasks.push(task);
    }

    return tasks;
  }

  private async getLeaderEvaluationTasks(
    userId: number,
    assessmentId?: number
  ): Promise<EvaluationTaskDto[]> {
    // 获取下属列表
    const subordinates = await this.usersRepository.find({
      where: { leader: { id: userId } },
      relations: ["department"],
    });

    if (subordinates.length === 0) {
      return [];
    }

    const whereCondition: any = {
      user: { id: In(subordinates.map((s) => s.id)) },
      deleted_at: null,
      assessment: { status: "active" },
    };

    if (assessmentId) {
      whereCondition.assessment = {
        ...whereCondition.assessment,
        id: assessmentId,
      };
    }

    const participants = await this.participantsRepository.find({
      where: whereCondition,
      relations: ["assessment", "user", "user.department"],
    });

    const tasks: EvaluationTaskDto[] = [];

    for (const participant of participants) {
      // 检查是否已完成领导评分
      if (participant.leader_completed === 1) {
        continue;
      }

      // 检查是否已有领导评分记录
      const evaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: participant.assessment.id },
          evaluator: { id: userId },
          evaluatee: { id: participant.user.id },
          type: "leader",
        },
      });

      let status: "pending" | "in_progress" | "completed" = "pending";
      if (evaluation) {
        status =
          evaluation.status === "submitted" ? "completed" : "in_progress";
      }

      const now = new Date();
      const deadline = new Date(participant.assessment.deadline);

      // 检查日期有效性
      if (isNaN(deadline.getTime())) {
        console.warn(
          `Invalid deadline for assessment ${participant.assessment.id}: ${participant.assessment.deadline}`
        );
        continue;
      }

      const task = {
        id: `leader-${participant.assessment.id}-${participant.user.id}`,
        assessment_id: participant.assessment.id,
        assessment_title: participant.assessment.title,
        assessment_period: participant.assessment.period,
        type: "leader" as const,
        evaluatee_id: participant.user.id,
        evaluatee_name: participant.user.name,
        evaluatee_department: participant.user.department?.name || "",
        status,
        deadline,
        is_overdue: now > deadline && status !== "completed",
        evaluation_id: evaluation?.id,
        last_updated: evaluation?.updated_at,
      };

      tasks.push(task);
    }

    return tasks;
  }

  private async enrichDetailedScoresWithTemplate(
    assessmentId: number,
    detailedScores: any
  ): Promise<any> {
    const template = await this.getEvaluationTemplate(assessmentId);

    return detailedScores.map((categoryScore) => {
      const templateCategory = template.categories.find(
        (cat) => cat.id === categoryScore.categoryId
      );
      if (!templateCategory) return categoryScore;

      return {
        ...categoryScore,
        categoryName: templateCategory.name,
        categoryWeight: templateCategory.weight,
        items: categoryScore.items.map((itemScore) => {
          const templateItem = templateCategory.items.find(
            (item) => item.id === itemScore.itemId
          );
          return {
            ...itemScore,
            itemName: templateItem?.name || "",
            itemWeight: templateItem?.weight || 0,
            maxScore: templateItem?.max_score || 100,
            scoringCriteria: templateItem?.scoring_criteria,
          };
        }),
      };
    });
  }

  private generateComparisonAnalysis(
    selfEvaluation: any,
    leaderEvaluation: any,
    template: any
  ): any {
    if (!selfEvaluation || !leaderEvaluation) {
      return { message: "需要自评和领导评分都完成才能进行对比分析" };
    }

    const scoreDifference = Math.abs(
      selfEvaluation.score - leaderEvaluation.score
    );
    const analysis = {
      overall_score_difference: scoreDifference,
      agreement_level:
        scoreDifference <= 5
          ? "high"
          : scoreDifference <= 10
          ? "medium"
          : "low",
      category_differences: [],
    };

    // 如果有详细评分，进行分类别对比
    if (selfEvaluation.detailed_scores && leaderEvaluation.detailed_scores) {
      for (const selfCategory of selfEvaluation.detailed_scores) {
        const leaderCategory = leaderEvaluation.detailed_scores.find(
          (cat) => cat.categoryId === selfCategory.categoryId
        );

        if (leaderCategory) {
          const categoryDiff = Math.abs(
            selfCategory.categoryScore - leaderCategory.categoryScore
          );
          analysis.category_differences.push({
            categoryId: selfCategory.categoryId,
            difference: categoryDiff,
            self_score: selfCategory.categoryScore,
            leader_score: leaderCategory.categoryScore,
          });
        }
      }
    }

    return analysis;
  }
}
