import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator'
import { StudentSkillLevel } from '@irno/types'

export class AwardSkillDto {
  @IsUUID()
  skillId!: string

  @IsEnum(StudentSkillLevel)
  level!: StudentSkillLevel

  @IsOptional()
  @IsString()
  evidenceNote?: string

  @IsOptional()
  @IsString()
  sourceType?: string

  @IsOptional()
  @IsUUID()
  sourceId?: string
}
