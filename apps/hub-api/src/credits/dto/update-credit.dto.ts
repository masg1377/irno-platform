import { IsString, IsEnum, IsOptional, IsInt, IsPositive } from 'class-validator'
import { CreditType, CreditStatus } from '@irno/types'

export class UpdateCreditDto {
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
  @IsEnum(CreditType)
  type?: CreditType

  @IsOptional()
  @IsEnum(CreditStatus)
  status?: CreditStatus

  @IsOptional()
  @IsInt()
  @IsPositive()
  expiresAfterDays?: number
}
