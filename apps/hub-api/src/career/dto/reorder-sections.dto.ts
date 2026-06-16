import { IsArray, IsUUID } from 'class-validator'

export class ReorderSectionsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  sectionIds!: string[]
}
