import type { AppModuleKey, AppModuleStatus, UserRole } from './enums.js'

/**
 * Shape of an app card in the launcher.
 */
export interface AppModuleDto {
  id: string
  key: AppModuleKey
  nameLocal: string
  description: string | null
  url: string
  iconUrl: string | null
  status: AppModuleStatus
  allowedRoles: UserRole[]
  sortOrder: number
}
