import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from '../../entities/template.entity';
import { User } from '../../entities/user.entity';
import { SeedService } from './seed.service';
import { DefaultAssessmentTemplateSeed } from './default-assessment-template.seed';

@Module({
  imports: [TypeOrmModule.forFeature([Template, User])],
  providers: [SeedService, DefaultAssessmentTemplateSeed],
  exports: [SeedService],
})
export class SeedModule {}