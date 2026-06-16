import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator'

/**
 * DTO for creating a Job Match report.
 *
 * Three resume source modes (mutually exclusive):
 *   IRNO_RESUME    — resumeDocumentId references an existing Irno CV resume
 *   PASTED_TEXT    — resumeText contains the full resume pasted by the user
 *   UPLOADED_FILE  — text was extracted from an uploaded file (set by controller, not frontend)
 *
 * Rules:
 *   - Exactly one of resumeDocumentId or resumeText must be provided (or neither for JD-only mode)
 *   - Providing both returns 400
 *   - jobDescription is required with a minimum useful length
 *   - sourceType is auto-determined when not provided
 *   - sourceFileName is set by the controller for UPLOADED_FILE mode
 */
export class CreateJobMatchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  jobTitle?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetRole?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string

  /** Job description — required for a useful match */
  @IsNotEmpty({ message: 'شرح موقعیت شغلی الزامی است.' })
  @IsString()
  @MinLength(30, { message: 'شرح موقعیت شغلی باید حداقل ۳۰ کاراکتر باشد.' })
  @MaxLength(20000, { message: 'شرح موقعیت شغلی نباید از ۲۰۰۰۰ کاراکتر بیشتر باشد.' })
  jobDescription!: string

  /** IRNO_RESUME mode: reference an existing Irno CV resume */
  @IsOptional()
  @IsUUID()
  resumeDocumentId?: string

  /** Backward-compat alias for resumeDocumentId */
  @IsOptional()
  @IsUUID()
  resumeId?: string

  /** PASTED_TEXT mode: full resume text pasted by the user */
  @IsOptional()
  @IsString()
  @MinLength(30, { message: 'متن رزومه باید حداقل ۳۰ کاراکتر داشته باشد.' })
  @MaxLength(200000, { message: 'متن رزومه بیش از حد مجاز است.' })
  resumeText?: string

  /**
   * Source type — auto-determined if not provided.
   * Controllers set this explicitly for UPLOADED_FILE mode.
   */
  @IsOptional()
  @IsIn(['IRNO_RESUME', 'PASTED_TEXT', 'UPLOADED_FILE'])
  sourceType?: 'IRNO_RESUME' | 'PASTED_TEXT' | 'UPLOADED_FILE'

  /**
   * Original filename for UPLOADED_FILE mode.
   * Set by the upload controller — never trusted from browser JSON body.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceFileName?: string

  /** @deprecated Use resumeDocumentId */
  @IsOptional()
  @IsString({ each: true })
  requiredSkills?: string[]
}
