import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('模板管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(+id);
  }
}