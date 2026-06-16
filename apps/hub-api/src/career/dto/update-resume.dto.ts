import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsUUID()
  templateId?: string

  @IsOptional()
  @IsIn(['PUBLIC_LINK', 'PRIVATE', 'UNLISTED'])
  visibility?: 'PUBLIC_LINK' | 'PRIVATE' | 'UNLISTED'

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetRole?: string

  @IsOptional()
  @IsIn(['FA', 'EN', 'FA_EN'])
  language?: 'FA' | 'EN' | 'FA_EN'
}
