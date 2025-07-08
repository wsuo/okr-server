import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OkrsService } from './okrs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOkrDto } from './dto/create-okr.dto';
import { UpdateOkrDto } from './dto/update-okr.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';
import { QueryOkrsDto } from './dto/query-okrs.dto';

@ApiTags('OKR管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('okrs')
export class OkrsController {
  constructor(private readonly okrsService: OkrsService) {}

  @Get()
  @ApiOperation({ summary: '获取OKR列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryOkrsDto) {
    return this.okrsService.findAll(query);
  }

  @Get('my')
  @ApiOperation({ summary: '获取我的OKR列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMyOkrs(
    @CurrentUser() user: any,
    @Query('assessment_id') assessmentId?: number
  ) {
    return this.okrsService.getMyOkrs(user.id, assessmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取OKR详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: 'OKR不存在' })
  findOne(@Param('id') id: string) {
    return this.okrsService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: '创建OKR' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(@Body() createOkrDto: CreateOkrDto) {
    return this.okrsService.create(createOkrDto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新OKR' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: 'OKR不存在' })
  update(
    @Param('id') id: string,
    @Body() updateOkrDto: UpdateOkrDto
  ) {
    return this.okrsService.update(+id, updateOkrDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除OKR' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'OKR不存在' })
  @ApiResponse({ status: 400, description: '无法删除已完成的OKR' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.okrsService.remove(+id);
  }

  @Put(':okrId/key-results/:keyResultId')
  @ApiOperation({ summary: '更新关键结果' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '关键结果不存在' })
  updateKeyResult(
    @Param('okrId') okrId: string,
    @Param('keyResultId') keyResultId: string,
    @Body() updateKeyResultDto: UpdateKeyResultDto
  ) {
    return this.okrsService.updateKeyResult(+okrId, +keyResultId, updateKeyResultDto);
  }
}