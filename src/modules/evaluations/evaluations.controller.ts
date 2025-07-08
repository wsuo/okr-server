import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('评估管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  findAll() {
    return this.evaluationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationsService.findOne(+id);
  }
}