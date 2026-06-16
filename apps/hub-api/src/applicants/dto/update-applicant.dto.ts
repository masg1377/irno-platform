import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { ApplicantSource, ApplicantStatus } from '@irno/types'

export class UpdateApplicantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string

  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  @IsOptional()
  mobile?: string

  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @IsOptional()
  email?: string | null

  @IsString()
  @MaxLength(100)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city?: string

  @IsEnum(ApplicantSource)
  @IsOptional()
  source?: ApplicantSource

  @IsString()
  @MaxLength(300)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  interestedTopic?: string

  @IsEnum(ApplicantStatus)
  @IsOptional()
  status?: ApplicantStatus

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  consultationNotes?: string

  @IsISO8601()
  @IsOptional()
  followUpDate?: string | null

  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null

  @IsUUID()
  @IsOptional()
  interestedCourseId?: string | null

  @IsUUID()
  @IsOptional()
  interestedCourseGroupId?: string | null
}
