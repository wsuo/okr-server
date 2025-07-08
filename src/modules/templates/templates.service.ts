import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { Template } from '../../entities/template.entity';
import { User } from '../../entities/user.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplatesDto } from './dto/query-templates.dto';
import { CloneTemplateDto } from './dto/clone-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async findAll(query: QueryTemplatesDto) {
    const { page = 1, limit = 10, name, type, status, is_default, created_by } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.templatesRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .where('1=1');

    if (name) {
      queryBuilder.andWhere('template.name LIKE :name', { name: `%${name}%` });
    }

    if (type) {
      queryBuilder.andWhere('template.type = :type', { type });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('template.status = :status', { status });
    }

    if (is_default !== undefined) {
      queryBuilder.andWhere('template.is_default = :is_default', { is_default });
    }

    if (created_by) {
      queryBuilder.andWhere('template.creator.id = :created_by', { created_by });
    }

    queryBuilder
      .orderBy('template.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await Promise.all([
      queryBuilder.getMany(),
      this.templatesRepository.count({
        where: {
          ...(name && { name: Like(`%${name}%`) }),
          ...(type && { type }),
          ...(status !== undefined && { status }),
          ...(is_default !== undefined && { is_default }),
          ...(created_by && { creator: { id: created_by } }),
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

  async findOne(id: number): Promise<Template> {
    const template = await this.templatesRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!template) {
      throw new NotFoundException(`模板 ID ${id} 不存在`);
    }

    return template;
  }

  async create(createTemplateDto: CreateTemplateDto, creatorId: number): Promise<Template> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证创建者是否存在
      const creator = await this.usersRepository.findOne({ where: { id: creatorId } });
      if (!creator) {
        throw new BadRequestException('创建者不存在');
      }

      // 检查模板名称是否已存在
      const existingTemplate = await this.templatesRepository.findOne({
        where: { name: createTemplateDto.name },
      });
      if (existingTemplate) {
        throw new ConflictException('模板名称已存在');
      }

      // 如果设为默认模板，需要先取消其他同类型的默认模板
      if (createTemplateDto.is_default) {
        await this.templatesRepository.update(
          { type: createTemplateDto.type, is_default: 1 },
          { is_default: 0 }
        );
      }

      // 创建模板
      const template = this.templatesRepository.create({
        ...createTemplateDto,
        is_default: createTemplateDto.is_default ? 1 : 0,
        creator: { id: creatorId },
      });

      const savedTemplate = await queryRunner.manager.save(template);

      await queryRunner.commitTransaction();
      return this.findOne(savedTemplate.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: number, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const template = await this.findOne(id);

      // 检查模板名称是否已存在（排除当前模板）
      if (updateTemplateDto.name && updateTemplateDto.name !== template.name) {
        const existingTemplate = await this.templatesRepository.findOne({
          where: { name: updateTemplateDto.name },
        });
        if (existingTemplate) {
          throw new ConflictException('模板名称已存在');
        }
      }

      // 如果设为默认模板，需要先取消其他同类型的默认模板
      if (updateTemplateDto.is_default) {
        const type = updateTemplateDto.type || template.type;
        await this.templatesRepository.update(
          { type, is_default: 1 },
          { is_default: 0 }
        );
      }

      await this.templatesRepository.update(id, {
        ...updateTemplateDto,
        is_default: updateTemplateDto.is_default ? 1 : 0,
      });

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);

    // 检查模板是否被考核使用
    const assessmentCount = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('assessments', 'a')
      .where('a.template_id = :id', { id })
      .getRawOne();

    if (assessmentCount.count > 0) {
      throw new BadRequestException('该模板正在被考核使用，无法删除');
    }

    await this.templatesRepository.softDelete(id);
  }

  async clone(id: number, cloneTemplateDto: CloneTemplateDto, creatorId: number): Promise<Template> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const originalTemplate = await this.findOne(id);

      // 检查新模板名称是否已存在
      const existingTemplate = await this.templatesRepository.findOne({
        where: { name: cloneTemplateDto.name },
      });
      if (existingTemplate) {
        throw new ConflictException('模板名称已存在');
      }

      // 如果设为默认模板，需要先取消其他同类型的默认模板
      if (cloneTemplateDto.is_default) {
        await this.templatesRepository.update(
          { type: originalTemplate.type, is_default: 1 },
          { is_default: 0 }
        );
      }

      // 创建克隆模板
      const clonedTemplate = this.templatesRepository.create({
        name: cloneTemplateDto.name,
        description: cloneTemplateDto.description || originalTemplate.description,
        type: originalTemplate.type,
        config: JSON.parse(JSON.stringify(originalTemplate.config)), // 深拷贝配置
        is_default: cloneTemplateDto.is_default ? 1 : 0,
        creator: { id: creatorId },
      });

      const savedTemplate = await queryRunner.manager.save(clonedTemplate);

      await queryRunner.commitTransaction();
      return this.findOne(savedTemplate.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getDefaultTemplates(type?: string) {
    const where: any = { is_default: 1 };
    if (type) {
      where.type = type;
    }

    return this.templatesRepository.find({
      where,
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });
  }

  async setDefault(id: number): Promise<Template> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const template = await this.findOne(id);

      // 取消同类型的其他默认模板
      await this.templatesRepository.update(
        { type: template.type, is_default: 1 },
        { is_default: 0 }
      );

      // 设置当前模板为默认
      await this.templatesRepository.update(id, { is_default: 1 });

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTemplatesByType(type: string) {
    return this.templatesRepository.find({
      where: { type, status: 1 },
      relations: ['creator'],
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }
}