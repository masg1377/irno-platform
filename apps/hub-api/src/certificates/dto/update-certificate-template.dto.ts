import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, MinLength, MaxLength } from 'class-validator'
import { CertificateTemplateType, CertificateLanguage } from '@irno/types'

export class UpdateCertificateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(CertificateTemplateType)
  type?: CertificateTemplateType

  @IsOptional()
  @IsEnum(CertificateLanguage)
  language?: CertificateLanguage

  @IsOptional()
  @IsObject()
  layoutConfig?: Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
