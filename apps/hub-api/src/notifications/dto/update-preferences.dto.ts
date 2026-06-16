import { IsBoolean, IsOptional } from 'class-validator'

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  smsTransactionalEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  smsMarketingEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  telegramEnabled?: boolean
}
