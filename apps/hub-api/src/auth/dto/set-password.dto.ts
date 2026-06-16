import { IsString, MinLength, Matches, IsOptional } from 'class-validator'

/**
 * PATCH /api/v1/auth/password
 *
 * Works for two cases:
 * 1. User has no password (OTP-only account) → currentPassword not required.
 * 2. User already has a password → currentPassword required.
 *
 * newPassword and confirmPassword must match (validated in service).
 */
export class SetPasswordDto {
  /** Required only when user already has a password. */
  @IsOptional()
  @IsString()
  currentPassword?: string

  /** Minimum 8 characters, at least one letter, at least one digit. */
  @IsString({ message: 'رمز عبور جدید الزامی است.' })
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  @Matches(/[a-zA-Z]/, { message: 'رمز عبور باید حداقل یک حرف داشته باشد.' })
  @Matches(/[0-9]/, { message: 'رمز عبور باید حداقل یک عدد داشته باشد.' })
  newPassword!: string

  /** Must match newPassword — enforced in service. */
  @IsString({ message: 'تکرار رمز عبور الزامی است.' })
  @MinLength(1)
  confirmPassword!: string
}
