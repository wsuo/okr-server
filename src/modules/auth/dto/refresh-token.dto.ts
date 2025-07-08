import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}