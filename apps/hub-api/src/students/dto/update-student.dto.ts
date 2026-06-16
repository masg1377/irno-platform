import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { StudentStatus } from '@irno/types'

export class UpdateStudentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  firstName?: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  lastName?: string

  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @IsOptional()
  email?: string | null

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

  @IsUrl()
  @IsOptional()
  avatarUrl?: string

  @IsString()
  @MaxLength(100)
  @IsOptional()
  telegramHandle?: string
}
