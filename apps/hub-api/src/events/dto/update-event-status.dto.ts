import { IsEnum, IsBoolean, IsOptional } from 'class-validator'
import { EventStatus } from '@irno/types'

export class UpdateEventStatusDto {
  @IsEnum(EventStatus)
  status!: EventStatus

  @IsBoolean()
  @IsOptional()
  notifyParticipants?: boolean
}
