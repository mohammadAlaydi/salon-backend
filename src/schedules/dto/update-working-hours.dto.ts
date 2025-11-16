import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkingHoursEntryDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty()
  @IsString()
  startTime!: string; // HH:MM

  @ApiProperty()
  @IsString()
  endTime!: string; // HH:MM

  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ type: [WorkingHoursEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  entries!: WorkingHoursEntryDto[];
}


