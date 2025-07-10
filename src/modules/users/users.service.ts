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
import { BcryptUtil } from "../../common/utils/bcrypt.util";
import {
  PaginationUtil,
  PaginatedResult,
} from "../../common/utils/pagination.util";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>
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
}
