import { IsString, IsEnum, IsOptional } from 'class-validator'
import { SkillLevel, SkillStatus } from '@irno/types'

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsEnum(SkillLevel)
  level?: SkillLevel

  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus
}
