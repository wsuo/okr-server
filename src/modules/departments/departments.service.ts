import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department } from "../../entities/department.entity";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // 验证父部门是否存在
    if (createDepartmentDto.parent_id) {
      const parentDepartment = await this.departmentsRepository.findOne({
        where: { id: createDepartmentDto.parent_id },
      });
      if (!parentDepartment) {
        throw new NotFoundException("父部门不存在");
      }
    }

    // 检查同级部门名称是否重复
    const existingDepartment = await this.departmentsRepository
      .createQueryBuilder("dept")
      .where("dept.name = :name", { name: createDepartmentDto.name })
      .andWhere("dept.parent_id = :parent_id", {
        parent_id: createDepartmentDto.parent_id || null,
      })
      .andWhere("dept.status = 1")
      .getOne();
    if (existingDepartment) {
      throw new BadRequestException("同级部门中已存在相同名称的部门");
    }

    const department = this.departmentsRepository.create({
      ...createDepartmentDto,
      sort_order: createDepartmentDto.sort_order || 0,
      status: 1,
    });

    return this.departmentsRepository.save(department);
  }

  async findAll(): Promise<{ data: Department[] }> {
    const departments = await this.departmentsRepository.find({
      where: { status: 1 },
      relations: ["parent", "children"],
      order: { sort_order: "ASC", id: "ASC" },
    });

    // 计算每个部门的员工数量
    const departmentsWithCount = await Promise.all(
      departments.map(async (department) => {
        const employeeCount = await this.departmentsRepository
          .createQueryBuilder("dept")
          .leftJoin("dept.employees", "employee")
          .where("dept.id = :id", { id: department.id })
          .andWhere("employee.status = 1")
          .getCount();

        return {
          ...department,
          employeeCount,
        };
      })
    );

    return { data: departmentsWithCount };
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentsRepository.findOne({
      where: { id, status: 1 },
      relations: ["parent", "children"],
    });

    if (!department) {
      throw new NotFoundException("部门不存在");
    }

    return department;
  }

  async update(
    id: number,
    updateDepartmentDto: UpdateDepartmentDto
  ): Promise<Department> {
    const department = await this.findOne(id);

    // 验证父部门是否存在（如果要修改父部门）
    if (updateDepartmentDto.parent_id !== undefined) {
      if (updateDepartmentDto.parent_id === id) {
        throw new BadRequestException("部门不能设置自己为父部门");
      }

      if (updateDepartmentDto.parent_id) {
        const parentDepartment = await this.departmentsRepository.findOne({
          where: { id: updateDepartmentDto.parent_id, status: 1 },
        });
        if (!parentDepartment) {
          throw new NotFoundException("父部门不存在");
        }

        // 检查是否会形成循环引用
        const isCircular = await this.checkCircularReference(
          id,
          updateDepartmentDto.parent_id
        );
        if (isCircular) {
          throw new BadRequestException(
            "不能设置子部门为父部门，会形成循环引用"
          );
        }
      }
    }

    // 检查同级部门名称是否重复（如果要修改名称或父部门）
    if (
      updateDepartmentDto.name ||
      updateDepartmentDto.parent_id !== undefined
    ) {
      const name = updateDepartmentDto.name || department.name;
      const parent_id =
        updateDepartmentDto.parent_id !== undefined
          ? updateDepartmentDto.parent_id
          : department.parent_id;

      const existingDepartment = await this.departmentsRepository
        .createQueryBuilder("dept")
        .where("dept.name = :name", { name })
        .andWhere("dept.parent_id = :parent_id", {
          parent_id: parent_id || null,
        })
        .andWhere("dept.id != :id", { id })
        .andWhere("dept.status = 1")
        .getOne();
      if (existingDepartment) {
        throw new BadRequestException("同级部门中已存在相同名称的部门");
      }
    }

    Object.assign(department, updateDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async remove(id: number): Promise<{ message: string }> {
    const department = await this.findOne(id);

    // 检查是否有子部门
    const childrenCount = await this.departmentsRepository.count({
      where: { parent_id: id, status: 1 },
    });
    if (childrenCount > 0) {
      throw new BadRequestException("该部门下有子部门，无法删除");
    }

    // 检查是否有员工
    const employeeCount = await this.departmentsRepository
      .createQueryBuilder("dept")
      .leftJoin("dept.employees", "employee")
      .where("dept.id = :id", { id })
      .andWhere("employee.status = 1")
      .getCount();

    if (employeeCount > 0) {
      throw new BadRequestException("该部门下有员工，无法删除");
    }

    // 软删除
    department.status = 0;
    await this.departmentsRepository.save(department);

    return { message: "部门删除成功" };
  }

  private async checkCircularReference(
    deptId: number,
    parentId: number
  ): Promise<boolean> {
    if (deptId === parentId) {
      return true;
    }

    const parent = await this.departmentsRepository.findOne({
      where: { id: parentId },
    });

    if (!parent || !parent.parent_id) {
      return false;
    }

    return this.checkCircularReference(deptId, parent.parent_id);
  }
}
