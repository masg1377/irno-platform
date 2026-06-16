import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator'
import { NotificationType, NotificationChannel } from '@irno/types'

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  key!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  body!: string

  @IsEnum(NotificationType)
  type!: NotificationType

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  variables?: Record<string, unknown>
}
