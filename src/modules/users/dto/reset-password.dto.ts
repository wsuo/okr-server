import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "新密码", example: "newpassword" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
