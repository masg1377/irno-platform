import { IsInt, IsEnum, IsDateString, IsString, IsOptional, Min, MaxLength } from 'class-validator'
import { PaymentMethod } from '@irno/types'

export class RecordEventPaymentDto {
  @IsInt()
  @Min(1)
  amountToman!: number

  @IsEnum(PaymentMethod)
  method!: PaymentMethod

  @IsDateString()
  paidAt!: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  receiptNote?: string
}
