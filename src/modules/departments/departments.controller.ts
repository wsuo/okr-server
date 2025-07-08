import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepartmentListResponseDto, DepartmentResponseDto } from '../../common/dto/responses.dto';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('部门管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiOperation({ summary: '获取部门列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: DepartmentListResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @ApiOperation({ summary: '获取部门详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: DepartmentResponseDto })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(+id);
  }
}