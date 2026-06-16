import { IsString, IsOptional, IsUUID, IsISO8601 } from 'class-validator'

export class AwardCreditDto {
  @IsUUID()
  creditId!: string

  @IsOptional()
  @IsString()
  evidenceNote?: string

  @IsOptional()
  @IsISO8601()
  expiresAt?: string

  @IsOptional()
  @IsString()
  sourceType?: string

  @IsOptional()
  @IsUUID()
  sourceId?: string
}
