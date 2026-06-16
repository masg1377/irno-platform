import { IsDateString, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator'
import { MeetinoMeetingStatus } from '@irno/types'

export class UpdateMeetinoReferenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  joinUrl?: string

  @IsOptional()
  @IsEnum(MeetinoMeetingStatus)
  status?: MeetinoMeetingStatus

  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsDateString()
  endsAt?: string
}
