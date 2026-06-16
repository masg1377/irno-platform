import { IsOptional, IsString, MaxLength } from 'class-validator'

export class RevokeCertificateDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  revokeReason?: string
}
