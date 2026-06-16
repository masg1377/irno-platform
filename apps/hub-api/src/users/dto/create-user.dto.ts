import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator'
import { UserRole } from '@irno/types'

export class CreateUserDto {
  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  mobile!: string

  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  @IsOptional()
  email?: string

  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  password!: string

  @IsEnum(UserRole, { message: 'نقش معتبر نیست' })
  @IsOptional()
  role?: UserRole

  @IsString()
  @MinLength(1, { message: 'نام الزامی است' })
  firstName!: string

  @IsString()
  @MinLength(1, { message: 'نام خانوادگی الزامی است' })
  lastName!: string

  @IsString()
  @IsOptional()
  city?: string
}
