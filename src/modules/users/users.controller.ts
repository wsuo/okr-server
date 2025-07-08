import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('用户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: '创建用户' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: '获取用户列表' })
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @ApiOperation({ summary: '获取用户详情' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @ApiOperation({ summary: '更新用户信息' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @ApiOperation({ summary: '删除用户' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @ApiOperation({ summary: '重置用户密码' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(+id, resetPasswordDto.password);
  }

  @ApiOperation({ summary: '切换用户状态' })
  @Roles('admin')
  @UseGuards(RolesGuard)
  @Post(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(+id);
  }
}