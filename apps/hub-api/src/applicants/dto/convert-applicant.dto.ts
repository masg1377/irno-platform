import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class ConvertApplicantDto {
  @IsString()
  @MinLength(1, { message: 'نام الزامی است' })
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  firstName?: string

  @IsString()
  @MinLength(1, { message: 'نام خانوادگی الزامی است' })
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  lastName?: string

  @IsString()
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city?: string

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  internalNotes?: string
}
