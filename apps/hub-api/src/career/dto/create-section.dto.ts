import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator'

export type ResumeSectionType =
  | 'SUMMARY'
  | 'EXPERIENCE'
  | 'EDUCATION'
  | 'SKILL'
  | 'PROJECT'
  | 'LANGUAGE'
  | 'CERTIFICATE'
  | 'AWARD'
  | 'VOLUNTEER'
  | 'PUBLICATION'
  | 'REFERENCE'
  | 'CUSTOM'
  | 'LINK'
  | 'TEXT_BLOCK'

const SECTION_TYPES: ResumeSectionType[] = [
  'SUMMARY',
  'EXPERIENCE',
  'EDUCATION',
  'SKILL',
  'PROJECT',
  'LANGUAGE',
  'CERTIFICATE',
  'AWARD',
  'VOLUNTEER',
  'PUBLICATION',
  'REFERENCE',
  'CUSTOM',
  'LINK',
  'TEXT_BLOCK',
]

export class CreateSectionDto {
  @IsIn(SECTION_TYPES)
  type!: ResumeSectionType

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean
}
