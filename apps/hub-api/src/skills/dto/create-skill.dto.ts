import { IsString, IsEnum, IsOptional } from 'class-validator'
import { SkillLevel, SkillStatus } from '@irno/types'

export class CreateSkillDto {
  @IsString()
  title!: string

  @IsString()
  slug!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsEnum(SkillLevel)
  level!: SkillLevel

  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus
}
