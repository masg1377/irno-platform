import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator'

export class CreateExportDto {
  /**
   * Export format.
   * - 'HTML' — generates an HTML file (instant, no external deps)
   * - 'PDF'  — generates a real PDF via Playwright Chromium (takes ~5–15s)
   *
   * Omit to default to 'HTML'.
   */
  @IsOptional()
  @IsIn(['HTML', 'PDF'])
  format?: 'HTML' | 'PDF'

  @IsOptional()
  @IsBoolean()
  includeWatermark?: boolean

  @IsOptional()
  @IsString()
  templateOverrideId?: string
}
