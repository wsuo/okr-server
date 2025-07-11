import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";

import { User } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { Department } from "../../entities/department.entity";
import { Assessment } from "../../entities/assessment.entity";
import { AssessmentParticipant } from "../../entities/assessment-participant.entity";
import { Evaluation } from "../../entities/evaluation.entity";
import { BcryptUtil } from "../../common/utils/bcrypt.util";
import {
  PaginationUtil,
  PaginatedResult,
} from "../../common/utils/pagination.util";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { TeamMemberDto, TeamMembersResponseDto } from "./dto/team-member.dto";
import { EvaluationStatsQueryDto, EvaluationStatsResponseDto, ScoreHistoryDto, TrendAnalysisDto, EvaluationStatisticsDto } from "./dto/evaluation-stats.dto";
import { AssessmentsHistoryQueryDto, AssessmentsHistoryResponseDto, AssessmentHistoryItemDto, EvaluationInfoDto, AssessmentHistorySummaryDto, PaginationDto } from "./dto/assessments-history.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private assessmentParticipantRepository: Repository<AssessmentParticipant>,
    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.usersRepository.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUser) {
      throw new ConflictException("用户名已存在");
    }

    // 检查邮箱是否已存在
    if (createUserDto.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: createUserDto.email },
      });
      if (existingEmail) {
        throw new ConflictException("邮箱已存在");
      }
    }

    // 加密密码
    const hashedPassword = await BcryptUtil.hash(createUserDto.password);

    // 获取角色
    const roles = await this.rolesRepository.findByIds(createUserDto.role_ids);

    // 创建用户
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      roles,
    });

    return this.usersRepository.save(user);
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, department_id, role, search } = query;
    const skip = PaginationUtil.getSkip(page, limit);

    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.department", "department")
      .leftJoinAndSelect("user.roles", "roles")
      .leftJoinAndSelect("user.leader", "leader")
      .where("user.deleted_at IS NULL");

    if (department_id) {
      queryBuilder.andWhere("user.department_id = :department_id", {
        department_id,
      });
    }

    if (role) {
      queryBuilder.andWhere("roles.code = :role", { role });
    }

    if (search) {
      queryBuilder.andWhere(
        "(user.name LIKE :search OR user.username LIKE :search OR user.email LIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [items, total] = await queryBuilder
      .orderBy("user.created_at", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return PaginationUtil.paginate(items, total, query);
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ["department", "roles", "leader", "subordinates"],
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // 检查邮箱是否已存在
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingEmail) {
        throw new ConflictException("邮箱已存在");
      }
    }

    // 更新角色
    if (updateUserDto.role_ids) {
      const roles = await this.rolesRepository.findByIds(
        updateUserDto.role_ids
      );
      user.roles = roles;
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.softDelete(id);
  }

  async resetPassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await BcryptUtil.hash(newPassword);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async toggleStatus(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.status = user.status === 1 ? 0 : 1;
    return this.usersRepository.save(user);
  }

  async getLeaders(): Promise<{ data: User[] }> {
    const leaders = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.department", "department")
      .leftJoinAndSelect("user.roles", "roles")
      .where("user.deleted_at IS NULL")
      .andWhere("user.status = 1")
      .andWhere("roles.code IN (:...codes)", { codes: ["leader", "boss"] })
      .orderBy("user.created_at", "ASC")
      .getMany();

    return { data: leaders };
  }

  async getTeamMembers(leaderId: number): Promise<TeamMembersResponseDto> {
    // 获取该领导的所有下属
    const subordinates = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.department", "department")
      .where("user.deleted_at IS NULL")
      .andWhere("user.status = 1")
      .andWhere("user.leader_id = :leaderId", { leaderId })
      .orderBy("user.name", "ASC")
      .getMany();

    const teamMembers: TeamMemberDto[] = [];
    let activeAssessmentsCount = 0;
    let selfCompletedCount = 0;
    let leaderCompletedCount = 0;

    for (const subordinate of subordinates) {
      // 查找该员工的最新考核信息（优先active状态，然后是最近的）
      const activeAssessment = await this.assessmentRepository
        .createQueryBuilder("assessment")
        .innerJoin("assessment.participants", "participant")
        .where("participant.user_id = :userId", { userId: subordinate.id })
        .andWhere("assessment.deleted_at IS NULL")
        .andWhere("assessment.status = :status", { status: "active" })
        .orderBy("assessment.created_at", "DESC")
        .getOne();

      let latestAssessment = activeAssessment;
      let hasActiveAssessment = !!activeAssessment;
      
      // 如果没有活跃的考核，查找最近的历史考核
      if (!latestAssessment) {
        latestAssessment = await this.assessmentRepository
          .createQueryBuilder("assessment")
          .innerJoin("assessment.participants", "participant")
          .where("participant.user_id = :userId", { userId: subordinate.id })
          .andWhere("assessment.deleted_at IS NULL")
          .orderBy("assessment.created_at", "DESC")
          .getOne();
      }

      let participant: AssessmentParticipant | null = null;
      if (latestAssessment) {
        // 获取该员工在此考核中的参与记录
        participant = await this.assessmentParticipantRepository
          .createQueryBuilder("participant")
          .where("participant.user_id = :userId", { userId: subordinate.id })
          .andWhere("participant.assessment_id = :assessmentId", { 
            assessmentId: latestAssessment.id 
          })
          .andWhere("participant.deleted_at IS NULL")
          .getOne();
      }

      // 构建团队成员数据
      const teamMember: TeamMemberDto = {
        user_id: subordinate.id,
        user_name: subordinate.name,
        email: subordinate.email || '',
        department: subordinate.department?.name || '',
        position: subordinate.position || '',
        has_active_assessment: hasActiveAssessment,
        is_historical: !hasActiveAssessment && !!latestAssessment,
        last_updated: participant?.updated_at || subordinate.updated_at,
      };

      if (latestAssessment) {
        teamMember.current_assessment = {
          assessment_id: latestAssessment.id,
          assessment_title: latestAssessment.title,
          status: latestAssessment.status,
          start_date: latestAssessment.start_date,
          end_date: latestAssessment.end_date,
          period: latestAssessment.period,
        };

        if (participant) {
          teamMember.evaluation_status = {
            self_completed: participant.self_completed === 1,
            leader_completed: participant.leader_completed === 1,
            self_completed_at: participant.self_submitted_at,
            leader_completed_at: participant.leader_submitted_at,
            final_score: participant.final_score,
            self_score: participant.self_score,
            leader_score: participant.leader_score,
          };

          // 统计计数
          if (hasActiveAssessment) {
            activeAssessmentsCount++;
            if (participant.self_completed === 1) {
              selfCompletedCount++;
            }
            if (participant.leader_completed === 1) {
              leaderCompletedCount++;
            }
          }
        } else {
          // 如果没有参与记录，创建默认状态
          teamMember.evaluation_status = {
            self_completed: false,
            leader_completed: false,
          };
        }
      }

      teamMembers.push(teamMember);
    }

    return {
      members: teamMembers,
      total_members: subordinates.length,
      active_assessments_count: activeAssessmentsCount,
      self_completed_count: selfCompletedCount,
      leader_completed_count: leaderCompletedCount,
    };
  }

  async getEvaluationStats(userId: number, query: EvaluationStatsQueryDto): Promise<EvaluationStatsResponseDto> {
    // 获取用户信息
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取用户所有的考核参与记录
    let participantsQuery = this.assessmentParticipantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.assessment', 'assessment')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.deleted_at IS NULL')
      .andWhere('assessment.deleted_at IS NULL');

    // 根据周期过滤
    if (query.period && query.period !== 'all') {
      if (query.period === 'recent_6') {
        participantsQuery = participantsQuery
          .orderBy('assessment.created_at', 'DESC')
          .limit(6);
      } else if (query.period.startsWith('year_')) {
        const year = query.period.replace('year_', '');
        participantsQuery = participantsQuery
          .andWhere('YEAR(assessment.start_date) = :year', { year });
      }
    }

    const participants = await participantsQuery.getMany();

    const totalAssessments = participants.length;
    const completedParticipants = participants.filter(p => 
      p.self_completed === 1 && p.leader_completed === 1 && p.final_score !== null
    );
    const completedAssessments = completedParticipants.length;
    const completionRate = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;

    // 计算分数统计
    const finalScores = completedParticipants
      .map(p => parseFloat(p.final_score?.toString() || '0'))
      .filter(score => score > 0);

    const averageScore = finalScores.length > 0 
      ? finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length 
      : 0;

    const latestScore = finalScores.length > 0 ? finalScores[0] : undefined;
    const highestScore = finalScores.length > 0 ? Math.max(...finalScores) : undefined;
    const lowestScore = finalScores.length > 0 ? Math.min(...finalScores) : undefined;

    // 计算趋势
    let scoreTrend = 'stable';
    let scoreImprovement = 0;
    if (finalScores.length >= 2) {
      const recent = finalScores[0];
      const previous = finalScores[1];
      scoreImprovement = recent - previous;
      scoreTrend = scoreImprovement > 2 ? 'up' : scoreImprovement < -2 ? 'down' : 'stable';
    }

    // 构建分数历史
    const scoreHistory: ScoreHistoryDto[] = completedParticipants
      .slice(0, 10) // 最多返回10条历史记录
      .map(participant => ({
        assessment_id: participant.assessment.id,
        assessment_title: participant.assessment.title,
        final_score: parseFloat(participant.final_score?.toString() || '0'),
        self_score: parseFloat(participant.self_score?.toString() || '0'),
        leader_score: parseFloat(participant.leader_score?.toString() || '0'),
        completed_at: participant.leader_submitted_at || participant.self_submitted_at,
        period: participant.assessment.period,
      }));

    // 计算自评和领导评分的统计
    const selfScores = completedParticipants
      .map(p => parseFloat(p.self_score?.toString() || '0'))
      .filter(score => score > 0);
    const leaderScores = completedParticipants
      .map(p => parseFloat(p.leader_score?.toString() || '0'))
      .filter(score => score > 0);

    const avgSelfScore = selfScores.length > 0 
      ? selfScores.reduce((sum, score) => sum + score, 0) / selfScores.length 
      : 0;
    const avgLeaderScore = leaderScores.length > 0 
      ? leaderScores.reduce((sum, score) => sum + score, 0) / leaderScores.length 
      : 0;

    const statistics: EvaluationStatisticsDto = {
      avg_self_score: Math.round(avgSelfScore * 100) / 100,
      avg_leader_score: Math.round(avgLeaderScore * 100) / 100,
      self_leader_difference: Math.round((avgSelfScore - avgLeaderScore) * 100) / 100,
      last_updated: completedParticipants[0]?.updated_at || new Date(),
    };

    // 趋势分析
    let trendAnalysis: TrendAnalysisDto | undefined;
    if (query.include_trend) {
      const recentScores = finalScores.slice(0, 6);
      let trend = 'stable';
      let improvement = 0;
      let consistency = 'stable';

      if (recentScores.length >= 2) {
        const firstHalf = recentScores.slice(recentScores.length / 2);
        const secondHalf = recentScores.slice(0, recentScores.length / 2);
        const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
        
        improvement = secondAvg - firstAvg;
        trend = improvement > 2 ? 'up' : improvement < -2 ? 'down' : 'stable';

        // 计算一致性
        const variance = recentScores.reduce((sum, score) => {
          return sum + Math.pow(score - averageScore, 2);
        }, 0) / recentScores.length;
        consistency = variance < 25 ? 'stable' : 'volatile';
      }

      // 分数分布
      const excellent = finalScores.filter(score => score >= 90).length;
      const good = finalScores.filter(score => score >= 80 && score < 90).length;
      const average = finalScores.filter(score => score >= 70 && score < 80).length;
      const poor = finalScores.filter(score => score < 70).length;

      trendAnalysis = {
        recent_6_months: {
          trend,
          improvement: Math.round(improvement * 100) / 100,
          consistency,
        },
        score_distribution: {
          excellent,
          good,
          average,
          poor,
        },
      };
    }

    // 获取部门排名 (简化实现)
    const departmentUsers = await this.assessmentParticipantRepository
      .createQueryBuilder('participant')
      .leftJoin('participant.user', 'user')
      .leftJoin('participant.assessment', 'assessment')
      .where('user.department_id = :departmentId', { departmentId: user.department?.id })
      .andWhere('participant.final_score IS NOT NULL')
      .andWhere('participant.deleted_at IS NULL')
      .andWhere('assessment.deleted_at IS NULL')
      .getMany();

    const userAvgScore = avgLeaderScore || avgSelfScore || 0;
    const betterThanUser = departmentUsers.filter(p => {
      const score = parseFloat(p.final_score?.toString() || '0');
      return score > userAvgScore;
    }).length;

    return {
      user_id: user.id,
      user_name: user.name,
      department: user.department?.name || '',
      position: user.position || '',
      total_assessments: totalAssessments,
      completed_assessments: completedAssessments,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_score: Math.round(averageScore * 100) / 100,
      latest_score: latestScore ? Math.round(latestScore * 100) / 100 : undefined,
      highest_score: highestScore ? Math.round(highestScore * 100) / 100 : undefined,
      lowest_score: lowestScore ? Math.round(lowestScore * 100) / 100 : undefined,
      score_trend: scoreTrend,
      score_improvement: Math.round(scoreImprovement * 100) / 100,
      rank_in_department: betterThanUser + 1,
      rank_total: departmentUsers.length,
      score_history: scoreHistory,
      trend_analysis: trendAnalysis,
      statistics,
    };
  }

  async getAssessmentsHistory(userId: number, query: AssessmentsHistoryQueryDto): Promise<AssessmentsHistoryResponseDto> {
    // 验证用户存在
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 构建查询
    let queryBuilder = this.assessmentParticipantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.assessment', 'assessment')
      .leftJoinAndSelect('assessment.template', 'template')
      .leftJoin('participant.user', 'user')
      .leftJoin('user.leader', 'leader')
      .where('participant.user_id = :userId', { userId })
      .andWhere('participant.deleted_at IS NULL')
      .andWhere('assessment.deleted_at IS NULL');

    // 状态过滤
    if (query.status && query.status !== 'all') {
      if (query.status === 'completed') {
        queryBuilder = queryBuilder.andWhere('assessment.status = :status', { status: 'completed' });
      } else if (query.status === 'in_progress') {
        queryBuilder = queryBuilder.andWhere('assessment.status = :status', { status: 'active' });
      } else if (query.status === 'pending') {
        queryBuilder = queryBuilder.andWhere('assessment.status = :status', { status: 'draft' });
      }
    }

    // 年份过滤
    if (query.year) {
      queryBuilder = queryBuilder.andWhere('YEAR(assessment.start_date) = :year', { year: query.year });
    }

    // 排序
    if (query.sort === 'start_date_asc') {
      queryBuilder = queryBuilder.orderBy('assessment.start_date', 'ASC');
    } else if (query.sort === 'score_desc') {
      queryBuilder = queryBuilder.orderBy('participant.final_score', 'DESC');
    } else {
      queryBuilder = queryBuilder.orderBy('assessment.start_date', 'DESC');
    }

    // 分页
    const skip = PaginationUtil.getSkip(query.page, query.limit);
    const [participants, total] = await queryBuilder
      .skip(skip)
      .take(query.limit)
      .getManyAndCount();

    // 构建结果
    const items: AssessmentHistoryItemDto[] = [];
    
    for (const participant of participants) {
      const assessment = participant.assessment;
      
      // 计算截止日期相关信息
      const now = new Date();
      const deadline = new Date(assessment.end_date);
      const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysDiff < 0 && assessment.status !== 'completed';

      // 获取领导信息
      const leaderInfo = await this.usersRepository.findOne({
        where: { id: user.leader_id },
        select: ['id', 'name'],
      });

      // 确定最终等级
      let finalLevel: string | undefined;
      if (participant.final_score) {
        const score = parseFloat(participant.final_score.toString());
        if (score >= 90) finalLevel = '优秀';
        else if (score >= 80) finalLevel = '良好';
        else if (score >= 70) finalLevel = '合格';
        else finalLevel = '待改进';
      }

      const item: AssessmentHistoryItemDto = {
        assessment_id: assessment.id,
        assessment_title: assessment.title,
        period: assessment.period,
        status: assessment.status === 'active' ? 'in_progress' : 
                assessment.status === 'completed' ? 'completed' : 'pending',
        start_date: assessment.start_date,
        end_date: assessment.end_date,
        deadline: assessment.end_date,
        created_at: assessment.created_at,
        self_evaluation: {
          completed: participant.self_completed === 1,
          score: participant.self_score ? parseFloat(participant.self_score.toString()) : undefined,
          submitted_at: participant.self_submitted_at,
          last_updated: participant.self_submitted_at,
        },
        leader_evaluation: {
          completed: participant.leader_completed === 1,
          score: participant.leader_score ? parseFloat(participant.leader_score.toString()) : undefined,
          leader_id: leaderInfo?.id,
          leader_name: leaderInfo?.name,
          submitted_at: participant.leader_submitted_at,
          last_updated: participant.leader_submitted_at,
        },
        final_score: participant.final_score ? parseFloat(participant.final_score.toString()) : undefined,
        final_level: finalLevel,
        weight_config: {
          self_weight: 30, // 默认权重，可以从模板配置中获取
          leader_weight: 70,
        },
        is_overdue: isOverdue,
        days_to_deadline: daysDiff,
        template_id: assessment.template?.id || 1,
        template_name: assessment.template?.name || '标准绩效考核模板',
      };

      items.push(item);
    }

    // 统计信息
    const allParticipants = await queryBuilder.getMany();
    const completedCount = allParticipants.filter(p => 
      p.self_completed === 1 && p.leader_completed === 1
    ).length;
    const inProgressCount = allParticipants.filter(p => 
      p.assessment.status === 'active'
    ).length;
    const pendingCount = allParticipants.filter(p => 
      p.assessment.status === 'draft'
    ).length;

    const completedScores = allParticipants
      .filter(p => p.final_score)
      .map(p => parseFloat(p.final_score.toString()));
    const averageFinalScore = completedScores.length > 0 
      ? completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length 
      : 0;

    const summary: AssessmentHistorySummaryDto = {
      total_assessments: total,
      completed_count: completedCount,
      in_progress_count: inProgressCount,
      pending_count: pendingCount,
      average_final_score: Math.round(averageFinalScore * 100) / 100,
      completion_rate: total > 0 ? Math.round((completedCount / total) * 10000) / 100 : 0,
    };

    const pagination: PaginationDto = {
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
      has_next: query.page * query.limit < total,
      has_prev: query.page > 1,
    };

    return {
      items,
      pagination,
      summary,
    };
  }
}
