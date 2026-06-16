import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UpdateCareerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  headline?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  publicSlug?: string

  @IsOptional()
  @IsIn(['PUBLIC_LINK', 'PRIVATE', 'DISABLED'])
  visibility?: 'PUBLIC_LINK' | 'PRIVATE' | 'DISABLED'

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedinUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  githubUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  portfolioUrl?: string
}
