import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator'

/**
 * POST /api/v1/auth/register
 * Public self-registration for Irno ID.
 */
export class RegisterDto {
  @IsString()
  @MinLength(1, { message: 'نام الزامی است' })
  @MaxLength(100, { message: 'نام نباید بیشتر از ۱۰۰ کاراکتر باشد' })
  firstName!: string

  @IsString()
  @MinLength(1, { message: 'نام خانوادگی الزامی است' })
  @MaxLength(100, { message: 'نام خانوادگی نباید بیشتر از ۱۰۰ کاراکتر باشد' })
  lastName!: string

  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  mobile!: string

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  email?: string

  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  @MaxLength(72, { message: 'رمز عبور خیلی طولانی است' })
  password!: string

  @IsString()
  @MinLength(1, { message: 'تکرار رمز عبور الزامی است' })
  confirmPassword!: string
}
