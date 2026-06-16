import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator'
import { CertificateTemplateType, StudentCertificateSourceType } from '@irno/types'

export class IssueCertificateDto {
  @IsOptional()
  @IsUUID()
  templateId?: string

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title!: string

  @IsEnum(CertificateTemplateType)
  type!: CertificateTemplateType

  @IsOptional()
  @IsEnum(StudentCertificateSourceType)
  sourceType?: StudentCertificateSourceType

  @IsOptional()
  @IsUUID()
  sourceId?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  publicVerifyEnabled?: boolean

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
