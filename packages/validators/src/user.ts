import { z } from 'zod'
import { UserRole, UserStatus } from '@irno/types'

export const mobileSchema = z
  .string()
  .regex(/^(\+98|0)?9[0-9]{9}$/, 'شماره موبایل معتبر نیست')

export const loginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, 'رمز عبور الزامی است'),
})

export const createUserSchema = z.object({
  email: z.string().email('ایمیل معتبر نیست').optional(),
  mobile: mobileSchema,
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
  firstName: z.string().min(1, 'نام الزامی است'),
  lastName: z.string().min(1, 'نام خانوادگی الزامی است'),
  city: z.string().optional(),
})

export const updateUserSchema = z.object({
  email: z.string().email('ایمیل معتبر نیست').optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  city: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  telegramHandle: z.string().optional(),
})

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز عبور فعلی الزامی است'),
  newPassword: z.string().min(8, 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
