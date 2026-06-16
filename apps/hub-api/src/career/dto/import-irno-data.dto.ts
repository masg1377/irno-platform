import { IsBoolean, IsOptional } from 'class-validator'

export class ImportIrnoDataDto {
  @IsOptional()
  @IsBoolean()
  importSkills?: boolean

  @IsOptional()
  @IsBoolean()
  importCredits?: boolean

  @IsOptional()
  @IsBoolean()
  importCertificates?: boolean

  @IsOptional()
  @IsBoolean()
  importCourses?: boolean

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean
}
