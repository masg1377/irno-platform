import { IsString, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class AddStudentNoteDto {
  @IsString()
  @MinLength(1, { message: 'متن یادداشت الزامی است' })
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  content!: string
}
