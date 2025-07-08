import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../entities/template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templatesRepository: Repository<Template>,
  ) {}

  async findAll(): Promise<Template[]> {
    return this.templatesRepository.find({
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Template> {
    return this.templatesRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
  }
}