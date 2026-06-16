import { IsEnum, IsDateString, IsOptional, IsUUID } from 'class-validator'
import { EventReminderType, NotificationChannel } from '@irno/types'

export class CreateEventReminderDto {
  @IsEnum(EventReminderType)
  type!: EventReminderType

  @IsDateString()
  scheduledAt!: string

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel

  @IsUUID()
  @IsOptional()
  notificationTemplateId?: string
}
