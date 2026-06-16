import { IsString, IsEnum, IsOptional, IsInt, IsPositive } from 'class-validator'
import { CreditType, CreditStatus } from '@irno/types'

export class CreateCreditDto {
  @IsString()
  title!: string

  @IsString()
  slug!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsEnum(CreditType)
  type!: CreditType

  @IsOptional()
  @IsEnum(CreditStatus)
  status?: CreditStatus

  @IsOptional()
  @IsInt()
  @IsPositive()
  expiresAfterDays?: number
}
