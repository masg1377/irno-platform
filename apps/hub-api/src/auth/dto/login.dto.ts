import { IsString, Matches, MinLength } from 'class-validator'

export class LoginDto {
  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  mobile!: string

  @IsString()
  @MinLength(1, { message: 'رمز عبور الزامی است' })
  password!: string
}
