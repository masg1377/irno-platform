"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModuleStatus = exports.AppModuleKey = exports.UserStatus = exports.UserRole = void 0;
/**
 * User roles — enforced on backend, never trusted from frontend.
 */
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    UserRole["TEACHER"] = "TEACHER";
    UserRole["MENTOR"] = "MENTOR";
    UserRole["STUDENT"] = "STUDENT";
    UserRole["GUEST"] = "GUEST";
    UserRole["LEAD"] = "LEAD";
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * User account lifecycle status.
 */
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["PENDING"] = "PENDING";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
/**
 * Keys for apps in the Irno app launcher.
 * These map to AppModule.key in the database.
 */
var AppModuleKey;
(function (AppModuleKey) {
    AppModuleKey["MEETINO"] = "MEETINO";
    AppModuleKey["IRNO_CHAT"] = "IRNO_CHAT";
    AppModuleKey["IRNO_LEARN"] = "IRNO_LEARN";
    AppModuleKey["IRNO_PROJECTS"] = "IRNO_PROJECTS";
    AppModuleKey["IRNO_AI"] = "IRNO_AI";
})(AppModuleKey || (exports.AppModuleKey = AppModuleKey = {}));
/**
 * Visibility/availability of an app in the launcher.
 */
var AppModuleStatus;
(function (AppModuleStatus) {
    AppModuleStatus["ACTIVE"] = "ACTIVE";
    AppModuleStatus["COMING_SOON"] = "COMING_SOON";
    AppModuleStatus["DISABLED"] = "DISABLED";
})(AppModuleStatus || (exports.AppModuleStatus = AppModuleStatus = {}));
//# sourceMappingURL=enums.js.map