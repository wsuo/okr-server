import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async findAll(): Promise<Department[]> {
    return this.departmentsRepository.find({
      relations: ['employees'],
      order: { sort_order: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Department> {
    return this.departmentsRepository.findOne({
      where: { id },
      relations: ['employees', 'parent', 'children'],
    });
  }
}