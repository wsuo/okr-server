import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('考核管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  findAll() {
    return this.assessmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(+id);
  }
}