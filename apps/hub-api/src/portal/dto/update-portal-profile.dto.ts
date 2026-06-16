import { IsString, IsEmail, IsOptional, IsUrl, MinLength } from 'class-validator'

export class UpdatePortalProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string

  @IsOptional()
  @IsEmail()
  email?: string | null

  @IsOptional()
  @IsString()
  city?: string | null

  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null
}
