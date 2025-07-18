import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role } from "../../entities/role.entity";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { status: 1 },
      order: { created_at: "ASC" },
    });
  }

  async findOne(id: number): Promise<Role> {
    return this.rolesRepository.findOne({ where: { id } });
  }
}
