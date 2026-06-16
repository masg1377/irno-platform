import type { UserRole, UserStatus } from './enums.js'

/**
 * Attached to every authenticated request by JwtAuthGuard.
 * Comes from the verified JWT payload — never from the frontend.
 */
export interface CurrentUser {
  id: string
  role: UserRole
  status: UserStatus
}

/**
 * Minimal user shape returned by /auth/me and user endpoints.
 * Never includes passwordHash.
 */
export interface UserDto {
  id: string
  email: string | null
  mobile: string
  role: UserRole
  status: UserStatus
  createdAt: string // ISO 8601 UTC
  /** Safe boolean — true if user has a password set. passwordHash is never exposed. */
  hasPassword: boolean
}

export interface ProfileDto {
  id: string
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  city: string | null
  telegramHandle: string | null
}

export interface UserWithProfileDto extends UserDto {
  profile: ProfileDto | null
}
