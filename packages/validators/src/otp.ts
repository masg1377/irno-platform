import { z } from 'zod'

const mobileRegex = /^(\+98|0)?9[0-9]{9}$/

/**
 * POST /api/v1/auth/otp/request
 */
export const otpRequestSchema = z.object({
  mobile: z
    .string()
    .min(1, 'شماره موبایل الزامی است')
    .regex(mobileRegex, 'شماره موبایل معتبر نیست'),
  purpose: z
    .enum(['LOGIN', 'REGISTER', 'ACTIVATE_ACCOUNT', 'PASSWORD_RESET'])
    .optional(),
})

export type OtpRequestInput = z.infer<typeof otpRequestSchema>

/**
 * POST /api/v1/auth/otp/verify
 */
export const otpVerifySchema = z.object({
  mobile: z
    .string()
    .min(1, 'شماره موبایل الزامی است')
    .regex(mobileRegex, 'شماره موبایل معتبر نیست'),
  code: z
    .string()
    .length(6, 'کد تأیید باید ۶ رقم باشد')
    .regex(/^\d{6}$/, 'کد تأیید باید فقط شامل اعداد باشد'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email('ایمیل معتبر نیست').optional(),
})

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>
