import { IsOptional, IsUUID } from 'class-validator'

export class AssignApplicantDto {
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null
}
