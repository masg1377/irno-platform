import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { PaymentMethod } from '@irno/types'

export class RecordTransactionDto {
  @IsInt()
  @Min(1)
  amountToman!: number

  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod

  @IsISO8601()
  paidAt!: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  receiptNote?: string | null
}
