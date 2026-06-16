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

export class CreateApplicantDto {
  @IsString()
  @MinLength(2, { message: 'نام الزامی است' })
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  fullName!: string

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

  @IsEnum(ApplicantSource, { message: 'منبع معتبر نیست' })
  @IsOptional()
  source?: ApplicantSource

  @IsString()
  @MaxLength(300)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  interestedTopic?: string

  @IsEnum(ApplicantStatus, { message: 'وضعیت معتبر نیست' })
  @IsOptional()
  status?: ApplicantStatus

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  consultationNotes?: string

  @IsISO8601({}, { message: 'تاریخ معتبر نیست' })
  @IsOptional()
  followUpDate?: string

  @IsUUID()
  @IsOptional()
  assignedToUserId?: string

  @IsUUID()
  @IsOptional()
  interestedCourseId?: string | null

  @IsUUID()
  @IsOptional()
  interestedCourseGroupId?: string | null
}
