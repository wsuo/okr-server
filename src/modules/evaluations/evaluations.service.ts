import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Evaluation } from '../../entities/evaluation.entity';
import { Assessment } from '../../entities/assessment.entity';
import { AssessmentParticipant } from '../../entities/assessment-participant.entity';
import { User } from '../../entities/user.entity';
import { CreateSelfEvaluationDto } from './dto/create-self-evaluation.dto';
import { CreateLeaderEvaluationDto } from './dto/create-leader-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';

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
    private dataSource: DataSource,
  ) {}

  async findAll(query: QueryEvaluationsDto) {
    const { page = 1, limit = 10, assessment_id, evaluatee_id, evaluator_id, type, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.evaluationsRepository
      .createQueryBuilder('evaluation')
      .leftJoinAndSelect('evaluation.assessment', 'assessment')
      .leftJoinAndSelect('evaluation.evaluator', 'evaluator')
      .leftJoinAndSelect('evaluation.evaluatee', 'evaluatee')
      .leftJoinAndSelect('evaluatee.department', 'department');

    if (assessment_id) {
      queryBuilder.andWhere('evaluation.assessment_id = :assessment_id', { assessment_id });
    }

    if (evaluatee_id) {
      queryBuilder.andWhere('evaluation.evaluatee_id = :evaluatee_id', { evaluatee_id });
    }

    if (evaluator_id) {
      queryBuilder.andWhere('evaluation.evaluator_id = :evaluator_id', { evaluator_id });
    }

    if (type) {
      queryBuilder.andWhere('evaluation.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('evaluation.status = :status', { status });
    }

    queryBuilder
      .orderBy('evaluation.created_at', 'DESC')
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
      relations: ['assessment', 'evaluator', 'evaluatee', 'evaluatee.department'],
    });

    if (!evaluation) {
      throw new NotFoundException(`评估记录 ID ${id} 不存在`);
    }

    return evaluation;
  }

  async createSelfEvaluation(createSelfEvaluationDto: CreateSelfEvaluationDto, evaluatorId: number): Promise<Evaluation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核是否存在且为进行中状态
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createSelfEvaluationDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException('考核不存在');
      }
      if (assessment.status !== 'active') {
        throw new BadRequestException('只能为进行中的考核提交评估');
      }

      // 验证用户是否参与了该考核
      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: createSelfEvaluationDto.assessment_id },
          user: { id: evaluatorId },
        },
      });
      if (!participant) {
        throw new BadRequestException('您未参与此考核');
      }

      // 检查是否已提交过自评
      const existingEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: createSelfEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: evaluatorId },
          type: 'self',
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === 'submitted') {
          throw new BadRequestException('已提交过自评，无法重复提交');
        }
        // 更新现有的草稿
        await this.evaluationsRepository.update(existingEvaluation.id, {
          ...createSelfEvaluationDto,
          status: 'submitted',
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
        type: 'self',
        score: createSelfEvaluationDto.score,
        feedback: createSelfEvaluationDto.feedback,
        strengths: createSelfEvaluationDto.strengths,
        improvements: createSelfEvaluationDto.improvements,
        status: 'submitted',
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

  async createLeaderEvaluation(createLeaderEvaluationDto: CreateLeaderEvaluationDto, evaluatorId: number): Promise<Evaluation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证考核是否存在且为进行中状态
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createLeaderEvaluationDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException('考核不存在');
      }
      if (assessment.status !== 'active') {
        throw new BadRequestException('只能为进行中的考核提交评估');
      }

      // 验证被评估人是否参与了该考核
      const participant = await this.participantsRepository.findOne({
        where: {
          assessment: { id: createLeaderEvaluationDto.assessment_id },
          user: { id: createLeaderEvaluationDto.evaluatee_id },
        },
      });
      if (!participant) {
        throw new BadRequestException('被评估人未参与此考核');
      }

      // 验证评估人是否为被评估人的直属领导
      const evaluatee = await this.usersRepository.findOne({
        where: { id: createLeaderEvaluationDto.evaluatee_id },
        relations: ['leader'],
      });
      if (!evaluatee || evaluatee.leader?.id !== evaluatorId) {
        throw new BadRequestException('您不是该员工的直属领导');
      }

      // 检查是否已提交过对该员工的评分
      const existingEvaluation = await this.evaluationsRepository.findOne({
        where: {
          assessment: { id: createLeaderEvaluationDto.assessment_id },
          evaluator: { id: evaluatorId },
          evaluatee: { id: createLeaderEvaluationDto.evaluatee_id },
          type: 'leader',
        },
      });

      if (existingEvaluation) {
        if (existingEvaluation.status === 'submitted') {
          throw new BadRequestException('已提交过对该员工的评分，无法重复提交');
        }
        // 更新现有的草稿
        await this.evaluationsRepository.update(existingEvaluation.id, {
          ...createLeaderEvaluationDto,
          status: 'submitted',
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
        type: 'leader',
        score: createLeaderEvaluationDto.score,
        feedback: createLeaderEvaluationDto.feedback,
        strengths: createLeaderEvaluationDto.strengths,
        improvements: createLeaderEvaluationDto.improvements,
        status: 'submitted',
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

  async update(id: number, updateEvaluationDto: UpdateEvaluationDto): Promise<Evaluation> {
    const evaluation = await this.findOne(id);

    if (evaluation.status === 'submitted') {
      throw new BadRequestException('已提交的评估无法修改');
    }

    await this.evaluationsRepository.update(id, updateEvaluationDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const evaluation = await this.findOne(id);

    if (evaluation.status === 'submitted') {
      throw new BadRequestException('已提交的评估无法删除');
    }

    await this.evaluationsRepository.remove(evaluation);
  }

  async getMyEvaluations(userId: number, assessmentId?: number) {
    const where: any = { 
      evaluatee: { id: userId } 
    };
    if (assessmentId) {
      where.assessment = { id: assessmentId };
    }

    return this.evaluationsRepository.find({
      where,
      relations: ['assessment', 'evaluator'],
      order: { created_at: 'DESC' },
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
      evaluatee: { id: subordinates.map(s => s.id) },
      evaluator: { id: userId },
      type: 'leader',
    };
    if (assessmentId) {
      where.assessment = { id: assessmentId };
    }

    return this.evaluationsRepository.find({
      where,
      relations: ['assessment', 'evaluatee', 'evaluatee.department'],
      order: { created_at: 'DESC' },
    });
  }
}