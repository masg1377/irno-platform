/**
 * User roles — enforced on backend, never trusted from frontend.
 */
export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    ACCOUNTANT = "ACCOUNTANT",
    TEACHER = "TEACHER",
    MENTOR = "MENTOR",
    STUDENT = "STUDENT",
    GUEST = "GUEST",
    LEAD = "LEAD"
}
/**
 * User account lifecycle status.
 */
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED",
    PENDING = "PENDING"
}
/**
 * Keys for apps in the Irno app launcher.
 * These map to AppModule.key in the database.
 */
export declare enum AppModuleKey {
    MEETINO = "MEETINO",
    IRNO_CHAT = "IRNO_CHAT",
    IRNO_LEARN = "IRNO_LEARN",
    IRNO_PROJECTS = "IRNO_PROJECTS",
    IRNO_AI = "IRNO_AI"
}
/**
 * Visibility/availability of an app in the launcher.
 */
export declare enum AppModuleStatus {
    ACTIVE = "ACTIVE",
    COMING_SOON = "COMING_SOON",
    DISABLED = "DISABLED"
}
//# sourceMappingURL=enums.d.ts.map