import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkingHoursEntryDto {
  @ApiProperty()
  dayOfWeek: number;

  @ApiProperty()
  startTime: string; // HH:MM

  @ApiProperty()
  endTime: string; // HH:MM

  @ApiProperty()
  isAvailable: boolean;
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ type: [WorkingHoursEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  entries: WorkingHoursEntryDto[];
}


