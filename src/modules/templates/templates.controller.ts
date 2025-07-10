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
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { TemplatesService } from "./templates.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { QueryTemplatesDto } from "./dto/query-templates.dto";
import { CloneTemplateDto } from "./dto/clone-template.dto";

@ApiTags("模板管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: "获取模板列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  findAll(@Query() query: QueryTemplatesDto) {
    return this.templatesService.findAll(query);
  }

  @Get("defaults")
  @ApiOperation({ summary: "获取默认模板" })
  @ApiResponse({ status: 200, description: "获取成功" })
  getDefaultTemplates(@Query("type") type?: string) {
    return this.templatesService.getDefaultTemplates(type);
  }

  @Get("type/:type")
  @ApiOperation({ summary: "根据类型获取模板" })
  @ApiResponse({ status: 200, description: "获取成功" })
  getTemplatesByType(@Param("type") type: string) {
    return this.templatesService.getTemplatesByType(type);
  }

  @Get(":id/config")
  @ApiOperation({ summary: "获取模板详细配置" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  getTemplateConfig(@Param("id") id: string) {
    return this.templatesService.getTemplateConfig(+id);
  }

  @Get(":id/preview")
  @ApiOperation({ summary: "预览模板结构" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  previewTemplate(@Param("id") id: string) {
    return this.templatesService.previewTemplate(+id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取模板详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  findOne(@Param("id") id: string) {
    return this.templatesService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: "创建模板" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数错误" })
  @ApiResponse({ status: 409, description: "模板名称已存在" })
  create(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser() user: any
  ) {
    return this.templatesService.create(createTemplateDto, user.id);
  }

  @Post(":id/clone")
  @ApiOperation({ summary: "克隆模板" })
  @ApiResponse({ status: 201, description: "克隆成功" })
  @ApiResponse({ status: 404, description: "原模板不存在" })
  @ApiResponse({ status: 409, description: "模板名称已存在" })
  clone(
    @Param("id") id: string,
    @Body() cloneTemplateDto: CloneTemplateDto,
    @CurrentUser() user: any
  ) {
    return this.templatesService.clone(+id, cloneTemplateDto, user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新模板" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  @ApiResponse({ status: 409, description: "模板名称已存在" })
  update(
    @Param("id") id: string,
    @Body() updateTemplateDto: UpdateTemplateDto
  ) {
    return this.templatesService.update(+id, updateTemplateDto);
  }

  @Put(":id/default")
  @ApiOperation({ summary: "设置为默认模板" })
  @ApiResponse({ status: 200, description: "设置成功" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  setDefault(@Param("id") id: string) {
    return this.templatesService.setDefault(+id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除模板" })
  @ApiResponse({ status: 204, description: "删除成功" })
  @ApiResponse({ status: 404, description: "模板不存在" })
  @ApiResponse({ status: 400, description: "模板正在被使用，无法删除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.templatesService.remove(+id);
  }
}
