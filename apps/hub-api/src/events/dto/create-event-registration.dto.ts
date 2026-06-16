import { IsString, IsOptional, IsUUID, IsEmail, MaxLength, MinLength } from 'class-validator'

export class CreateEventRegistrationDto {
  @IsUUID()
  @IsOptional()
  userId?: string

  @IsUUID()
  @IsOptional()
  studentId?: string

  @IsUUID()
  @IsOptional()
  applicantId?: string

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  notes?: string
}
