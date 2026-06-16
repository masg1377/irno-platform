import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

export class InstallmentItemDto {
  @IsInt()
  @Min(1)
  installmentNumber!: number

  @IsInt()
  @Min(1)
  amountToman!: number

  @IsISO8601()
  dueDate!: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string | null
}

export class CreateInstallmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentItemDto)
  installments!: InstallmentItemDto[]
}
