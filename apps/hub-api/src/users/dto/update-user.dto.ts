import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator'
import { UserRole, UserStatus } from '@irno/types'

export class UpdateUserDto {
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @IsOptional()
  email?: string

  @IsEnum(UserRole, { message: 'نقش معتبر نیست' })
  @IsOptional()
  role?: UserRole

  @IsEnum(UserStatus, { message: 'وضعیت معتبر نیست' })
  @IsOptional()
  status?: UserStatus

  @IsString()
  @MinLength(1)
  @IsOptional()
  firstName?: string

  @IsString()
  @MinLength(1)
  @IsOptional()
  lastName?: string

  @IsString()
  @IsOptional()
  city?: string

  @IsUrl({}, { message: 'آدرس تصویر معتبر نیست' })
  @IsOptional()
  avatarUrl?: string

  @IsString()
  @IsOptional()
  telegramHandle?: string
}
