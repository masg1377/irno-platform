import { IsString, IsOptional, IsEnum, IsInt, Min, MaxLength, MinLength, Matches, IsNotEmpty, IsUUID } from 'class-validator'
import { Transform } from 'class-transformer'
import { CourseLevel, CourseStatus } from '@irno/types'

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'عنوان دوره الزامی است' })
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title!: string

  @IsString()
  @IsNotEmpty({ message: 'slug الزامی است' })
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug باید فقط شامل حروف کوچک انگلیسی، اعداد و خط تیره باشد' })
  slug!: string

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  category?: string

  @IsUUID()
  @IsOptional()
  categoryId?: string

  @IsEnum(CourseLevel, { message: 'سطح دوره معتبر نیست' })
  @IsOptional()
  level?: CourseLevel = CourseLevel.ALL_LEVELS

  @IsInt({ message: 'شهریه باید عدد صحیح باشد' })
  @Min(0)
  @IsOptional()
  defaultTuitionToman?: number

  @IsEnum(CourseStatus, { message: 'وضعیت دوره معتبر نیست' })
  @IsOptional()
  status?: CourseStatus = CourseStatus.DRAFT
}
