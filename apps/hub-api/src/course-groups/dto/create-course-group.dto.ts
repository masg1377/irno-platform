import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MaxLength, MinLength, IsUUID, IsDateString, IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'
import { CourseGroupStatus } from '@irno/types'

export class CreateCourseGroupDto {
  @IsUUID()
  courseId!: string

  @IsString()
  @IsNotEmpty({ message: 'نام گروه الزامی است' })
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string

  @IsUUID()
  @IsOptional()
  teacherId?: string | null

  @IsDateString({}, { message: 'تاریخ شروع معتبر نیست' })
  @IsOptional()
  startDate?: string | null

  @IsDateString({}, { message: 'تاریخ پایان معتبر نیست' })
  @IsOptional()
  endDate?: string | null

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  scheduleNotes?: string | null

  @IsInt({ message: 'ظرفیت باید عدد صحیح باشد' })
  @Min(1)
  @Max(10000)
  @IsOptional()
  capacity?: number | null

  @IsEnum(CourseGroupStatus, { message: 'وضعیت گروه معتبر نیست' })
  @IsOptional()
  status?: CourseGroupStatus = CourseGroupStatus.UPCOMING

  @IsString()
  @IsOptional()
  @MaxLength(100)
  meetinoRoomId?: string | null
}
