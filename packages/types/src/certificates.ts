import {
  CertificateTemplateType,
  CertificateLanguage,
  StudentCertificateStatus,
  StudentCertificateSourceType,
} from './enums.js'

export interface CertificateTemplateDto {
  id: string
  title: string
  slug: string
  description: string | null
  type: CertificateTemplateType
  language: CertificateLanguage
  layoutConfig: Record<string, unknown> | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PaginatedCertificateTemplates {
  data: CertificateTemplateDto[]
  total: number
  page: number
  limit: number
}

export interface StudentCertificateDto {
  id: string
  studentId: string
  studentName?: string
  templateId: string | null
  templateTitle?: string | null
  title: string
  certificateNumber: string
  type: CertificateTemplateType
  status: StudentCertificateStatus
  issuedAt: string
  expiresAt: string | null
  sourceType: StudentCertificateSourceType | null
  sourceId: string | null
  issuedById: string
  issuedByName?: string | null
  verificationCode: string
  publicVerifyEnabled: boolean
  revokedAt: string | null
  revokeReason: string | null
  createdAt: string
}

export interface PaginatedStudentCertificates {
  data: StudentCertificateDto[]
  total: number
  page: number
  limit: number
}

export interface PublicCertificateVerificationDto {
  certificateNumber?: string
  title?: string
  studentDisplayName?: string
  type?: CertificateTemplateType
  status?: StudentCertificateStatus
  issuedAt?: string
  expiresAt?: string | null
  sourceSummary?: string | null
  isValid: boolean
  verifiedBy: string
  message?: string
}

export interface IssueCertificateDto {
  templateId?: string
  title: string
  type: CertificateTemplateType
  sourceType?: StudentCertificateSourceType
  sourceId?: string
  expiresAt?: string
  publicVerifyEnabled?: boolean
  metadata?: Record<string, unknown>
}

export interface RevokeCertificateDto {
  revokeReason?: string
}

export interface PortalCertificateDto {
  id: string
  title: string
  certificateNumber: string
  type: CertificateTemplateType
  status: StudentCertificateStatus
  issuedAt: string
  expiresAt: string | null
  verificationCode: string
  publicVerifyEnabled: boolean
}
