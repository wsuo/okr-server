import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Assessment } from '../../entities/assessment.entity';
import { AssessmentParticipant } from '../../entities/assessment-participant.entity';
import { User } from '../../entities/user.entity';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment, AssessmentParticipant, User])],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}