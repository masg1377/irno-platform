import { IsUUID, IsString, IsOptional } from 'class-validator'

export class CheckEligibilityDto {
  @IsUUID()
  @IsOptional()
  studentId?: string

  @IsUUID()
  @IsOptional()
  applicantId?: string

  @IsUUID()
  @IsOptional()
  userId?: string

  @IsString()
  @IsOptional()
  mobile?: string
}
