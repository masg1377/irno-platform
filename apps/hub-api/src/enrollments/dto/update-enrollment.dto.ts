import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator'
import { EnrollmentStatus } from '@irno/types'

export class UpdateEnrollmentDto {
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null

  @IsInt()
  @Min(0)
  @IsOptional()
  tuitionAmountToman?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  discountAmountToman?: number
}
