import type { OtpPurpose } from './enums.js'

// ── Phase 11.1: OTP DTOs ─────────────────────────────────────

/**
 * POST /api/v1/auth/otp/request
 * Request a one-time password for mobile login/registration/activation.
 */
export interface OtpRequestDto {
  mobile: string
  purpose?: OtpPurpose
}

/**
 * Response from POST /api/v1/auth/otp/request
 * Generic — never reveals whether the mobile exists in the system.
 */
export interface OtpRequestResponseDto {
  message: string
  /** Seconds until user can request another OTP */
  cooldownSeconds: number
  /** Only present in mock/dev mode (OTP_PROVIDER=mock). Never set in production. */
  devCode?: string
}

/**
 * POST /api/v1/auth/otp/verify
 * Verify OTP code. Logs in existing user or creates new APPLICANT account.
 */
export interface OtpVerifyDto {
  mobile: string
  code: string
  /** Required when creating a new account (user does not exist) */
  firstName?: string
  /** Required when creating a new account (user does not exist) */
  lastName?: string
  /** Optional — only for new account creation */
  email?: string
}

/**
 * Response from POST /api/v1/auth/otp/verify when profile is needed.
 * Returned with HTTP 200 + needsProfile: true to indicate two-step flow.
 */
export interface OtpNeedsProfileDto {
  needsProfile: true
  mobile: string
  message: string
}
