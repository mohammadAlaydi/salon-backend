import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterSalonAdminDto {
  @ApiProperty()
  @IsString()
  salonName: string;

  @ApiProperty()
  @IsString()
  salonSlug: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  adminName: string;
}


