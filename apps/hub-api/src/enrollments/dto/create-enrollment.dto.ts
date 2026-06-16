import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  IsISO8601,
  Min,
  MaxLength,
} from 'class-validator'

export class CreateEnrollmentDto {
  @IsUUID()
  studentId!: string

  @IsUUID()
  courseId!: string

  @IsUUID()
  @IsOptional()
  courseGroupId?: string | null

  @IsInt()
  @Min(0)
  tuitionAmountToman!: number

  @IsInt()
  @Min(0)
  @IsOptional()
  discountAmountToman?: number

  @IsISO8601()
  enrollmentDate!: string

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null
}
