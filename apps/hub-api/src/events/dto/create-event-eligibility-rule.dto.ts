import { IsEnum, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'
import { EventEligibilityRuleType } from '@irno/types'

export class CreateEventEligibilityRuleDto {
  @IsEnum(EventEligibilityRuleType)
  type!: EventEligibilityRuleType

  @IsString()
  @MaxLength(50)
  @IsOptional()
  operator?: string

  @IsOptional()
  value?: Record<string, unknown>

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean
}
