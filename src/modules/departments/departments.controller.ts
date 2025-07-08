import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepartmentListResponseDto, DepartmentResponseDto, MessageResponseDto } from '../../common/dto/responses.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('部门管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiOperation({ summary: '创建部门' })
  @ApiResponse({ status: 201, description: '创建成功', type: DepartmentResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

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

  @ApiOperation({ summary: '更新部门信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: DepartmentResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentsService.update(+id, updateDepartmentDto);
  }

  @ApiOperation({ summary: '删除部门' })
  @ApiResponse({ status: 200, description: '删除成功', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: '部门下有子部门或员工，无法删除' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(+id);
  }
}