import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Evaluation } from '../../entities/evaluation.entity';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation])],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}