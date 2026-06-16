import { IsString, IsArray, IsEnum, MinLength, MaxLength } from 'class-validator'
import { NotificationChannel } from '@irno/types'

export class SendEventAnnouncementDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string

  @IsString()
  @MinLength(2)
  body!: string

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[]
}
