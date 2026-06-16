import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { StudentStatus } from '@irno/types'

export class CreateStudentDto {
  @IsString()
  @MinLength(1, { message: 'نام الزامی است' })
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  firstName!: string

  @IsString()
  @MinLength(1, { message: 'نام خانوادگی الزامی است' })
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  lastName!: string

  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  mobile!: string

  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @IsOptional()
  email?: string

  @IsString()
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city?: string

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  internalNotes?: string
}
