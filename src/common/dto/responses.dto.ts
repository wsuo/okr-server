import { ApiProperty } from "@nestjs/swagger";

export class RoleResponseDto {
  @ApiProperty({ description: "角色ID", example: 1 })
  id: number;

  @ApiProperty({ description: "角色代码", example: "admin" })
  code: string;

  @ApiProperty({ description: "角色名称", example: "系统管理员" })
  name: string;

  @ApiProperty({
    description: "角色描述",
    example: "系统管理员角色",
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: "权限列表",
    example: ["user:read", "user:write"],
    required: false,
  })
  permissions?: string[];

  @ApiProperty({ description: "状态", example: 1 })
  status: number;

  @ApiProperty({ description: "创建时间", example: "2023-01-01T00:00:00Z" })
  created_at: Date;

  @ApiProperty({ description: "更新时间", example: "2023-01-01T00:00:00Z" })
  updated_at: Date;
}

export class DepartmentResponseDto {
  @ApiProperty({ description: "部门ID", example: 1 })
  id: number;

  @ApiProperty({ description: "部门名称", example: "技术部" })
  name: string;

  @ApiProperty({
    description: "部门描述",
    example: "负责技术研发工作",
    required: false,
  })
  description?: string;

  @ApiProperty({ description: "父部门ID", example: 1, required: false })
  parent_id?: number;

  @ApiProperty({ description: "排序", example: 0 })
  sort_order: number;

  @ApiProperty({ description: "状态", example: 1 })
  status: number;

  @ApiProperty({ description: "员工数量", example: 10, required: false })
  employeeCount?: number;

  @ApiProperty({ description: "创建时间", example: "2023-01-01T00:00:00Z" })
  created_at: Date;

  @ApiProperty({ description: "更新时间", example: "2023-01-01T00:00:00Z" })
  updated_at: Date;
}

export class SimpleUserResponseDto {
  @ApiProperty({ description: "用户ID", example: 1 })
  id: number;

  @ApiProperty({ description: "用户名", example: "admin" })
  username: string;

  @ApiProperty({ description: "姓名", example: "系统管理员" })
  name: string;

  @ApiProperty({ description: "职位", example: "系统管理员", required: false })
  position?: string;
}

export class UserResponseDto {
  @ApiProperty({ description: "用户ID", example: 1 })
  id: number;

  @ApiProperty({ description: "用户名", example: "admin" })
  username: string;

  @ApiProperty({ description: "姓名", example: "系统管理员" })
  name: string;

  @ApiProperty({
    description: "邮箱",
    example: "admin@example.com",
    required: false,
  })
  email?: string;

  @ApiProperty({ description: "电话", example: "13800138000", required: false })
  phone?: string;

  @ApiProperty({ description: "头像", example: "avatar.jpg", required: false })
  avatar?: string;

  @ApiProperty({ description: "状态", example: 1 })
  status: number;

  @ApiProperty({
    description: "入职日期",
    example: "2023-01-01",
    required: false,
  })
  join_date?: Date;

  @ApiProperty({ description: "职位", example: "系统管理员", required: false })
  position?: string;

  @ApiProperty({ description: "部门信息", required: false })
  department?: DepartmentResponseDto;

  @ApiProperty({ description: "直属领导", required: false })
  leader?: SimpleUserResponseDto;

  @ApiProperty({ description: "角色列表", type: [RoleResponseDto] })
  roles: RoleResponseDto[];

  @ApiProperty({ description: "创建时间", example: "2023-01-01T00:00:00Z" })
  created_at: Date;

  @ApiProperty({ description: "更新时间", example: "2023-01-01T00:00:00Z" })
  updated_at: Date;
}

export class LoginResponseDto {
  @ApiProperty({
    description: "访问令牌",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token: string;

  @ApiProperty({
    description: "刷新令牌",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refresh_token: string;

  @ApiProperty({ description: "用户信息" })
  user: UserResponseDto;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: "访问令牌",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token: string;

  @ApiProperty({
    description: "刷新令牌",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refresh_token: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: "消息内容", example: "操作成功" })
  message: string;
}

export class PaginationResponseDto<T> {
  @ApiProperty({ description: "数据列表" })
  data: T[];

  @ApiProperty({ description: "总记录数", example: 100 })
  total: number;

  @ApiProperty({ description: "当前页", example: 1 })
  page: number;

  @ApiProperty({ description: "每页数量", example: 10 })
  limit: number;

  @ApiProperty({ description: "总页数", example: 10 })
  totalPages: number;
}

export class UserListResponseDto extends PaginationResponseDto<UserResponseDto> {
  @ApiProperty({ description: "用户列表", type: [UserResponseDto] })
  data: UserResponseDto[];
}

export class DepartmentListResponseDto {
  @ApiProperty({ description: "部门列表", type: [DepartmentResponseDto] })
  data: DepartmentResponseDto[];
}

export class RoleListResponseDto {
  @ApiProperty({ description: "角色列表", type: [RoleResponseDto] })
  data: RoleResponseDto[];
}
