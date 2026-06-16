import { IsArray, ValidateNested, IsString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

class ReorderItem {
  @IsString()
  id!: string

  @IsNumber()
  @Min(0)
  sortOrder!: number
}

export class ReorderPortfolioProjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items!: ReorderItem[]
}
