import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator'

export class UpdateResumeStyleDto {
  @IsString()
  @IsOptional()
  fontFamily?: string

  @IsNumber()
  @IsOptional()
  fontSize?: number

  @IsString()
  @IsOptional()
  accentColor?: string

  @IsString()
  @IsOptional()
  spacing?: 'compact' | 'normal' | 'comfortable'

  @IsString()
  @IsOptional()
  pageSize?: 'A4' | 'LETTER'

  @IsObject()
  @IsOptional()
  customConfig?: Record<string, unknown>
}

export class UpdateResumeTemplateDto {
  @IsString()
  @IsOptional()
  templateId?: string | null
}

export class UpdateResumeWatermarkDto {
  @IsBoolean()
  @IsOptional()
  includeWatermark?: boolean

  @IsObject()
  @IsOptional()
  watermarkConfig?: {
    type?: string
    text?: string
    opacity?: number
  }
}
