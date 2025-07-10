import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, DataSource } from "typeorm";
import { Okr } from "../../entities/okr.entity";
import { KeyResult } from "../../entities/key-result.entity";
import { User } from "../../entities/user.entity";
import { Assessment } from "../../entities/assessment.entity";
import { CreateOkrDto } from "./dto/create-okr.dto";
import { UpdateOkrDto } from "./dto/update-okr.dto";
import { UpdateKeyResultDto } from "./dto/update-key-result.dto";
import { QueryOkrsDto } from "./dto/query-okrs.dto";

@Injectable()
export class OkrsService {
  constructor(
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
    @InjectRepository(KeyResult)
    private keyResultsRepository: Repository<KeyResult>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    private dataSource: DataSource
  ) {}

  async findAll(query: QueryOkrsDto) {
    const {
      page = 1,
      limit = 10,
      user_id,
      assessment_id,
      status,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.okrsRepository
      .createQueryBuilder("okr")
      .leftJoinAndSelect("okr.user", "user")
      .leftJoinAndSelect("okr.assessment", "assessment")
      .leftJoinAndSelect("okr.keyResults", "keyResults");

    if (user_id) {
      queryBuilder.andWhere("okr.user_id = :user_id", { user_id });
    }

    if (assessment_id) {
      queryBuilder.andWhere("okr.assessment_id = :assessment_id", {
        assessment_id,
      });
    }

    if (status) {
      queryBuilder.andWhere("okr.status = :status", { status });
    }

    if (search) {
      queryBuilder.andWhere("okr.objective LIKE :search", {
        search: `%${search}%`,
      });
    }

    queryBuilder.orderBy("okr.created_at", "DESC").skip(skip).take(limit);

    const [items, total] = await Promise.all([
      queryBuilder.getMany(),
      this.okrsRepository.count({
        where: {
          ...(user_id && { user: { id: user_id } }),
          ...(assessment_id && { assessment: { id: assessment_id } }),
          ...(status && { status }),
          ...(search && { objective: Like(`%${search}%`) }),
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

  async findOne(id: number): Promise<Okr> {
    const okr = await this.okrsRepository.findOne({
      where: { id },
      relations: ["user", "user.department", "assessment", "keyResults"],
    });

    if (!okr) {
      throw new NotFoundException(`OKR ID ${id} 不存在`);
    }

    return okr;
  }

  async create(createOkrDto: CreateOkrDto): Promise<Okr> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证用户是否存在
      const user = await this.usersRepository.findOne({
        where: { id: createOkrDto.user_id },
      });
      if (!user) {
        throw new BadRequestException("用户不存在");
      }

      // 验证考核是否存在且为进行中状态
      const assessment = await this.assessmentsRepository.findOne({
        where: { id: createOkrDto.assessment_id },
      });
      if (!assessment) {
        throw new BadRequestException("考核不存在");
      }
      if (assessment.status !== "active") {
        throw new BadRequestException("只能为进行中的考核创建OKR");
      }

      // 检查用户是否已在该考核中创建过OKR
      const existingOkr = await this.okrsRepository.findOne({
        where: {
          user: { id: createOkrDto.user_id },
          assessment: { id: createOkrDto.assessment_id },
        },
      });
      if (existingOkr) {
        throw new BadRequestException("该用户在此考核中已存在OKR");
      }

      // 验证关键结果权重总和是否为100%
      const totalWeight = createOkrDto.key_results.reduce(
        (sum, kr) => sum + kr.weight,
        0
      );
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new BadRequestException("关键结果权重总和必须为100%");
      }

      // 创建OKR
      const okr = this.okrsRepository.create({
        objective: createOkrDto.objective,
        description: createOkrDto.description,
        weight: createOkrDto.weight,
        user: { id: createOkrDto.user_id } as User,
        assessment: { id: createOkrDto.assessment_id } as Assessment,
        status: "active",
        progress: 0,
      });

      const savedOkr = await queryRunner.manager.save(okr);

      // 创建关键结果
      const keyResults = createOkrDto.key_results.map((krData) =>
        this.keyResultsRepository.create({
          ...krData,
          okr: savedOkr,
          progress: 0,
          status: "active",
        })
      );

      await queryRunner.manager.save(keyResults);
      await queryRunner.commitTransaction();

      return this.findOne(savedOkr.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, updateOkrDto: UpdateOkrDto): Promise<Okr> {
    const okr = await this.findOne(id);

    // 如果更新了进度，同时更新关键结果的加权进度
    if (updateOkrDto.progress !== undefined) {
      const keyResults = await this.keyResultsRepository.find({
        where: { okr: { id } },
      });

      let weightedProgress = 0;
      for (const kr of keyResults) {
        weightedProgress += (kr.progress * kr.weight) / 100;
      }
      updateOkrDto.progress = weightedProgress;
    }

    await this.okrsRepository.update(id, updateOkrDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const okr = await this.findOne(id);

    if (okr.status === "completed") {
      throw new BadRequestException("无法删除已完成的OKR");
    }

    await this.okrsRepository.remove(okr);
  }

  async updateKeyResult(
    okrId: number,
    keyResultId: number,
    updateKeyResultDto: UpdateKeyResultDto
  ): Promise<KeyResult> {
    const okr = await this.findOne(okrId);

    const keyResult = await this.keyResultsRepository.findOne({
      where: { id: keyResultId, okr: { id: okrId } },
    });

    if (!keyResult) {
      throw new NotFoundException("关键结果不存在");
    }

    await this.keyResultsRepository.update(keyResultId, updateKeyResultDto);

    // 更新关键结果后，重新计算OKR的整体进度
    await this.recalculateOkrProgress(okrId);

    return this.keyResultsRepository.findOne({
      where: { id: keyResultId },
      relations: ["okr"],
    });
  }

  private async recalculateOkrProgress(okrId: number): Promise<void> {
    const keyResults = await this.keyResultsRepository.find({
      where: { okr: { id: okrId } },
    });

    let weightedProgress = 0;
    for (const kr of keyResults) {
      weightedProgress += (kr.progress * kr.weight) / 100;
    }

    await this.okrsRepository.update(okrId, { progress: weightedProgress });
  }

  async getMyOkrs(userId: number, assessmentId?: number) {
    const where: any = { user: { id: userId } };
    if (assessmentId) {
      where.assessment = { id: assessmentId };
    }

    return this.okrsRepository.find({
      where,
      relations: ["assessment", "keyResults"],
      order: { created_at: "DESC" },
    });
  }
}
