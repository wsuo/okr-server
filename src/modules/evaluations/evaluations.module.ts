import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Evaluation } from '../../entities/evaluation.entity';
import { Assessment } from '../../entities/assessment.entity';
import { AssessmentParticipant } from '../../entities/assessment-participant.entity';
import { User } from '../../entities/user.entity';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation, Assessment, AssessmentParticipant, User])],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}