import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  IsObject,
  Matches,
  Min,
} from 'class-validator'
import { TaxonomyTermStatus } from '@irno/types'

export class UpdateTaxonomyTermDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug باید فقط شامل حروف کوچک، اعداد و خط تیره باشد',
  })
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsUUID()
  parentId?: string

  @IsOptional()
  @IsEnum(TaxonomyTermStatus)
  status?: TaxonomyTermStatus

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
