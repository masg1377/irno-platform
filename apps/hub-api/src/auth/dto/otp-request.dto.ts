import { IsString, IsOptional, Matches, IsIn } from 'class-validator'

export class OtpRequestDto {
  @Matches(/^(\+98|0)?9[0-9]{9}$/, { message: 'شماره موبایل معتبر نیست' })
  mobile!: string

  @IsOptional()
  @IsString()
  @IsIn(['LOGIN', 'REGISTER', 'ACTIVATE_ACCOUNT', 'PASSWORD_RESET'])
  purpose?: string
}
