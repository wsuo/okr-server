import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Okr } from '../../entities/okr.entity';

@Injectable()
export class OkrsService {
  constructor(
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
  ) {}

  async findAll(): Promise<Okr[]> {
    return this.okrsRepository.find({
      relations: ['user', 'assessment', 'keyResults'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Okr> {
    return this.okrsRepository.findOne({
      where: { id },
      relations: ['user', 'assessment', 'keyResults'],
    });
  }
}