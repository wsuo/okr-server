import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { Department } from "../../entities/department.entity";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Department])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
