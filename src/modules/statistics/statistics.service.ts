import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { User } from "../../entities/user.entity";
import { Assessment } from "../../entities/assessment.entity";
import { AssessmentParticipant } from "../../entities/assessment-participant.entity";
import { Evaluation } from "../../entities/evaluation.entity";
import { Okr } from "../../entities/okr.entity";
import { Department } from "../../entities/department.entity";
import { StatisticsQueryDto } from "./dto/statistics-query.dto";

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentParticipant)
    private participantsRepository: Repository<AssessmentParticipant>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Okr)
    private okrsRepository: Repository<Okr>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private dataSource: DataSource
  ) {}

  async getDashboard() {
    try {
      this.logger.log('Fetching dashboard statistics');

      const [
        totalUsers,
        activeAssessments,
        completedAssessments,
        totalEvaluations,
        averageScores,
        departmentStats,
        recentAssessments,
        scoreDistribution,
      ] = await Promise.all([
        this.usersRepository.count(),
        this.assessmentsRepository.count({ where: { status: "active" } }),
        this.assessmentsRepository.count({ where: { status: "ended" } }),
        this.evaluationsRepository.count({ where: { status: "submitted" } }),
        this.getAverageScores(),
        this.getDepartmentStatistics(),
        this.getRecentAssessments(),
        this.getScoreDistribution(),
      ]);

      this.logger.debug(`Dashboard statistics fetched successfully: ${totalUsers} users, ${activeAssessments} active assessments`);
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch dashboard statistics');
    }

    const totalAssessments = activeAssessments + completedAssessments;
    const completionRate =
      totalAssessments > 0
        ? (completedAssessments / totalAssessments) * 100
        : 0;

    return {
      overview: {
        total_users: totalUsers,
        active_assessments: activeAssessments,
        completed_assessments: completedAssessments,
        total_evaluations: totalEvaluations,
        completion_rate: Number(completionRate.toFixed(1)),
        average_score: averageScores.overall,
        self_average: averageScores.self,
        leader_average: averageScores.leader,
      },
      department_stats: departmentStats,
      recent_assessments: recentAssessments,
      score_distribution: scoreDistribution,
    };
  }

  async getAssessmentStatistics(query: StatisticsQueryDto) {
    try {
      this.logger.log(`Fetching assessment statistics with query: ${JSON.stringify(query)}`);

      const { start_date, end_date, department_id } = query;

      const queryBuilder = this.assessmentsRepository
        .createQueryBuilder("assessment")
        .leftJoin("assessment.participants", "participant")
        .leftJoin("participant.user", "user")
        .leftJoin("user.department", "department")
        .select([
          "assessment.id",
          "assessment.title",
          "assessment.status",
          "assessment.start_date",
          "assessment.end_date",
          "COUNT(participant.id) as participant_count",
          "SUM(CASE WHEN participant.self_completed = 1 THEN 1 ELSE 0 END) as self_completed",
          "SUM(CASE WHEN participant.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed",
          "AVG(participant.self_score) as avg_self_score",
          "AVG(participant.leader_score) as avg_leader_score",
        ])
        .groupBy("assessment.id");

      if (start_date) {
        queryBuilder.andWhere("assessment.start_date >= :start_date", {
          start_date,
        });
      }
      if (end_date) {
        queryBuilder.andWhere("assessment.end_date <= :end_date", { end_date });
      }
      if (department_id) {
        queryBuilder.andWhere("department.id = :department_id", {
          department_id,
        });
      }

      const result = await queryBuilder.getRawMany();
      this.logger.debug(`Assessment statistics fetched: ${result.length} records`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch assessment statistics: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch assessment statistics');
    }
  }

  async getUserStatistics(query: StatisticsQueryDto) {
    const { department_id, user_id, assessment_id } = query;

    const queryBuilder = this.participantsRepository
      .createQueryBuilder("participant")
      .leftJoinAndSelect("participant.user", "user")
      .leftJoinAndSelect("user.department", "department")
      .leftJoinAndSelect("participant.assessment", "assessment")
      .leftJoinAndSelect("participant.okr", "okr")
      .select([
        "user.id",
        "user.username",
        "user.name",
        "department.name as department_name",
        "COUNT(participant.id) as total_assessments",
        "SUM(CASE WHEN participant.self_completed = 1 THEN 1 ELSE 0 END) as self_completed",
        "SUM(CASE WHEN participant.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed",
        "AVG(participant.self_score) as avg_self_score",
        "AVG(participant.leader_score) as avg_leader_score",
        "AVG(okr.progress) as avg_okr_progress",
      ])
      .groupBy("user.id");

    if (department_id) {
      queryBuilder.andWhere("department.id = :department_id", {
        department_id,
      });
    }
    if (user_id) {
      queryBuilder.andWhere("user.id = :user_id", { user_id });
    }
    if (assessment_id) {
      queryBuilder.andWhere("assessment.id = :assessment_id", {
        assessment_id,
      });
    }

    return queryBuilder.getRawMany();
  }

  async getDepartmentStatistics() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        "d.id",
        "d.name",
        "COUNT(DISTINCT u.id) as user_count",
        "COUNT(DISTINCT p.id) as participant_count",
        "AVG(p.self_score) as avg_self_score",
        "AVG(p.leader_score) as avg_leader_score",
        "SUM(CASE WHEN p.self_completed = 1 THEN 1 ELSE 0 END) as self_completed",
        "SUM(CASE WHEN p.leader_completed = 1 THEN 1 ELSE 0 END) as leader_completed",
      ])
      .from(Department, "d")
      .leftJoin(User, "u", "u.department_id = d.id")
      .leftJoin(AssessmentParticipant, "p", "p.user_id = u.id")
      .groupBy("d.id")
      .orderBy("d.name")
      .getRawMany();

    return result.map((item) => ({
      id: item.d_id,
      name: item.d_name,
      user_count: parseInt(item.user_count) || 0,
      participant_count: parseInt(item.participant_count) || 0,
      avg_self_score: parseFloat(item.avg_self_score) || 0,
      avg_leader_score: parseFloat(item.avg_leader_score) || 0,
      self_completion_rate:
        item.participant_count > 0
          ? (parseInt(item.self_completed) / parseInt(item.participant_count)) *
            100
          : 0,
      leader_completion_rate:
        item.participant_count > 0
          ? (parseInt(item.leader_completed) /
              parseInt(item.participant_count)) *
            100
          : 0,
    }));
  }

  async getOkrStatistics(query: StatisticsQueryDto) {
    const { department_id, user_id, assessment_id } = query;

    const queryBuilder = this.okrsRepository
      .createQueryBuilder("okr")
      .leftJoinAndSelect("okr.user", "user")
      .leftJoinAndSelect("user.department", "department")
      .leftJoinAndSelect("okr.assessment", "assessment")
      .leftJoinAndSelect("okr.keyResults", "keyResults")
      .select([
        "okr.id",
        "okr.title",
        "okr.progress",
        "okr.rating",
        "user.name",
        "department.name as department_name",
        "assessment.title as assessment_title",
        "AVG(keyResults.progress) as avg_key_result_progress",
        "COUNT(keyResults.id) as key_result_count",
      ])
      .groupBy("okr.id");

    if (department_id) {
      queryBuilder.andWhere("department.id = :department_id", {
        department_id,
      });
    }
    if (user_id) {
      queryBuilder.andWhere("user.id = :user_id", { user_id });
    }
    if (assessment_id) {
      queryBuilder.andWhere("assessment.id = :assessment_id", {
        assessment_id,
      });
    }

    return queryBuilder.getRawMany();
  }

  async getEvaluationStatistics(query: StatisticsQueryDto) {
    const { start_date, end_date, department_id } = query;

    const queryBuilder = this.evaluationsRepository
      .createQueryBuilder("evaluation")
      .leftJoinAndSelect("evaluation.evaluatee", "evaluatee")
      .leftJoinAndSelect("evaluatee.department", "department")
      .leftJoinAndSelect("evaluation.evaluator", "evaluator")
      .leftJoinAndSelect("evaluation.assessment", "assessment")
      .select([
        "evaluation.type",
        "evaluation.score",
        "evaluation.status",
        "evaluation.submitted_at",
        "evaluatee.name as evaluatee_name",
        "evaluator.name as evaluator_name",
        "department.name as department_name",
        "assessment.title as assessment_title",
      ]);

    if (start_date) {
      queryBuilder.andWhere("evaluation.submitted_at >= :start_date", {
        start_date,
      });
    }
    if (end_date) {
      queryBuilder.andWhere("evaluation.submitted_at <= :end_date", {
        end_date,
      });
    }
    if (department_id) {
      queryBuilder.andWhere("department.id = :department_id", {
        department_id,
      });
    }

    return queryBuilder.getMany();
  }

  private async getAverageScores() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'AVG(CASE WHEN e.type = "self" THEN e.score END) as self_avg',
        'AVG(CASE WHEN e.type = "leader" THEN e.score END) as leader_avg',
        "AVG(e.score) as overall_avg",
      ])
      .from(Evaluation, "e")
      .where("e.status = :status", { status: "submitted" })
      .getRawOne();

    return {
      self: parseFloat(result.self_avg) || 0,
      leader: parseFloat(result.leader_avg) || 0,
      overall: parseFloat(result.overall_avg) || 0,
    };
  }

  private async getRecentAssessments() {
    return this.assessmentsRepository.find({
      take: 10,
      order: { created_at: "DESC" },
      relations: ["creator"],
      select: {
        id: true,
        title: true,
        status: true,
        start_date: true,
        end_date: true,
        created_at: true,
        creator: {
          id: true,
          name: true,
        },
      },
    });
  }

  private async getScoreDistribution() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        "SUM(CASE WHEN e.score >= 90 THEN 1 ELSE 0 END) as excellent",
        "SUM(CASE WHEN e.score >= 80 AND e.score < 90 THEN 1 ELSE 0 END) as good",
        "SUM(CASE WHEN e.score >= 70 AND e.score < 80 THEN 1 ELSE 0 END) as average",
        "SUM(CASE WHEN e.score < 70 THEN 1 ELSE 0 END) as poor",
      ])
      .from(Evaluation, "e")
      .where("e.status = :status", { status: "submitted" })
      .getRawOne();

    return {
      excellent: parseInt(result.excellent) || 0,
      good: parseInt(result.good) || 0,
      average: parseInt(result.average) || 0,
      poor: parseInt(result.poor) || 0,
    };
  }

  async getPerformanceTrends(query: StatisticsQueryDto) {
    const {
      start_date,
      end_date,
      time_dimension = "month",
      department_id,
    } = query;

    let timeFormat = "%Y-%m";
    switch (time_dimension) {
      case "day":
        timeFormat = "%Y-%m-%d";
        break;
      case "week":
        timeFormat = "%Y-%u";
        break;
      case "quarter":
        timeFormat = "%Y-Q%q";
        break;
      case "year":
        timeFormat = "%Y";
        break;
    }

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        `DATE_FORMAT(e.submitted_at, '${timeFormat}') as period`,
        "AVG(e.score) as avg_score",
        "COUNT(e.id) as evaluation_count",
        'AVG(CASE WHEN e.type = "self" THEN e.score END) as self_avg',
        'AVG(CASE WHEN e.type = "leader" THEN e.score END) as leader_avg',
      ])
      .from(Evaluation, "e")
      .leftJoin(User, "u", "e.evaluatee_id = u.id")
      .leftJoin(Department, "d", "u.department_id = d.id")
      .where("e.status = :status", { status: "submitted" })
      .groupBy("period")
      .orderBy("period");

    if (start_date) {
      queryBuilder.andWhere("e.submitted_at >= :start_date", { start_date });
    }
    if (end_date) {
      queryBuilder.andWhere("e.submitted_at <= :end_date", { end_date });
    }
    if (department_id) {
      queryBuilder.andWhere("d.id = :department_id", { department_id });
    }

    return queryBuilder.getRawMany();
  }
}
