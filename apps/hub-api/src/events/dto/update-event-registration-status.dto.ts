import { IsEnum } from 'class-validator'
import { EventRegistrationStatus } from '@irno/types'

export class UpdateEventRegistrationStatusDto {
  @IsEnum(EventRegistrationStatus)
  status!: EventRegistrationStatus
}
