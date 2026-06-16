import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches } from 'class-validator'

export class OtpVerifyDto {
  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  mobile!: string

  @IsString()
  @MinLength(6, { message: 'کد تأیید باید ۶ رقم باشد' })
  @MaxLength(6, { message: 'کد تأیید باید ۶ رقم باشد' })
  @Matches(/^\d{6}$/, { message: 'کد تأیید باید فقط شامل اعداد باشد' })
  code!: string

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'نام الزامی است' })
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'نام خانوادگی الزامی است' })
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل معتبر نیست' })
  email?: string
}
