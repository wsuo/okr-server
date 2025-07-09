import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Assessment } from '../../entities/assessment.entity';
import { AssessmentParticipant } from '../../entities/assessment-participant.entity';
import { User } from '../../entities/user.entity';
import { Template } from '../../entities/template.entity';
import { Evaluation } from '../../entities/evaluation.entity';
import { Okr } from '../../entities/okr.entity';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { ScoreCalculationService } from './services/score-calculation.service';
import { ValidationService } from './services/validation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment, AssessmentParticipant, User, Template, Evaluation, Okr])],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, ScoreCalculationService, ValidationService],
  exports: [AssessmentsService, ScoreCalculationService, ValidationService],
})
export class AssessmentsModule {}