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
import { BcryptUtil } from "../../common/utils/bcrypt.util";
import {
  PaginationUtil,
  PaginatedResult,
} from "../../common/utils/pagination.util";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { TeamMemberDto, TeamMembersResponseDto } from "./dto/team-member.dto";

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
    private assessmentParticipantRepository: Repository<AssessmentParticipant>
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
}
