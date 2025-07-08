import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Assessment } from '../../entities/assessment.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
  ) {}

  async getDashboard() {
    const totalUsers = await this.usersRepository.count();
    const activeAssessments = await this.assessmentsRepository.count({
      where: { status: 'active' },
    });

    return {
      overview: {
        total_users: totalUsers,
        active_assessments: activeAssessments,
        completion_rate: 85.5,
        average_score: 87.2,
      },
      department_stats: [],
      recent_assessments: [],
      score_distribution: {
        excellent: 25,
        good: 45,
        average: 25,
        poor: 5,
      },
    };
  }
}