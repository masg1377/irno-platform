import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsObject,
  MaxLength,
  Matches,
  IsNotIn,
} from 'class-validator'

const RESERVED_SLUGS = ['admin', 'api', 'login', 'register', 'checker', 'templates', 'pricing', 'cv', 'career', 'public', 'u', 'studio', 'settings', 'profile', 'resumes']

export class UpdatePublicSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  @IsNotIn(RESERVED_SLUGS, { message: 'This slug is reserved' })
  publicSlug?: string | null

  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC_LINK', 'DISABLED'])
  visibility?: 'PRIVATE' | 'PUBLIC_LINK' | 'DISABLED'

  @IsOptional()
  @IsObject()
  contactVisibilityConfig?: {
    showEmail?: boolean
    showPhone?: boolean
    showLocation?: boolean
    showWebsite?: boolean
    showLinkedin?: boolean
    showGithub?: boolean
    showPortfolio?: boolean
  } | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null

  @IsOptional()
  @IsObject()
  publicThemeConfig?: Record<string, unknown> | null
}
