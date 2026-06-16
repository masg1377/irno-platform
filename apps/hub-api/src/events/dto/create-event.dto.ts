import { IsString, IsEnum, IsOptional, IsInt, Min, IsDateString, IsUrl, MaxLength, MinLength, Matches } from 'class-validator'
import { EventType, EventDeliveryMode, EventRegistrationMode, EventStatus } from '@irno/types'

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens' })
  slug!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsEnum(EventType)
  type!: EventType

  @IsEnum(EventDeliveryMode)
  deliveryMode!: EventDeliveryMode

  @IsEnum(EventRegistrationMode)
  registrationMode!: EventRegistrationMode

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus

  @IsDateString()
  startsAt!: string

  @IsDateString()
  @IsOptional()
  endsAt?: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  onlineUrl?: string

  @IsString()
  @MaxLength(100)
  @IsOptional()
  meetinoMeetingId?: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  meetinoJoinUrl?: string

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number

  @IsInt()
  @Min(0)
  priceToman!: number

  @IsDateString()
  @IsOptional()
  registrationDeadline?: string
}
