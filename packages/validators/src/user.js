"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatusSchema = exports.createUserSchema = exports.mobileSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("@irno/types");
exports.mobileSchema = zod_1.z
    .string()
    .regex(/^(\+98|0)?9[0-9]{9}$/, 'شماره موبایل معتبر نیست');
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('ایمیل معتبر نیست').optional(),
    mobile: exports.mobileSchema,
    password: zod_1.z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
    role: zod_1.z.nativeEnum(types_1.UserRole).default(types_1.UserRole.STUDENT),
});
exports.updateUserStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(types_1.UserStatus),
});
//# sourceMappingURL=user.js.map