import type { UserRole, UserStatus } from './enums.js';
/**
 * Minimal user shape returned by /auth/me and user endpoints.
 * Never includes passwordHash.
 */
export interface UserDto {
    id: string;
    email: string | null;
    mobile: string;
    role: UserRole;
    status: UserStatus;
    createdAt: string;
}
export interface ProfileDto {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    city: string | null;
    telegramHandle: string | null;
}
export interface UserWithProfileDto extends UserDto {
    profile: ProfileDto | null;
}
//# sourceMappingURL=user.d.ts.map