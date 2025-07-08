import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OkrsService } from './okrs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('OKR管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('okrs')
export class OkrsController {
  constructor(private readonly okrsService: OkrsService) {}

  @Get()
  findAll() {
    return this.okrsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.okrsService.findOne(+id);
  }
}