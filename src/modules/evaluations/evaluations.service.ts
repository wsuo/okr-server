import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation } from '../../entities/evaluation.entity';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
  ) {}

  async findAll(): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      relations: ['assessment', 'evaluator', 'evaluatee'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Evaluation> {
    return this.evaluationsRepository.findOne({
      where: { id },
      relations: ['assessment', 'evaluator', 'evaluatee'],
    });
  }
}