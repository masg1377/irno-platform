import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  IsDateString,
  Min,
} from 'class-validator'

export class UpdatePortfolioProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  problem?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  solution?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  impact?: string | null

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[]

  @IsOptional()
  @IsArray()
  links?: { label: string; url: string }[] | null

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[] | null

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[]

  @IsOptional()
  @IsDateString()
  startDate?: string | null

  @IsOptional()
  @IsDateString()
  endDate?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectType?: string | null

  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC_LINK', 'PUBLIC'])
  visibility?: 'PRIVATE' | 'PUBLIC_LINK' | 'PUBLIC'

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  demoUrl?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  repoUrl?: string | null

  @IsOptional()
  @IsObject()
  caseStudy?: Record<string, unknown> | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null
}
