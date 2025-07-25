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
import { EvaluationType, EvaluationStatus } from "../../common/enums/evaluation.enum";
import { CreateSelfEvaluationDto } from "./dto/create-self-evaluation.dto";
import { CreateLeaderEvaluationDto } from "./dto/create-leader-evaluation.dto";
import { CreateBossEvaluationDto } from "./dto/create-boss-evaluation.dto";
import { UpdateEvaluationDto } from "./dto/update-evaluation.dto";
import { QueryEvaluationsDto } from "./dto/query-evaluations.dto";
import {
  CreateDetailedSelfEvaluationDto,
  CreateDetailedLeaderEvaluationDto,
  CreateDetailedBossEvaluationDto,
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
import {
  CompleteEvaluationQueryDto,
  CompleteEvaluationResponseDto,
  AssessmentInfoDto,
  EvaluateeInfoDto,
  DetailedEvaluationDto,
  LeaderEvaluationDto,
  FinalResultDto,
  ComparisonAnalysisDto,
  TimelineEventDto,
} from "./dto/complete-evaluation.dto";

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
      if (assessment.status === "completed" || assessment.status === "ended") {
        throw new BadRequestException("考核已结束，无法进行评分操作，只能查看评估结果");
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
          type: EvaluationType.SELF,
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === EvaluationStatus.SUBMITTED) {
          throw new BadRequestException("已提交过自评，无法重复提交");
        }
        // 更新现有的草稿
        await this.evaluationsRepository.update(existingEvaluation.id, {
          ...createSelfEvaluationDto,
          status: EvaluationStatus.SUBMITTED,
          submitted_at: new Date(),
        });

        // 更新参与者状态
        await queryRunner.manager.update(AssessmentParticipant, participant.id, {
          self_completed: 1,
          self_score: createSelfEvaluationDto.score,
          self_submitted_at: new Date(),
        });

        // 检查是否需要计算最终分数
        await this.calculateFinalScoreIfReady(queryRunner, participant.id);

        await queryRunner.commitTransaction();
        return this.findOne(existingEvaluation.id);
      }

      // 创建新的自评记录
      const evaluation = this.evaluationsRepository.create({
        assessment: { id: createSelfEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: evaluatorId },
        type: EvaluationType.SELF,
        score: createSelfEvaluationDto.score,
        feedback: createSelfEvaluationDto.feedback,
        strengths: createSelfEvaluationDto.strengths,
        improvements: createSelfEvaluationDto.improvements,
        status: EvaluationStatus.SUBMITTED,
        submitted_at: new Date(),
      });

      const savedEvaluation = await queryRunner.manager.save(evaluation);

      // 更新参与者状态
      await queryRunner.manager.update(AssessmentParticipant, participant.id, {
        self_completed: 1,
        self_score: createSelfEvaluationDto.score,
        self_submitted_at: new Date(),
      });

      // 检查是否需要计算最终分数
      await this.calculateFinalScoreIfReady(queryRunner, participant.id);

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
      if (assessment.status === "completed" || assessment.status === "ended") {
        throw new BadRequestException("考核已结束，无法进行评分操作，只能查看评估结果");
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
          type: EvaluationType.LEADER,
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === EvaluationStatus.SUBMITTED) {
          throw new BadRequestException("已提交过对该员工的评分，无法重复提交");
        }
        // 更新现有的草稿
        await this.evaluationsRepository.update(existingEvaluation.id, {
          ...createLeaderEvaluationDto,
          status: EvaluationStatus.SUBMITTED,
          submitted_at: new Date(),
        });

        // 更新参与者状态
        await queryRunner.manager.update(AssessmentParticipant, participant.id, {
          leader_completed: 1,
          leader_score: createLeaderEvaluationDto.score,
          leader_submitted_at: new Date(),
        });

        // 领导评分完成后，自动创建老板评分任务（如果需要）
        await this.createBossEvaluationTaskIfNeeded(queryRunner, participant);

        // 检查是否需要计算最终分数
        await this.calculateFinalScoreIfReady(queryRunner, participant.id);

        await queryRunner.commitTransaction();
        return this.findOne(existingEvaluation.id);
      }

      // 创建新的领导评分记录
      const evaluation = this.evaluationsRepository.create({
        assessment: { id: createLeaderEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: createLeaderEvaluationDto.evaluatee_id },
        type: EvaluationType.LEADER,
        score: createLeaderEvaluationDto.score,
        feedback: createLeaderEvaluationDto.feedback,
        strengths: createLeaderEvaluationDto.strengths,
        improvements: createLeaderEvaluationDto.improvements,
        status: EvaluationStatus.SUBMITTED,
        submitted_at: new Date(),
      });

      const savedEvaluation = await queryRunner.manager.save(evaluation);

      // 更新参与者状态
      await queryRunner.manager.update(AssessmentParticipant, participant.id, {
        leader_completed: 1,
        leader_score: createLeaderEvaluationDto.score,
        leader_submitted_at: new Date(),
      });

      // 领导评分完成后，自动创建老板评分任务（如果需要）
      await this.createBossEvaluationTaskIfNeeded(queryRunner, participant);

      // 检查是否需要计算最终分数
      await this.calculateFinalScoreIfReady(queryRunner, participant.id);

      await queryRunner.commitTransaction();
      return this.findOne(savedEvaluation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 创建上级(Boss)评估
   */
  async createBossEvaluation(
    createBossEvaluationDto: CreateBossEvaluationDto,
    evaluatorId: number
  ): Promise<Evaluation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核是否存在且状态为active
      const assessment = await queryRunner.manager.findOne(Assessment, {
        where: { id: createBossEvaluationDto.assessment_id },
      });

      if (!assessment) {
        throw new NotFoundException("考核不存在");
      }

      if (assessment.status !== "active") {
        throw new BadRequestException("只能对进行中的考核进行评分");
      }

      // 验证被评估人是否为考核参与者
      const participant = await queryRunner.manager.findOne(
        AssessmentParticipant,
        {
          where: {
            assessment: { id: createBossEvaluationDto.assessment_id },
            user: { id: createBossEvaluationDto.evaluatee_id },
          },
        }
      );

      if (!participant) {
        throw new NotFoundException("被评估人不是该考核的参与者");
      }

      // 验证评估者是否有权限进行上级评分（需要是被评估人的上级的上级）
      const evaluatee = await queryRunner.manager.findOne(User, {
        where: { id: createBossEvaluationDto.evaluatee_id },
        relations: ["leader", "leader.leader"],
      });

      if (!evaluatee?.leader?.leader || evaluatee.leader.leader.id !== evaluatorId) {
        throw new BadRequestException("您没有权限对该用户进行上级评分");
      }

      // 检查是否已存在上级评分
      const existingEvaluation = await queryRunner.manager.findOne(Evaluation, {
        where: {
          assessment: { id: createBossEvaluationDto.assessment_id },
          evaluatee: { id: createBossEvaluationDto.evaluatee_id },
          type: EvaluationType.BOSS,
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === EvaluationStatus.SUBMITTED) {
          throw new BadRequestException("上级评分已提交，无法重复提交");
        }

        // 更新现有评分
        await queryRunner.manager.update(Evaluation, existingEvaluation.id, {
          ...createBossEvaluationDto,
          status: EvaluationStatus.SUBMITTED,
          submitted_at: new Date(),
        });

        // 更新参与者的上级评分状态
        await queryRunner.manager.update(AssessmentParticipant, participant.id, {
          boss_completed: 1,
          boss_score: createBossEvaluationDto.score,
          boss_submitted_at: new Date(),
        });

        // 检查是否需要计算最终分数
        await this.calculateFinalScoreIfReady(queryRunner, participant.id);
        await queryRunner.commitTransaction();
        return this.findOne(existingEvaluation.id);
      }

      // 创建新的上级评分记录
      const evaluation = this.evaluationsRepository.create({
        assessment: { id: createBossEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: createBossEvaluationDto.evaluatee_id },
        type: EvaluationType.BOSS,
        score: createBossEvaluationDto.score,
        feedback: createBossEvaluationDto.feedback,
        strengths: createBossEvaluationDto.strengths,
        improvements: createBossEvaluationDto.improvements,
        status: EvaluationStatus.SUBMITTED,
        submitted_at: new Date(),
      });

      const savedEvaluation = await queryRunner.manager.save(evaluation);

      // 更新参与者的上级评分状态
      await queryRunner.manager.update(AssessmentParticipant, participant.id, {
        boss_completed: 1,
        boss_score: createBossEvaluationDto.score,
        boss_submitted_at: new Date(),
      });

      // 检查是否需要计算最终分数
      await this.calculateFinalScoreIfReady(queryRunner, participant.id);
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
    console.log(`[DEBUG] getEvaluationsToGive called with userId: ${userId}, assessmentId: ${assessmentId}`);
    
    // 获取需要我评分的下属
    const subordinates = await this.usersRepository.find({
      where: { leader: { id: userId } },
    });

    console.log(`[DEBUG] Found ${subordinates.length} subordinates for userId ${userId}:`, 
      subordinates.map(s => ({ id: s.id, name: s.name, username: s.username })));

    if (subordinates.length === 0) {
      console.log(`[DEBUG] No subordinates found for userId ${userId}, returning empty array`);
      return [];
    }

    const subordinateIds = subordinates.map((s) => s.id);
    
    // 修改逻辑：查找需要进行领导评分的参与者（已完成自评但未完成领导评分）
    const participantsWhere: any = {
      user: { id: In(subordinateIds) },
      self_completed: 1,
      leader_completed: 0,
      assessment: { status: "active" },
    };
    
    if (assessmentId) {
      participantsWhere.assessment = { id: assessmentId, status: "active" };
    }

    const participants = await this.participantsRepository.find({
      where: participantsWhere,
      relations: ["user", "user.department", "assessment"],
    });

    console.log(`[DEBUG] Found ${participants.length} participants who completed self-evaluation but need leader-evaluation`);
    
    // 为每个参与者创建或获取评估记录
    const evaluationsToGive = [];
    
    for (const participant of participants) {
      // 检查是否已有领导评分记录
      let evaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: participant.assessment.id },
          evaluator: { id: userId },
          evaluatee: { id: participant.user.id },
          type: EvaluationType.LEADER,
        },
        relations: ["assessment", "evaluatee", "evaluatee.department"],
      });

      // 如果没有评估记录，创建一个草稿记录
      if (!evaluation) {
        evaluation = this.evaluationsRepository.create({
          assessment: participant.assessment,
          evaluator: { id: userId },
          evaluatee: participant.user,
          type: EvaluationType.LEADER,
          score: 0,
          status: EvaluationStatus.DRAFT,
        });
        evaluation = await this.evaluationsRepository.save(evaluation);
        
        // 重新加载关联数据
        evaluation = await this.evaluationsRepository.findOne({
          where: { id: evaluation.id },
          relations: ["assessment", "evaluatee", "evaluatee.department"],
        });
      }

      evaluationsToGive.push(evaluation);
    }

    console.log(`[DEBUG] Returning ${evaluationsToGive.length} evaluations to give`);
    
    return evaluationsToGive;
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
    let evaluationType: EvaluationType;
    if (userId === currentUserId) {
      evaluationType = EvaluationType.SELF;
    } else {
      // 检查是否为直属领导关系
      const evaluatee = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ["leader", "leader.leader"],
      });

      if (evaluatee?.leader?.id === currentUserId) {
        evaluationType = EvaluationType.LEADER;
      } else if (evaluatee?.leader?.leader?.id === currentUserId) {
        evaluationType = EvaluationType.BOSS;
      } else {
        throw new BadRequestException("您没有权限对该用户进行评分");
      }
    }

    // 过滤模板类别（如果是自评，过滤掉仅限领导的项目）
    let filteredCategories = baseTemplate.categories;
    if (evaluationType === EvaluationType.SELF) {
      filteredCategories = baseTemplate.categories.filter(
        (cat) => !cat.special_attributes?.leader_only
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
    if (evaluationType === EvaluationType.LEADER || evaluationType === EvaluationType.BOSS) {
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
      evaluatee_id: evaluationType !== EvaluationType.SELF ? userId : undefined,
      evaluatee_name: evaluationType !== EvaluationType.SELF ? evaluateeName : undefined,
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
      EvaluationType.SELF
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
      if (assessment.status === "completed" || assessment.status === "ended") {
        throw new BadRequestException("考核已结束，无法进行评分操作，只能查看评估结果");
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
          type: EvaluationType.SELF,
        },
      });

      if (existingEvaluation && existingEvaluation.status === "submitted") {
        throw new BadRequestException("已提交过自评，无法重复提交");
      }

      const evaluationData = {
        assessment: { id: createDetailedSelfEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: evaluatorId },
        type: EvaluationType.SELF,
        score: totalScore,
        feedback: createDetailedSelfEvaluationDto.self_review || createDetailedSelfEvaluationDto.overall_feedback,
        strengths: createDetailedSelfEvaluationDto.strengths,
        improvements: createDetailedSelfEvaluationDto.improvements,
        detailed_scores: createDetailedSelfEvaluationDto.detailed_scores,
        status: EvaluationStatus.SUBMITTED,
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

      // 检查是否需要计算最终分数
      await this.calculateFinalScoreIfReady(queryRunner, participant.id);

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
      EvaluationType.LEADER
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
      if (assessment.status === "completed" || assessment.status === "ended") {
        throw new BadRequestException("考核已结束，无法进行评分操作，只能查看评估结果");
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
          type: EvaluationType.LEADER,
        },
      });

      if (existingEvaluation && existingEvaluation.status === "submitted") {
        throw new BadRequestException("已提交过对该员工的评分，无法重复提交");
      }

      const evaluationData = {
        assessment: { id: createDetailedLeaderEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: createDetailedLeaderEvaluationDto.evaluatee_id },
        type: EvaluationType.LEADER,
        score: totalScore,
        feedback: createDetailedLeaderEvaluationDto.leader_review || createDetailedLeaderEvaluationDto.overall_feedback,
        strengths: createDetailedLeaderEvaluationDto.strengths,
        improvements: createDetailedLeaderEvaluationDto.improvements,
        detailed_scores: createDetailedLeaderEvaluationDto.detailed_scores,
        status: EvaluationStatus.SUBMITTED,
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

      // 检查是否需要计算最终分数
      await this.calculateFinalScoreIfReady(queryRunner, participant.id);

      await queryRunner.commitTransaction();
      return this.findOne(savedEvaluation.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 创建详细的上级(Boss)评估
   */
  async createDetailedBossEvaluation(
    createDetailedBossEvaluationDto: CreateDetailedBossEvaluationDto,
    evaluatorId: number
  ): Promise<Evaluation> {
    // 验证评分数据
    await this.validateDetailedScores(
      createDetailedBossEvaluationDto.assessment_id,
      createDetailedBossEvaluationDto.detailed_scores,
      EvaluationType.BOSS
    );

    // 计算总分
    const totalScore = await this.calculateTotalScore(
      createDetailedBossEvaluationDto.assessment_id,
      createDetailedBossEvaluationDto.detailed_scores
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核状态
      const assessment = await queryRunner.manager.findOne(Assessment, {
        where: { id: createDetailedBossEvaluationDto.assessment_id },
      });

      if (!assessment) {
        throw new NotFoundException("考核不存在");
      }

      if (assessment.status !== "active") {
        throw new BadRequestException("只能对进行中的考核进行评分");
      }

      // 验证参与者
      const participant = await queryRunner.manager.findOne(
        AssessmentParticipant,
        {
          where: {
            assessment: { id: createDetailedBossEvaluationDto.assessment_id },
            user: { id: createDetailedBossEvaluationDto.evaluatee_id },
          },
        }
      );

      if (!participant) {
        throw new NotFoundException("被评估人不是该考核的参与者");
      }

      // 验证上级评分权限
      const evaluatee = await queryRunner.manager.findOne(User, {
        where: { id: createDetailedBossEvaluationDto.evaluatee_id },
        relations: ["leader", "leader.leader"],
      });

      if (!evaluatee?.leader?.leader || evaluatee.leader.leader.id !== evaluatorId) {
        throw new BadRequestException("您没有权限对该用户进行上级评分");
      }

      // 检查是否已存在上级评分
      const existingEvaluation = await queryRunner.manager.findOne(Evaluation, {
        where: {
          assessment: { id: createDetailedBossEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: createDetailedBossEvaluationDto.evaluatee_id },
          type: EvaluationType.BOSS,
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === EvaluationStatus.SUBMITTED) {
          throw new BadRequestException("上级评分已提交，无法重复提交");
        }

        // 更新现有评分
        await queryRunner.manager.update(Evaluation, existingEvaluation.id, {
          score: totalScore,
          feedback: createDetailedBossEvaluationDto.boss_review || createDetailedBossEvaluationDto.overall_feedback,
          strengths: createDetailedBossEvaluationDto.strengths,
          improvements: createDetailedBossEvaluationDto.improvements,
          detailed_scores: createDetailedBossEvaluationDto.detailed_scores,
          status: EvaluationStatus.SUBMITTED,
          submitted_at: new Date(),
        });

        // 更新参与者的上级评分状态
        await queryRunner.manager.update(AssessmentParticipant, participant.id, {
          boss_completed: 1,
          boss_score: totalScore,
          boss_submitted_at: new Date(),
        });

        // 检查是否需要计算最终分数
        await this.calculateFinalScoreIfReady(queryRunner, participant.id);
        await queryRunner.commitTransaction();
        return this.findOne(existingEvaluation.id);
      }

      // 创建新的上级评分记录
      const evaluation = this.evaluationsRepository.create({
        assessment: { id: createDetailedBossEvaluationDto.assessment_id },
        evaluator: { id: evaluatorId },
        evaluatee: { id: createDetailedBossEvaluationDto.evaluatee_id },
        type: EvaluationType.BOSS,
        score: totalScore,
        feedback: createDetailedBossEvaluationDto.boss_review || createDetailedBossEvaluationDto.overall_feedback,
        strengths: createDetailedBossEvaluationDto.strengths,
        improvements: createDetailedBossEvaluationDto.improvements,
        detailed_scores: createDetailedBossEvaluationDto.detailed_scores,
        status: EvaluationStatus.SUBMITTED,
        submitted_at: new Date(),
      });

      const savedEvaluation = await queryRunner.manager.save(evaluation);

      // 更新参与者的上级评分状态
      await queryRunner.manager.update(AssessmentParticipant, participant.id, {
        boss_completed: 1,
        boss_score: totalScore,
        boss_submitted_at: new Date(),
      });

      // 检查是否需要计算最终分数
      await this.calculateFinalScoreIfReady(queryRunner, participant.id);
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

    // 领导评分权限检查（包括直属领导和上级）
    const evaluatee = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["leader", "leader.leader"],
    });

    if (!evaluatee) {
      return { canEvaluate: false, reason: "用户不存在" };
    }

    // 检查是否为直属领导
    if (evaluatee.leader?.id === currentUserId) {
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

    // 检查是否为上级（Boss）
    if (evaluatee.leader?.leader?.id === currentUserId) {
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

    return { canEvaluate: false, reason: "您不是该员工的直属领导或上级" };
  }

  private async validateDetailedScores(
    assessmentId: number,
    detailedScores: DetailedCategoryScoreDto[],
    evaluationType: EvaluationType
  ): Promise<void> {
    const template = await this.getEvaluationTemplate(assessmentId);

    // 验证类别完整性
    const requiredCategories = template.categories
      .filter((cat) => evaluationType === "leader" || !cat.special_attributes?.leader_only)
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
        updateEvaluationDraftDto.leader_review ||
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
        type: saveEvaluationDraftDto.type as EvaluationType,
      },
    });

    if (existingEvaluation) {
      // 如果已存在，则更新
      const updateDto: UpdateEvaluationDraftDto = {
        self_review: saveEvaluationDraftDto.self_review,
        leader_review: saveEvaluationDraftDto.leader_review,
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
      type: saveEvaluationDraftDto.type as EvaluationType,
      score: totalScore,
      feedback:
        saveEvaluationDraftDto.leader_review ||
        saveEvaluationDraftDto.self_review ||
        saveEvaluationDraftDto.overall_feedback,
      strengths: saveEvaluationDraftDto.strengths,
      improvements: saveEvaluationDraftDto.improvements,
      detailed_scores: saveEvaluationDraftDto.detailed_scores,
      status: EvaluationStatus.DRAFT,
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

      // 获取老板评分任务
      const bossTasks = await this.getBossEvaluationTasks(
        userId,
        assessmentId
      );
      tasks.push(...bossTasks);

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
    const currentUser = await this.usersRepository.findOne({
      where: { id: currentUserId },
      relations: ["department", "roles"],
    });

    if (!currentUser) {
      throw new NotFoundException(`用户 ID ${currentUserId} 不存在`);
    }

    // 验证用户是否具有领导角色
    const hasLeaderRole = currentUser.roles.some((role) => role.code === "leader");
    if (!hasLeaderRole) {
      throw new BadRequestException("您没有权限访问此功能，仅限领导角色");
    }

    // 验证用户是否属于某个部门
    if (!currentUser.department) {
      throw new BadRequestException("您未分配到任何部门，无法查看评估进度");
    }

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

    // 过滤掉已删除的参与者
    let participants = assessment.participants.filter((p) => !p.deleted_at);

    // 严格的部门过滤：只显示当前领导所在部门的成员
    participants = participants.filter((p) => {
      // 确保参与者有部门信息且与当前用户部门匹配
      return p.user.department?.id === currentUser.department.id;
    });

    const totalParticipants = participants.length;

    // 如果当前领导部门没有参与者，记录日志但不抛出错误（可能是正常情况）
    if (totalParticipants === 0) {
      console.log(`Leader ${currentUserId} from department ${currentUser.department.name} has no participants in assessment ${assessmentId}`);
    }

    // 统计完成情况
    const selfCompletedCount = participants.filter(
      (p) => p.self_completed === 1
    ).length;
    const leaderCompletedCount = participants.filter(
      (p) => p.leader_completed === 1
    ).length;
    const bossCompletedCount = participants.filter(
      (p) => p.boss_completed === 1
    ).length;
    const fullyCompletedCount = participants.filter(
      (p) => p.self_completed === 1 && p.leader_completed === 1 && p.boss_completed === 1
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
    const bossCompletionRate =
      totalParticipants > 0
        ? (bossCompletedCount / totalParticipants) * 100
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
      boss_status:
        p.boss_completed === 1
          ? ("completed" as const)
          : ("not_started" as const),
      self_completed_at: p.self_submitted_at,
      leader_completed_at: p.leader_submitted_at,
      boss_completed_at: p.boss_submitted_at,
    }));

    return {
      assessment_id: assessmentId,
      assessment_title: assessment.title,
      total_participants: totalParticipants,
      self_completed_count: selfCompletedCount,
      leader_completed_count: leaderCompletedCount,
      boss_completed_count: bossCompletedCount,
      fully_completed_count: fullyCompletedCount,
      self_completion_rate: Math.round(selfCompletionRate * 100) / 100,
      leader_completion_rate: Math.round(leaderCompletionRate * 100) / 100,
      boss_completion_rate: Math.round(bossCompletionRate * 100) / 100,
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
          type: EvaluationType.LEADER,
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

  async getEmployeeEvaluationResult(
    assessmentId: number,
    userId: number
  ): Promise<any> {
    // 获取考核信息
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['template'],
    });

    if (!assessment) {
      throw new NotFoundException('考核不存在');
    }

    // 获取考核参与记录
    const participant = await this.participantsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        user: { id: userId },
      },
      relations: ['assessment', 'user', 'user.department'],
    });

    if (!participant) {
      throw new NotFoundException('您未参与此考核');
    }

    // 检查考核是否已完成（自评和领导评分都已完成）
    if (participant.self_completed !== 1 || participant.leader_completed !== 1) {
      throw new BadRequestException('考核尚未完成，无法查看结果详情');
    }

    // 获取自评记录
    const selfEvaluation = await this.evaluationsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        evaluatee: { id: userId },
        type: EvaluationType.SELF,
      },
    });

    // 获取领导评分记录
    const leaderEvaluation = await this.evaluationsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        evaluatee: { id: userId },
        type: EvaluationType.LEADER,
      },
      relations: ['evaluator'],
    });

    if (!selfEvaluation || !leaderEvaluation) {
      throw new BadRequestException('评估记录不完整');
    }

    // 获取模板信息用于详细评分解析
    const template = await this.getEvaluationTemplate(assessmentId);

    // 构建返回数据
    const result = {
      assessment_info: {
        assessment_id: assessment.id,
        assessment_title: assessment.title,
        assessment_period: assessment.period,
        template_name: assessment.template?.name || '标准绩效考核模板',
        start_date: assessment.start_date,
        end_date: assessment.end_date,
        deadline: assessment.end_date,
        status: assessment.status,
      },
      employee_info: {
        employee_id: participant.user.id,
        employee_name: participant.user.name,
        department: participant.user.department?.name || '',
      },
      final_score: participant.final_score,
      final_level: this.calculateFinalLevel(participant.final_score),
      self_evaluation: {
        score: selfEvaluation.score,
        submitted_at: selfEvaluation.submitted_at,
        review: selfEvaluation.feedback,
        strengths: selfEvaluation.strengths,
        improvements: selfEvaluation.improvements,
        detailed_scores: selfEvaluation.detailed_scores
          ? await this.enrichDetailedScoresWithTemplate(
              assessmentId,
              selfEvaluation.detailed_scores
            )
          : null,
      },
      leader_evaluation: {
        score: leaderEvaluation.score,
        submitted_at: leaderEvaluation.submitted_at,
        leader_name: leaderEvaluation.evaluator?.name || '',
        review: leaderEvaluation.feedback,
        strengths: leaderEvaluation.strengths,
        improvements: leaderEvaluation.improvements,
        detailed_scores: leaderEvaluation.detailed_scores
          ? await this.enrichDetailedScoresWithTemplate(
              assessmentId,
              leaderEvaluation.detailed_scores
            )
          : null,
      },
      score_difference: {
        total_difference: Math.abs(selfEvaluation.score - leaderEvaluation.score),
        self_higher: selfEvaluation.score > leaderEvaluation.score,
        agreement_level: this.calculateAgreementLevel(
          Math.abs(selfEvaluation.score - leaderEvaluation.score)
        ),
      },
      comparison_analysis: this.generateComparisonAnalysis(
        selfEvaluation,
        leaderEvaluation,
        template
      ),
      completed_at: participant.updated_at,
    };

    return result;
  }

  private calculateAgreementLevel(difference: number): string {
    if (difference <= 5) return 'high';
    if (difference <= 10) return 'medium';
    return 'low';
  }

  private calculateFinalLevel(score: number): string {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '合格';
    if (score >= 60) return '基本合格';
    return '不合格';
  }

  async getEvaluationComparison(
    assessmentId: number,
    userId: number,
    currentUserId: number
  ): Promise<any> {
    // 权限检查：用户可以查看自己的，领导可以查看下属的
    let hasPermission = false;

    // 1. 用户查看自己的评分对比
    if (userId === currentUserId) {
      hasPermission = true;
    } else {
      // 2. 检查是否为直属领导关系
      const evaluatee = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ["leader"],
      });

      if (evaluatee && evaluatee.leader?.id === currentUserId) {
        hasPermission = true;
      }
    }

    // TODO: 添加管理员权限检查

    if (!hasPermission) {
      throw new BadRequestException("您没有权限查看此评分对比");
    }

    // 获取自评和领导评分
    const [selfEvaluation, leaderEvaluation] = await Promise.all([
      this.evaluationsRepository.findOne({
        where: {
          assessment: { id: assessmentId },
          evaluatee: { id: userId },
          type: EvaluationType.SELF,
          status: EvaluationStatus.SUBMITTED,
        },
        relations: ["evaluator"],
      }),
      this.evaluationsRepository.findOne({
        where: {
          assessment: { id: assessmentId },
          evaluatee: { id: userId },
          type: EvaluationType.LEADER,
          status: EvaluationStatus.SUBMITTED,
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
      // 检查是否已有自评记录
      const evaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: participant.assessment.id },
          evaluator: { id: userId },
          evaluatee: { id: userId },
          type: EvaluationType.SELF,
        },
      });

      let status: "pending" | "in_progress" | "completed" = "pending";
      if (participant.self_completed === 1) {
        status = "completed";
      } else if (evaluation) {
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
      // 检查是否已有领导评分记录
      const evaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: participant.assessment.id },
          evaluator: { id: userId },
          evaluatee: { id: participant.user.id },
          type: EvaluationType.LEADER,
        },
      });

      let status: "pending" | "in_progress" | "completed" = "pending";
      if (participant.leader_completed === 1) {
        status = "completed";
      } else if (evaluation) {
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
      if (!templateCategory) return {
        ...categoryScore,
        categoryScore: Math.round(categoryScore.categoryScore * 100) / 100,
        items: categoryScore.items?.map((itemScore) => ({
          ...itemScore,
          score: Math.round(itemScore.score * 100) / 100,
        })) || [],
      };

      return {
        ...categoryScore,
        categoryScore: Math.round(categoryScore.categoryScore * 100) / 100,
        categoryName: templateCategory.name,
        categoryWeight: templateCategory.weight,
        items: categoryScore.items.map((itemScore) => {
          const templateItem = templateCategory.items.find(
            (item) => item.id === itemScore.itemId
          );
          return {
            ...itemScore,
            score: Math.round(itemScore.score * 100) / 100,
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
      overall_score_difference: Math.round(scoreDifference * 100) / 100,
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
            difference: Math.round(categoryDiff * 100) / 100,
            self_score: Math.round(selfCategory.categoryScore * 100) / 100,
            leader_score: Math.round(leaderCategory.categoryScore * 100) / 100,
          });
        }
      }
    }

    return analysis;
  }

  async getCompleteEvaluation(
    assessmentId: number,
    userId: number,
    query: CompleteEvaluationQueryDto
  ): Promise<CompleteEvaluationResponseDto> {
    // 获取考核信息
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['template'],
    });

    if (!assessment) {
      throw new NotFoundException('考核不存在');
    }

    // 获取被评估人信息
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取考核参与记录
    const participant = await this.participantsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        user: { id: userId },
      },
      relations: ['assessment', 'user'],
    });

    if (!participant) {
      throw new NotFoundException('该用户未参与此考核');
    }

    // 获取自评记录
    const selfEvaluation = await this.evaluationsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        evaluatee: { id: userId },
        type: EvaluationType.SELF,
      },
    });

    // 获取领导评分记录
    const leaderEvaluation = await this.evaluationsRepository.findOne({
      where: {
        assessment: { id: assessmentId },
        evaluatee: { id: userId },
        type: EvaluationType.LEADER,
      },
      relations: ['evaluator'],
    });

    // 构建考核信息
    const assessmentInfo: AssessmentInfoDto = {
      assessment_id: assessment.id,
      assessment_title: assessment.title,
      period: assessment.period,
      template_name: assessment.template?.name || '标准绩效考核模板',
      start_date: assessment.start_date,
      end_date: assessment.end_date,
      deadline: assessment.end_date,
      status: assessment.status,
    };

    // 构建被评估人信息
    const evaluateeInfo: EvaluateeInfoDto = {
      user_id: user.id,
      user_name: user.name,
      department: user.department?.name || '',
      position: user.position || '',
      email: user.email || '',
    };

    // 获取评分模板用于详细信息
    let template: any = null;
    if (query.include_details) {
      try {
        template = await this.getEvaluationTemplate(assessmentId);
      } catch (error) {
        console.warn('Failed to get evaluation template:', error);
      }
    }

    // 构建自评详情
    let selfEvaluationDetail: DetailedEvaluationDto = {
      evaluation_id: selfEvaluation?.id || 0,
      completed: participant.self_completed === 1,
      submitted_at: participant.self_submitted_at || new Date(),
      overall_score: Math.round(parseFloat(participant.self_score?.toString() || '0') * 100) / 100,
      review: selfEvaluation?.feedback || '',
      strengths: selfEvaluation?.strengths || '',
      improvements: selfEvaluation?.improvements || '',
      detailed_scores: [],
    };

    // 构建领导评分详情
    let leaderEvaluationDetail: LeaderEvaluationDto = {
      evaluation_id: leaderEvaluation?.id || 0,
      leader_id: leaderEvaluation?.evaluator?.id || 0,
      leader_name: leaderEvaluation?.evaluator?.name || '',
      completed: participant.leader_completed === 1,
      submitted_at: participant.leader_submitted_at || new Date(),
      overall_score: Math.round(parseFloat(participant.leader_score?.toString() || '0') * 100) / 100,
      review: leaderEvaluation?.feedback || '',
      strengths: leaderEvaluation?.strengths || '',
      improvements: leaderEvaluation?.improvements || '',
      detailed_scores: [],
    };

    // 如果包含详细评分信息，解析详细分数
    if (query.include_details && template) {
      if (selfEvaluation?.detailed_scores) {
        try {
          const selfDetailedScores = JSON.parse(selfEvaluation.detailed_scores);
          selfEvaluationDetail.detailed_scores = await this.enrichDetailedScoresWithTemplate(
            assessmentId,
            selfDetailedScores
          );
        } catch (error) {
          console.warn('Failed to parse self evaluation detailed scores:', error);
        }
      }

      if (leaderEvaluation?.detailed_scores) {
        try {
          const leaderDetailedScores = JSON.parse(leaderEvaluation.detailed_scores);
          leaderEvaluationDetail.detailed_scores = await this.enrichDetailedScoresWithTemplate(
            assessmentId,
            leaderDetailedScores
          );
        } catch (error) {
          console.warn('Failed to parse leader evaluation detailed scores:', error);
        }
      }
    }

    // 构建最终结果
    const finalScore = Math.round(parseFloat(participant.final_score?.toString() || '0') * 100) / 100;
    let finalLevel = '';
    if (finalScore >= 90) finalLevel = '优秀';
    else if (finalScore >= 80) finalLevel = '良好';
    else if (finalScore >= 70) finalLevel = '合格';
    else finalLevel = '待改进';

    const finalResult: FinalResultDto = {
      final_score: finalScore,
      final_level: finalLevel,
      calculation_method: 'weighted_average',
      weight_config: {
        self_weight: 30,
        leader_weight: 70,
      },
      calculation_details: {
        self_weighted_score: Math.round(selfEvaluationDetail.overall_score * 0.3 * 100) / 100,
        leader_weighted_score: Math.round(leaderEvaluationDetail.overall_score * 0.7 * 100) / 100,
        total_score: Math.round((selfEvaluationDetail.overall_score * 0.3 + leaderEvaluationDetail.overall_score * 0.7) * 100) / 100,
        rounded_score: finalScore,
      },
      completed_at: participant.leader_submitted_at || participant.updated_at,
    };

    // 构建对比分析
    let comparisonAnalysis: ComparisonAnalysisDto | undefined;
    if (query.include_comparison && selfEvaluation && leaderEvaluation) {
      const overallDifference = Math.abs(selfEvaluationDetail.overall_score - leaderEvaluationDetail.overall_score);
      const agreementLevel = overallDifference <= 5 ? 'high' : overallDifference <= 10 ? 'medium' : 'low';

      comparisonAnalysis = {
        overall_difference: Math.round(overallDifference * 100) / 100,
        agreement_level: agreementLevel,
        category_comparisons: [],
      };

      // 如果有详细评分，进行分类对比
      if (selfEvaluationDetail.detailed_scores && leaderEvaluationDetail.detailed_scores) {
        for (const selfCategory of selfEvaluationDetail.detailed_scores) {
          const leaderCategory = leaderEvaluationDetail.detailed_scores.find(
            (cat: any) => cat.category_id === selfCategory.category_id
          );

          if (leaderCategory) {
            const categoryDiff = Math.abs(selfCategory.category_score - leaderCategory.category_score);
            const categoryAgreement = categoryDiff <= 5 ? 'high' : categoryDiff <= 10 ? 'medium' : 'low';

            const itemComparisons = selfCategory.items.map((selfItem: any) => {
              const leaderItem = leaderCategory.items.find((item: any) => item.itemId === selfItem.itemId);
              const itemDiff = leaderItem ? Math.abs(selfItem.score - leaderItem.score) : 0;
              const itemAgreement = itemDiff <= 5 ? 'high' : itemDiff <= 10 ? 'medium' : 'low';

              return {
                item_id: selfItem.itemId,
                item_name: selfItem.itemName || '',
                self_score: selfItem.score,
                leader_score: leaderItem?.score || 0,
                difference: Math.round(itemDiff * 100) / 100,
                agreement: itemAgreement,
              };
            });

            comparisonAnalysis.category_comparisons.push({
              category_id: selfCategory.category_id,
              category_name: selfCategory.category_name || '',
              self_score: selfCategory.category_score,
              leader_score: leaderCategory.category_score,
              difference: Math.round(categoryDiff * 100) / 100,
              agreement: categoryAgreement,
              item_comparisons: itemComparisons,
            });
          }
        }
      }
    }

    // 构建时间线
    const timeline: TimelineEventDto[] = [
      {
        event: 'assessment_created',
        description: '考核创建',
        timestamp: assessment.created_at,
        actor: '系统',
      },
    ];

    if (participant.self_submitted_at) {
      timeline.push({
        event: 'self_evaluation_submitted',
        description: '员工提交自评',
        timestamp: participant.self_submitted_at,
        actor: user.name,
      });
    }

    if (participant.leader_submitted_at && leaderEvaluation?.evaluator) {
      timeline.push({
        event: 'leader_evaluation_submitted',
        description: '领导完成评分',
        timestamp: participant.leader_submitted_at,
        actor: leaderEvaluation.evaluator.name,
      });
    }

    if (participant.self_completed === 1 && participant.leader_completed === 1) {
      timeline.push({
        event: 'assessment_completed',
        description: '考核完成',
        timestamp: participant.leader_submitted_at || participant.updated_at,
        actor: '系统',
      });
    }

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      assessment_info: assessmentInfo,
      evaluatee_info: evaluateeInfo,
      self_evaluation: selfEvaluationDetail,
      leader_evaluation: leaderEvaluationDetail,
      final_result: finalResult,
      comparison_analysis: comparisonAnalysis,
      timeline,
    };
  }

  /**
   * 领导评分完成后，自动创建老板评分任务（如果需要）
   */
  private async createBossEvaluationTaskIfNeeded(
    queryRunner: any, 
    participant: any
  ): Promise<void> {
    try {
      // 获取权重配置，检查是否需要boss评分
      const weightConfig = await this.getWeightConfig(participant.assessment.id);
      
      if (!weightConfig.boss_enabled || weightConfig.boss_weight <= 0) {
        console.log(`⏭️ Boss评分未启用 - 参与者ID: ${participant.id}`);
        return;
      }

      // 获取被评估人信息，找到其上级（老板）
      const evaluatee = await queryRunner.manager.findOne(this.usersRepository.target, {
        where: { id: participant.user_id || participant.user?.id },
        relations: ['leader', 'leader.leader'],
      });

      if (!evaluatee?.leader?.leader) {
        console.log(`⚠️ 未找到被评估人的上级 - 参与者ID: ${participant.id}`);
        return;
      }

      const bossId = evaluatee.leader.leader.id;
      const evaluateeId = evaluatee.id;
      const assessmentId = participant.assessment.id || participant.assessment_id;

      // 检查是否已经存在boss评分记录
      const existingBossEvaluation = await queryRunner.manager.findOne(this.evaluationsRepository.target, {
        where: {
          assessment: { id: assessmentId },
          evaluator: { id: bossId },
          evaluatee: { id: evaluateeId },
          type: EvaluationType.BOSS,
        },
      });

      if (existingBossEvaluation) {
        console.log(`📋 Boss评分任务已存在 - 参与者ID: ${participant.id}, Boss ID: ${bossId}`);
        return;
      }

      // 创建boss评分任务（draft状态）
      const bossEvaluationTask = queryRunner.manager.create(this.evaluationsRepository.target, {
        assessment: { id: assessmentId },
        evaluator: { id: bossId },
        evaluatee: { id: evaluateeId },
        type: EvaluationType.BOSS,
        status: EvaluationStatus.DRAFT,
        score: null,
        feedback: null,
        strengths: null,
        improvements: null,
        submitted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await queryRunner.manager.save(this.evaluationsRepository.target, bossEvaluationTask);

      console.log(`✅ 已创建Boss评分任务 - 参与者ID: ${participant.id}, Boss ID: ${bossId}, 评估ID: ${bossEvaluationTask.id}`);
      
    } catch (error) {
      console.error(`❌ 创建Boss评分任务失败 - 参与者ID: ${participant.id}`, error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 检查是否评分都完成，如果完成则自动计算最终分数
   * 支持三维度评分：自评 + 领导评分 + 上级评分（可选）
   */
  private async calculateFinalScoreIfReady(queryRunner: any, participantId: number): Promise<void> {
    // 重新获取参与者信息，确保获取最新状态
    const participant = await queryRunner.manager.findOne(AssessmentParticipant, {
      where: { id: participantId },
      relations: ['assessment'],
    });

    if (!participant) {
      console.log(`⚠️ 未找到参与者记录 - 参与者ID: ${participantId}`);
      return;
    }

    try {
      // 获取权重配置
      const weightConfig = await this.getWeightConfig(participant.assessment.id);
      
      // 检查必需的评分是否都已完成（自评和领导评分是必需的）
      const selfCompleted = participant.self_completed === 1;
      const leaderCompleted = participant.leader_completed === 1;
      const bossCompleted = participant.boss_completed === 1;
      
      // 如果启用了boss评分且boss评分权重大于0，则boss评分是必需的
      const bossRequired = weightConfig.boss_enabled && weightConfig.boss_weight > 0;
      const requiredEvaluationsComplete = selfCompleted && leaderCompleted && (!bossRequired || bossCompleted);
      
      if (requiredEvaluationsComplete) {
        // 计算最终分数：支持三维度权重计算
        let finalScore = 0;
        
        // 自评部分
        if (participant.self_score !== null && weightConfig.self_weight > 0) {
          finalScore += participant.self_score * weightConfig.self_weight;
        }
        
        // 领导评分部分
        if (participant.leader_score !== null && weightConfig.leader_weight > 0) {
          finalScore += participant.leader_score * weightConfig.leader_weight;
        }
        
        // 上级评分部分（可选）
        if (participant.boss_score !== null && weightConfig.boss_weight > 0) {
          finalScore += participant.boss_score * weightConfig.boss_weight;
        }
        
        // 保留两位小数
        const roundedFinalScore = Math.round(finalScore * 100) / 100;
        
        // 更新最终分数
        await queryRunner.manager.update(AssessmentParticipant, participantId, {
          final_score: roundedFinalScore,
        });
        
        // 记录日志：根据是否包含boss评分显示不同信息
        if (weightConfig.boss_enabled && participant.boss_score !== null) {
          console.log(`✅ 三维度评分计算完成 - 参与者ID: ${participantId}, 自评: ${participant.self_score}(${weightConfig.self_weight}), 领导: ${participant.leader_score}(${weightConfig.leader_weight}), 上级: ${participant.boss_score}(${weightConfig.boss_weight}), 最终: ${roundedFinalScore}`);
        } else {
          console.log(`✅ 双维度评分计算完成 - 参与者ID: ${participantId}, 自评: ${participant.self_score}(${weightConfig.self_weight}), 领导: ${participant.leader_score}(${weightConfig.leader_weight}), 最终: ${roundedFinalScore}`);
        }
        
        // 检查是否所有参与者都已完成评分，如果是则自动结束考核
        await this.checkAndAutoEndAssessment(queryRunner, participant.assessment.id);
      } else {
        // 记录等待状态
        const waitingFor = [];
        if (!selfCompleted) waitingFor.push('自评');
        if (!leaderCompleted) waitingFor.push('领导评分');
        if (bossRequired && !bossCompleted) waitingFor.push('上级评分');
        
        console.log(`⏳ 等待评分完成 - 参与者ID: ${participantId}, 待完成: ${waitingFor.join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ 计算最终分数失败 - 参与者ID: ${participantId}`, error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 获取权重配置，优先使用assessment的template_config
   */
  private async getWeightConfig(assessmentId: number): Promise<{ 
    self_weight: number; 
    leader_weight: number; 
    boss_weight: number;
    boss_enabled: boolean;
  }> {
    try {
      // 获取考核信息，包含模板配置快照
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: assessmentId },
        relations: ['template'],
      });

      if (!assessment) {
        throw new Error('考核不存在');
      }

      let templateConfig: any = null;

      // 优先使用考核的模板配置快照
      if (assessment.template_config) {
        templateConfig = typeof assessment.template_config === 'string' 
          ? JSON.parse(assessment.template_config) 
          : assessment.template_config;
      }
      // 如果没有快照，使用关联的模板配置
      else if (assessment.template?.config) {
        templateConfig = typeof assessment.template.config === 'string' 
          ? JSON.parse(assessment.template.config) 
          : assessment.template.config;
      }

      // 从配置中提取权重
      if (templateConfig?.scoring_rules) {
        const selfWeight = templateConfig.scoring_rules.self_evaluation?.weight_in_final || 0.36;
        const leaderWeight = templateConfig.scoring_rules.leader_evaluation?.weight_in_final || 0.54;
        const bossWeight = templateConfig.scoring_rules.boss_evaluation?.weight_in_final || 0.10;
        const bossEnabled = templateConfig.scoring_rules.boss_evaluation?.enabled !== false;
        
        return {
          self_weight: selfWeight,
          leader_weight: leaderWeight,
          boss_weight: bossWeight,
          boss_enabled: bossEnabled,
        };
      }
    } catch (error) {
      console.warn(`解析权重配置失败 (assessment_id: ${assessmentId}):`, error);
    }

    // 使用默认权重配置 (三维度评分：36% + 54% + 10%)
    return {
      self_weight: 0.36,   // 36%
      leader_weight: 0.54, // 54%
      boss_weight: 0.10,   // 10%
      boss_enabled: true,  // 启用boss评分
    };
  }

  /**
   * 检查是否所有参与者都已完成评分，如果是则自动结束考核
   */
  private async checkAndAutoEndAssessment(queryRunner: any, assessmentId: number): Promise<void> {
    try {
      // 获取考核信息
      const assessment = await queryRunner.manager.findOne(Assessment, {
        where: { id: assessmentId },
      });

      if (!assessment || assessment.status !== 'active') {
        return; // 只有处于活跃状态的考核才会自动结束
      }

      // 获取该考核的所有参与者
      const participants = await queryRunner.manager.find(AssessmentParticipant, {
        where: {
          assessment: { id: assessmentId },
          deleted_at: null,
        },
      });

      if (participants.length === 0) {
        return; // 没有参与者则不需要结束
      }

      // 检查是否所有参与者都已完成评分
      const allCompleted = participants.every(participant => 
        participant.self_completed === 1 && participant.leader_completed === 1
      );

      if (allCompleted) {
        // 自动结束考核
        await queryRunner.manager.update(Assessment, assessmentId, {
          status: 'completed',
          updated_at: new Date(),
        });

        console.log(`🎉 考核自动结束 - 考核ID: ${assessmentId}, 所有 ${participants.length} 名参与者均已完成评分`);
      }
    } catch (error) {
      console.error(`❌ 检查考核完成状态失败 - 考核ID: ${assessmentId}`, error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 获取老板评分任务列表
   * 查找当前用户需要进行boss评分的任务
   */
  private async getBossEvaluationTasks(
    userId: number,
    assessmentId?: number
  ): Promise<EvaluationTaskDto[]> {
    const tasks: EvaluationTaskDto[] = [];

    // 查找所有当前用户作为evaluator且类型为BOSS的评估记录
    const whereCondition: any = {
      evaluator: { id: userId },
      type: EvaluationType.BOSS,
    };

    if (assessmentId) {
      whereCondition.assessment = { id: assessmentId };
    }

    const bossEvaluations = await this.evaluationsRepository.find({
      where: whereCondition,
      relations: [
        'assessment',
        'evaluatee',
        'evaluatee.department',
        'evaluatee.leader'
      ],
    });

    for (const evaluation of bossEvaluations) {
      // 只处理进行中的考核
      if (evaluation.assessment.status !== 'active') {
        continue;
      }

      // 确定任务状态
      let status: "pending" | "in_progress" | "completed" = "pending";
      if (evaluation.status === EvaluationStatus.SUBMITTED) {
        status = "completed";
      } else if (evaluation.status === EvaluationStatus.DRAFT && 
                 (evaluation.score !== null || evaluation.feedback)) {
        status = "in_progress";
      }

      const now = new Date();
      const deadline = new Date(evaluation.assessment.deadline);

      // 检查日期有效性
      if (isNaN(deadline.getTime())) {
        console.warn(
          `Invalid deadline for assessment ${evaluation.assessment.id}: ${evaluation.assessment.deadline}`
        );
        continue;
      }

      const task = {
        id: `boss-${evaluation.assessment.id}-${evaluation.evaluatee.id}`,
        assessment_id: evaluation.assessment.id,
        assessment_title: evaluation.assessment.title,
        assessment_period: evaluation.assessment.period,
        type: "boss" as const,
        evaluatee_id: evaluation.evaluatee.id,
        evaluatee_name: evaluation.evaluatee.name,
        evaluatee_department: evaluation.evaluatee.department?.name || "",
        status,
        deadline,
        is_overdue: now > deadline && status !== "completed",
        evaluation_id: evaluation.id,
        last_updated: evaluation.updated_at,
        // 额外信息：显示被评估人的直属领导
        evaluatee_leader_name: evaluation.evaluatee.leader?.name || "未知",
      };

      tasks.push(task);
    }

    return tasks;
  }
}
