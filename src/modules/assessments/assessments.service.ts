import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from '../../entities/assessment.entity';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
  ) {}

  async findAll(): Promise<Assessment[]> {
    return this.assessmentsRepository.find({
      relations: ['creator', 'participants'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Assessment> {
    return this.assessmentsRepository.findOne({
      where: { id },
      relations: ['creator', 'participants', 'participants.user'],
    });
  }
}