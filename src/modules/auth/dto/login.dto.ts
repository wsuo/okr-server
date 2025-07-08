import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  username: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 50)
  password: string;
}