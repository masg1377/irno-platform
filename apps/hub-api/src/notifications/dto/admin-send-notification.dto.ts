import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator'
import { NotificationType, NotificationChannel, NotificationPriority, UserRole } from '@irno/types'

export class AdminSendNotificationDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  body!: string

  @IsEnum(NotificationType)
  type!: NotificationType

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[]

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[]

  @IsOptional()
  @IsString()
  relatedEntityType?: string

  @IsOptional()
  @IsString()
  relatedEntityId?: string
}
