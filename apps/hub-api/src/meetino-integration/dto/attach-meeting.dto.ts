import { IsBoolean, IsDateString, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'

export class AttachMeetinoMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  manualJoinUrl?: string

  @IsBoolean()
  createInMeetino!: boolean
}
