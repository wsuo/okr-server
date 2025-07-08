import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { Assessment } from '../../entities/assessment.entity';
import { AssessmentParticipant } from '../../entities/assessment-participant.entity';
import { User } from '../../entities/user.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { QueryAssessmentsDto } from './dto/query-assessments.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async findAll(query: QueryAssessmentsDto) {
    const { page = 1, limit = 10, status, period, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.assessmentsRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.creator', 'creator')
      .leftJoinAndSelect('assessment.template', 'template')
      .leftJoin('assessment.participants', 'participants')
      .addSelect([
        'COUNT(participants.id) as total_participants',
        'SUM(CASE WHEN participants.self_completed = 1 THEN 1 ELSE 0 END) as self_completed_count',
        'SUM(CASE WHEN participants.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed_count',
        'SUM(CASE WHEN participants.self_completed = 1 AND participants.leader_completed = 1 THEN 1 ELSE 0 END) as fully_completed_count'
      ])
      .where('assessment.deleted_at IS NULL');

    if (status) {
      queryBuilder.andWhere('assessment.status = :status', { status });
    }

    if (period) {
      queryBuilder.andWhere('assessment.period = :period', { period });
    }

    if (search) {
      queryBuilder.andWhere('assessment.title LIKE :search', { search: `%${search}%` });
    }

    queryBuilder
      .groupBy('assessment.id')
      .orderBy('assessment.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      this.assessmentsRepository.count({
        where: {
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
          completion_rate: raw.total_participants > 0 
            ? ((parseInt(raw.fully_completed_count) || 0) / parseInt(raw.total_participants) * 100)
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

  async findOne(id: number): Promise<Assessment> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id },
      relations: ['creator', 'template', 'participants', 'participants.user', 'participants.user.department'],
    });

    if (!assessment) {
      throw new NotFoundException(`考核 ID ${id} 不存在`);
    }

    // 计算统计信息
    const participants = assessment.participants || [];
    const statistics = {
      total_participants: participants.length,
      self_completed_count: participants.filter(p => p.self_completed === 1).length,
      leader_completed_count: participants.filter(p => p.leader_completed === 1).length,
      fully_completed_count: participants.filter(p => p.self_completed === 1 && p.leader_completed === 1).length,
      average_score: 0,
      highest_score: 0,
      lowest_score: 0,
    };

    const completedScores = participants
      .filter(p => p.final_score !== null)
      .map(p => p.final_score);

    if (completedScores.length > 0) {
      statistics.average_score = completedScores.reduce((a, b) => a + b, 0) / completedScores.length;
      statistics.highest_score = Math.max(...completedScores);
      statistics.lowest_score = Math.min(...completedScores);
    }

    return {
      ...assessment,
      statistics,
    } as any;
  }

  async create(createAssessmentDto: CreateAssessmentDto, createdBy: number): Promise<Assessment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 检查周期是否已存在
      const existingAssessment = await this.assessmentsRepository.findOne({
        where: { period: createAssessmentDto.period },
      });

      if (existingAssessment) {
        throw new BadRequestException(`考核周期 ${createAssessmentDto.period} 已存在`);
      }

      // 创建考核
      const assessment = this.assessmentsRepository.create({
        ...createAssessmentDto,
        creator: { id: createdBy } as User,
        status: 'draft',
      });

      const savedAssessment = await queryRunner.manager.save(assessment);

      // 验证参与者是否存在
      const users = await this.usersRepository.findByIds(createAssessmentDto.participant_ids);
      if (users.length !== createAssessmentDto.participant_ids.length) {
        throw new BadRequestException('部分参与者用户不存在');
      }

      // 创建参与者记录
      const participants = createAssessmentDto.participant_ids.map(userId => 
        this.participantsRepository.create({
          assessment: savedAssessment,
          user: { id: userId } as User,
        })
      );

      await queryRunner.manager.save(participants);
      await queryRunner.commitTransaction();

      return this.findOne(savedAssessment.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, updateAssessmentDto: UpdateAssessmentDto): Promise<Assessment> {
    const assessment = await this.findOne(id);

    // 检查状态变更的合法性
    if (updateAssessmentDto.status && updateAssessmentDto.status !== assessment.status) {
      this.validateStatusTransition(assessment.status, updateAssessmentDto.status);
    }

    await this.assessmentsRepository.update(id, updateAssessmentDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const assessment = await this.findOne(id);
    
    if (assessment.status === 'active') {
      throw new BadRequestException('无法删除进行中的考核');
    }

    await this.assessmentsRepository.softDelete(id);
  }

  async endAssessment(id: number): Promise<Assessment> {
    const assessment = await this.findOne(id);
    
    if (assessment.status !== 'active') {
      throw new BadRequestException('只能结束进行中的考核');
    }

    // 计算所有参与者的最终得分
    const participants = await this.participantsRepository.find({
      where: { assessment: { id } },
    });

    for (const participant of participants) {
      if (participant.self_score !== null && participant.leader_score !== null) {
        // 简单的加权平均：自评30%，领导评分70%
        participant.final_score = participant.self_score * 0.3 + participant.leader_score * 0.7;
        await this.participantsRepository.save(participant);
      }
    }

    await this.assessmentsRepository.update(id, { status: 'completed' });
    return this.findOne(id);
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions = {
      draft: ['active'],
      active: ['completed', 'ended'],
      completed: ['ended'],
      ended: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`无法从状态 "${currentStatus}" 转换到 "${newStatus}"`);
    }
  }
}