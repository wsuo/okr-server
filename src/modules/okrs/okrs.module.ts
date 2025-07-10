import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Okr } from "../../entities/okr.entity";
import { KeyResult } from "../../entities/key-result.entity";
import { User } from "../../entities/user.entity";
import { Assessment } from "../../entities/assessment.entity";
import { OkrsController } from "./okrs.controller";
import { OkrsService } from "./okrs.service";

@Module({
  imports: [TypeOrmModule.forFeature([Okr, KeyResult, User, Assessment])],
  controllers: [OkrsController],
  providers: [OkrsService],
  exports: [OkrsService],
})
export class OkrsModule {}
