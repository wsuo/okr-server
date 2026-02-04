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
import { Template } from "../../entities/template.entity";
import { Okr } from "../../entities/okr.entity";
import { Evaluation } from "../../entities/evaluation.entity";
import { EvaluationType, EvaluationStatus } from "../../common/enums/evaluation.enum";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";
import { EditAssessmentDto } from "./dto/edit-assessment.dto";
import { QueryAssessmentsDto } from "./dto/query-assessments.dto";
import { ScoreCalculationService } from "./services/score-calculation.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    private dataSource: DataSource,
    private scoreCalculationService: ScoreCalculationService,
    private mailService: MailService
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
        "SUM(CASE WHEN participants.boss_completed = 1 THEN 1 ELSE 0 END) as boss_completed_count",
        "SUM(CASE WHEN participants.self_completed = 1 AND participants.leader_completed = 1 THEN 1 ELSE 0 END) as fully_completed_two_count",
        "SUM(CASE WHEN participants.self_completed = 1 AND participants.leader_completed = 1 AND participants.boss_completed = 1 THEN 1 ELSE 0 END) as fully_completed_three_count",
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
      .addGroupBy("assessment.created_at")
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
      const { bossRequired } = this.getBossRequirementFromAssessment(assessment);
      const fullyCompletedCount = bossRequired
        ? parseInt(raw.fully_completed_three_count) || 0
        : parseInt(raw.fully_completed_two_count) || 0;

      return {
        ...assessment,
        statistics: {
          total_participants: parseInt(raw.total_participants) || 0,
          self_completed_count: parseInt(raw.self_completed_count) || 0,
          leader_completed_count: parseInt(raw.leader_completed_count) || 0,
          boss_completed_count: parseInt(raw.boss_completed_count) || 0,
          fully_completed_count: fullyCompletedCount,
          completion_rate:
            raw.total_participants > 0
              ? (fullyCompletedCount / parseInt(raw.total_participants)) *
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

    const { bossRequired } = this.getBossRequirementFromAssessment(assessment);

    // 计算统计信息
    const statistics = {
      total_participants: participants.length,
      self_completed_count: participants.filter((p) => p.self_completed === 1)
        .length,
      leader_completed_count: participants.filter(
        (p) => p.leader_completed === 1
      ).length,
      boss_completed_count: participants.filter(
        (p) => p.boss_completed === 1
      ).length,
      fully_completed_count: participants.filter(
        (p) =>
          bossRequired
            ? p.self_completed === 1 && p.leader_completed === 1 && p.boss_completed === 1
            : p.self_completed === 1 && p.leader_completed === 1
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
        boss_completed: p.boss_completed,
        self_score: p.self_score,
        leader_score: p.leader_score,
        boss_score: p.boss_score,
        final_score: p.final_score,
        self_submitted_at: p.self_submitted_at,
        leader_submitted_at: p.leader_submitted_at,
        boss_submitted_at: p.boss_submitted_at,
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

      // 验证模板是否存在（如果提供了template_id）
      let template = null;
      if (createAssessmentDto.template_id) {
        template = await this.templatesRepository.findOne({
          where: { id: createAssessmentDto.template_id, deleted_at: null },
        });
        if (!template) {
          throw new BadRequestException("指定的模板不存在");
        }
      }

      // 创建考核
      const assessment = this.assessmentsRepository.create({
        title: createAssessmentDto.title,
        period: createAssessmentDto.period,
        description: createAssessmentDto.description,
        start_date: createAssessmentDto.start_date,
        end_date: createAssessmentDto.end_date,
        deadline: createAssessmentDto.deadline,
        creator: { id: createdBy } as User,
        template: template, // 建立模板关联
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

  async getAssessmentStatus(id: number) {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id, deleted_at: null },
      relations: ["participants"],
    });

    if (!assessment) {
      throw new NotFoundException("考核不存在");
    }

    // 获取参与者信息（过滤软删除）
    const participants = await this.participantsRepository.find({
      where: { 
        assessment: { id },
        deleted_at: null 
      },
    });

    // 检查是否所有参与者都已完成评分
    const allCompleted = participants.length > 0 && participants.every(p => 
      p.self_completed === 1 && p.leader_completed === 1
    );

    // 如果所有参与者都完成了评分且考核状态仍为active，自动结束考核
    if (allCompleted && assessment.status === 'active') {
      await this.assessmentsRepository.update(id, {
        status: 'completed',
        updated_at: new Date(),
      });
      
      console.log(`🎉 考核自动结束 - 考核ID: ${id}, 所有 ${participants.length} 名参与者均已完成评分`);
      
      // 更新本地对象状态以返回正确的状态
      assessment.status = 'completed';
    }

    // 判断是否可以进行评分操作
    const canEvaluate = assessment.status === 'active';
    const isEnded = assessment.status === 'completed' || assessment.status === 'ended';

    // 生成状态描述信息
    let message = '';
    switch (assessment.status) {
      case 'draft':
        message = '考核尚未发布';
        break;
      case 'active':
        message = '考核正在进行中';
        break;
      case 'completed':
        if (allCompleted) {
          message = '考核已结束，所有参与者已完成评分';
        } else {
          message = '考核已手动结束';
        }
        break;
      case 'ended':
        message = '考核已结束';
        break;
      default:
        message = `考核状态：${assessment.status}`;
    }

    return {
      canEvaluate,
      status: assessment.status,
      isEnded,
      message,
    };
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

    Object.assign(assessment, updateAssessmentDto);
    await this.assessmentsRepository.save(assessment);
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
      // 从editData中移除不属于实体的字段，避免TypeORM处理不认识的字段
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { participant_ids, ...updateData } = editData;
      const assessmentToUpdate = await this.assessmentsRepository.findOne({ where: { id } });
      if (assessmentToUpdate) {
        Object.assign(assessmentToUpdate, updateData);
        await this.assessmentsRepository.save(assessmentToUpdate);
      }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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
      const fullAssessment = await queryRunner.manager.findOne(Assessment, {
        where: { id },
        relations: ["template", "participants", "participants.user"],
      });

      if (!fullAssessment || !fullAssessment.template) {
        throw new BadRequestException("考核模板信息不完整，无法发布");
      }

      // 创建模板配置快照并更新状态为active
      fullAssessment.status = "active";
      fullAssessment.template_config = fullAssessment.template.config;

      // 验证模板配置快照是否成功保存，防止NULL值
      if (!fullAssessment.template_config) {
        throw new BadRequestException(
          "模板配置无法读取，无法发布考核。请检查模板配置是否完整。"
        );
      }

      // 验证模板配置中的scoring_rules字段
      try {
        const configData = typeof fullAssessment.template_config === "string"
          ? JSON.parse(fullAssessment.template_config)
          : fullAssessment.template_config;

        if (!configData.scoring_rules) {
          throw new BadRequestException(
            "模板配置中缺少scoring_rules字段，无法发布考核。"
          );
        }
      } catch (error) {
        throw new BadRequestException(
          `模板配置解析失败：${error.message}`
        );
      }

      await queryRunner.manager.save(Assessment, fullAssessment);

      // 日志：记录成功保存的模板配置快照
      console.log(
        `✅ 考核${id}已成功保存模板配置快照，scoring_mode: ${
          (typeof fullAssessment.template_config === "string"
            ? JSON.parse(fullAssessment.template_config)
            : fullAssessment.template_config
          ).scoring_rules?.scoring_mode
        }`
      );

      // 为领导参与者创建自评记录
      await this.createLeaderSelfEvaluations(queryRunner, fullAssessment);

      await queryRunner.commitTransaction();

      // 发送邮件通知给所有参与者
      await this.sendAssessmentNotificationEmails(fullAssessment);

      return this.findOne(id, currentUserId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
      const assessToUpdate = await queryRunner.manager.findOne(Assessment, { where: { id } });
      if (assessToUpdate) {
        assessToUpdate.status = "completed";
        await queryRunner.manager.save(Assessment, assessToUpdate);
      }

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
          status: EvaluationStatus.SUBMITTED,
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
   * 为领导参与者创建自评记录
   * 领导的自评分数将同时用作自评和领导评分数
   */
  private async createLeaderSelfEvaluations(
    queryRunner: any,
    assessment: Assessment
  ): Promise<void> {
    // 获取所有参与者信息，包括他们的下属关系
    const participants = await queryRunner.manager.find(AssessmentParticipant, {
      where: { assessment: { id: assessment.id }, deleted_at: null },
      relations: ["user"],
    });

    // 查找哪些参与者是领导（有下属的用户）
    const participantUserIds = participants.map(p => p.user.id);
    const leaders = await queryRunner.manager.find(User, {
      where: { id: In(participantUserIds) },
      relations: ["subordinates"],
    });

    console.log(`[DEBUG] 发布考核 ${assessment.id}，检查 ${participants.length} 个参与者中的领导`);

    // 为每个是领导的参与者创建自评记录
    for (const leader of leaders) {
      // 检查这个用户是否有下属，如果有则认为是领导
      const subordinates = await queryRunner.manager.find(User, {
        where: { leader: { id: leader.id }, deleted_at: null },
      });

      if (subordinates.length > 0) {
        console.log(`[DEBUG] 为领导 ${leader.name}(ID: ${leader.id}) 创建自评记录，该领导有 ${subordinates.length} 个下属`);

        // 检查是否已经存在自评记录
        const existingSelfEvaluation = await queryRunner.manager.findOne(Evaluation, {
          where: {
            assessment: { id: assessment.id },
            evaluatee: { id: leader.id },
            type: EvaluationType.SELF,
          },
        });

        if (!existingSelfEvaluation) {
          // 创建自评记录
          const selfEvaluation = queryRunner.manager.create(Evaluation, {
            assessment: assessment,
            evaluator: { id: leader.id },
            evaluatee: { id: leader.id },
            type: EvaluationType.SELF,
            score: 0,
            status: EvaluationStatus.DRAFT,
          });

          await queryRunner.manager.save(Evaluation, selfEvaluation);
          console.log(`[DEBUG] 已为领导 ${leader.name} 创建自评记录 ID: ${selfEvaluation.id}`);
        } else {
          console.log(`[DEBUG] 领导 ${leader.name} 已存在自评记录，跳过创建`);
        }
      }
    }
  }

  /**
   * 发送考核通知邮件给所有参与者
   */
  private async sendAssessmentNotificationEmails(
    assessment: Assessment
  ): Promise<void> {
    try {
      // 获取所有参与者信息
      const participants = await this.participantsRepository.find({
        where: { assessment: { id: assessment.id }, deleted_at: null },
        relations: ["user"],
      });

      // 准备邮件数据
      const emailRecipients = participants
        .filter(participant => participant.user.email) // 过滤有邮箱的用户
        .map(participant => ({
          email: participant.user.email,
          name: participant.user.name,
        }));

      if (emailRecipients.length === 0) {
        console.log('[INFO] 没有参与者配置邮箱，跳过邮件通知');
        return;
      }

      // 批量发送邮件通知
      await this.mailService.sendBulkAssessmentNotifications(
        emailRecipients,
        {
          assessmentTitle: assessment.title,
          period: assessment.period,
          endDate: assessment.end_date,
          systemUrl: 'http://okr.gerenukagro.com/',
        }
      );

      console.log(`[INFO] 考核 "${assessment.title}" 邮件通知发送完成，共 ${emailRecipients.length} 个接收者`);
    } catch (error) {
      console.error('[ERROR] 发送考核通知邮件失败:', error);
      // 邮件发送失败不影响考核发布流程
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
            status: EvaluationStatus.SUBMITTED,
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
            status: EvaluationStatus.SUBMITTED,
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

    const isAdmin = user?.roles.some(role => role.code === 'admin');
    const isCreator = assessment.creator?.id === userId;

    if (!isAdmin && !isCreator) {
      throw new BadRequestException("没有权限结束此考核");
    }

    // 验证状态转换
    this.validateStatusTransition(assessment.status, "completed");

    // 更新考核状态为已完成
    assessment.status = "completed";
    assessment.updated_at = new Date();
    await this.assessmentsRepository.save(assessment);

    // 获取参与者统计信息
    const participants = await this.participantsRepository.find({
      where: {
        assessment: { id },
        deleted_at: null,
      },
    });

    const { bossRequired } = this.getBossRequirementFromAssessment(assessment as any);
    const completedCount = participants.filter((p) =>
      bossRequired
        ? p.self_completed === 1 && p.leader_completed === 1 && p.boss_completed === 1
        : p.self_completed === 1 && p.leader_completed === 1
    ).length;

    console.log(`📋 考核手动结束 - 考核ID: ${id}, 参与者总数: ${participants.length}, 已完成评分: ${completedCount}`);

    return this.findOne(id);
  }

  /**
   * 一键默认老板评分：
   * - 前置条件：所有参与者都已完成自评 + 领导评
   * - 行为：对未完成 boss 评分的参与者写入 boss 评分（默认 90，可传入），并计算 final_score
   *
   * 设计说明：
   * 1) 为避免“逻辑写死”，final_score 权重从 assessment.template_config（快照）优先读取；
   * 2) 为保证可追溯性，会写入/更新 evaluations(type='boss') 记录；
   * 3) 若所有参与者三维度都完成，且考核仍是 active，则自动置为 completed（与现有自动结束逻辑一致）。
   */
  async applyDefaultBossScore(
    assessmentId: number,
    score: number | undefined,
    operatorUserId: number
  ): Promise<Assessment> {
    const defaultScore = score ?? 90;
    if (defaultScore < 0 || defaultScore > 100) {
      throw new BadRequestException("老板评分必须在 0~100 之间");
    }

    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId, deleted_at: null },
      relations: ["template"],
    });
    if (!assessment) {
      throw new NotFoundException("考核不存在");
    }
    if (assessment.status !== "active" && assessment.status !== "completed") {
      throw new BadRequestException("只能对进行中或已完成的考核进行默认评分");
    }

    const templateConfig = this.getTemplateConfigFromAssessment(assessment);
    const scoringMode = templateConfig?.scoring_rules?.scoring_mode;
    if (scoringMode !== "two_tier_weighted") {
      throw new BadRequestException("当前考核模板未启用两层加权老板评分，不支持一键默认评分");
    }

    const weights = this.getThreeDimWeightsFromTemplateConfig(templateConfig);
    if (weights.boss_weight <= 0) {
      throw new BadRequestException("当前考核老板评分权重为 0，不支持一键默认评分");
    }

    // 确定写入的 evaluator_id：若操作者是 boss 则用自己；否则使用系统中的 boss 账号（避免把评分归到管理员名下）
    const operator = await this.usersRepository.findOne({
      where: { id: operatorUserId, deleted_at: null },
      relations: ["roles"],
    });
    if (!operator) {
      throw new BadRequestException("当前用户不存在或已被禁用");
    }
    const operatorIsBoss = operator.roles?.some((r) => r.code === "boss");
    const evaluatorId = operatorIsBoss
      ? operatorUserId
      : await this.findDefaultBossUserId();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const participants = await queryRunner.manager.find(AssessmentParticipant, {
        where: { assessment: { id: assessmentId }, deleted_at: null },
        relations: ["user"],
      });

      if (participants.length === 0) {
        throw new BadRequestException("该考核没有参与者，无法默认评分");
      }

      const notReady = participants.filter(
        (p) => p.self_completed !== 1 || p.leader_completed !== 1
      );
      if (notReady.length > 0) {
        throw new BadRequestException(
          `仍有 ${notReady.length} 人未完成自评或领导评，不能一键默认评分`
        );
      }

      // 预取已有 boss 评分（用于处理“评分已写入但参与表未同步”等异常情况）
      const existingBossEvals: Array<{
        id: number;
        evaluatee_id: number;
        status: string;
        score: number;
        submitted_at: Date | null;
      }> = await queryRunner.query(
        `
        SELECT id, evaluatee_id, status, score, submitted_at
        FROM evaluations
        WHERE assessment_id = ? AND type = 'boss'
        `,
        [assessmentId]
      );
      const bossEvalMap = new Map<number, (typeof existingBossEvals)[number]>();
      for (const e of existingBossEvals) bossEvalMap.set(e.evaluatee_id, e);

      const now = new Date();

      for (const participant of participants) {
        if (participant.boss_completed === 1) continue;

        const evaluateeId = participant.user.id;
        if (participant.self_score === null || participant.leader_score === null) {
          throw new BadRequestException(
            `参与者 ${participant.user?.name || evaluateeId} 缺少自评或领导评分，无法计算最终得分`
          );
        }
        const existing = bossEvalMap.get(evaluateeId);

        if (existing && existing.status === EvaluationStatus.SUBMITTED) {
          // 同步参与表（不覆写已提交的真实评分）
          await queryRunner.manager.update(AssessmentParticipant, participant.id, {
            boss_completed: 1,
            boss_score: existing.score,
            boss_submitted_at: existing.submitted_at || now,
            final_score: Math.round(
              (Number(participant.self_score) * weights.self_weight +
                Number(participant.leader_score) * weights.leader_weight +
                Number(existing.score) * weights.boss_weight) *
                100
            ) / 100,
          });
          continue;
        }

        // 需要写入/更新默认 boss 评分
        if (existing) {
          // 这里用原生 SQL 更新，避免 TypeORM update 对 relation 字段兼容性不一致
          await queryRunner.query(
            `
            UPDATE evaluations
            SET evaluator_id = ?, score = ?, status = ?, submitted_at = ?, updated_at = ?
            WHERE id = ?
            `,
            [
              evaluatorId,
              defaultScore,
              EvaluationStatus.SUBMITTED,
              now,
              now,
              existing.id,
            ]
          );
        } else {
          const evalEntity = this.evaluationsRepository.create({
            assessment: { id: assessmentId },
            evaluator: { id: evaluatorId },
            evaluatee: { id: evaluateeId },
            type: EvaluationType.BOSS,
            score: defaultScore,
            status: EvaluationStatus.SUBMITTED,
            submitted_at: now,
          });
          await queryRunner.manager.save(evalEntity);
        }

        await queryRunner.manager.update(AssessmentParticipant, participant.id, {
          boss_completed: 1,
          boss_score: defaultScore,
          boss_submitted_at: now,
          final_score: Math.round(
            (Number(participant.self_score) * weights.self_weight +
              Number(participant.leader_score) * weights.leader_weight +
              defaultScore * weights.boss_weight) *
              100
          ) / 100,
        });
      }

      // 若全员已完成三维度，且考核仍 active，则置为 completed（与现有自动结束保持一致）
      const refreshed = await queryRunner.manager.find(AssessmentParticipant, {
        where: { assessment: { id: assessmentId }, deleted_at: null },
      });
      const allDone = refreshed.every(
        (p) => p.self_completed === 1 && p.leader_completed === 1 && p.boss_completed === 1
      );
      if (allDone && assessment.status === "active") {
        await queryRunner.manager.update(Assessment, assessmentId, {
          status: "completed",
          updated_at: now,
        });
      }

      await queryRunner.commitTransaction();
      return this.findOne(assessmentId, operatorUserId);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
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

  private getTemplateConfigFromAssessment(assessment: Assessment): any {
    const raw = (assessment as any).template_config || assessment.template?.config;
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }

  private getBossRequirementFromAssessment(assessment: Assessment): { bossRequired: boolean } {
    try {
      const templateConfig = this.getTemplateConfigFromAssessment(assessment);
      const scoringRules = templateConfig?.scoring_rules;
      if (!scoringRules) return { bossRequired: false };

      // 当前系统的老板评分只在 two_tier_weighted 下生效；其他模式保持“双维度完成率”口径不变。
      if (scoringRules.scoring_mode !== "two_tier_weighted") {
        return { bossRequired: false };
      }

      if (scoringRules.two_tier_config) {
        return { bossRequired: (scoringRules.two_tier_config.boss_weight || 0) > 0 };
      }

      return { bossRequired: false };
    } catch {
      return { bossRequired: false };
    }
  }

  private getThreeDimWeightsFromTemplateConfig(templateConfig: any): {
    self_weight: number;
    leader_weight: number;
    boss_weight: number;
  } {
    const scoringRules = templateConfig?.scoring_rules;
    if (!scoringRules) {
      // 兜底：保持与老逻辑一致（不会启用 boss）
      return { self_weight: 0.4, leader_weight: 0.6, boss_weight: 0 };
    }

    if (scoringRules.scoring_mode === "two_tier_weighted" && scoringRules.two_tier_config) {
      const cfg = scoringRules.two_tier_config;
      const boss = (cfg.boss_weight || 0) / 100;
      const employeeLeader = (cfg.employee_leader_weight || 0) / 100;
      const selfIn = (cfg.self_weight_in_employee_leader || 0) / 100;
      const leaderIn = (cfg.leader_weight_in_employee_leader || 0) / 100;
      return {
        boss_weight: boss,
        self_weight: employeeLeader * selfIn,
        leader_weight: employeeLeader * leaderIn,
      };
    }

    const self = scoringRules.self_evaluation?.weight_in_final || 0.4;
    const leader = scoringRules.leader_evaluation?.weight_in_final || 0.6;
    const boss = scoringRules.boss_evaluation?.weight_in_final || 0;
    const bossEnabled = scoringRules.boss_evaluation?.enabled !== false;
    return {
      self_weight: self,
      leader_weight: leader,
      boss_weight: bossEnabled ? boss : 0,
    };
  }

  private async findDefaultBossUserId(): Promise<number> {
    const boss = await this.usersRepository
      .createQueryBuilder("u")
      .leftJoinAndSelect("u.roles", "r")
      .where("u.deleted_at IS NULL")
      .andWhere("r.code = :code", { code: "boss" })
      .orderBy("u.id", "ASC")
      .getOne();

    if (!boss) {
      throw new BadRequestException("系统中未配置 Boss 账号，无法写入老板评分记录");
    }

    return boss.id;
  }
}
