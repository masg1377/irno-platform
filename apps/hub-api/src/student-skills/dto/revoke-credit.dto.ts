import { IsString, IsOptional } from 'class-validator'

export class RevokeCreditDto {
  @IsOptional()
  @IsString()
  reason?: string
}
