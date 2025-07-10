import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import {
  RoleListResponseDto,
  RoleResponseDto,
} from "../../common/dto/responses.dto";
import { RolesService } from "./roles.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("角色管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: "获取角色列表" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: RoleListResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @ApiOperation({ summary: "获取角色详情" })
  @ApiResponse({ status: 200, description: "获取成功", type: RoleResponseDto })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "角色不存在" })
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.rolesService.findOne(+id);
  }
}
