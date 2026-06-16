import { z } from 'zod';
import { UserRole, UserStatus } from "@irno/types";
export declare const mobileSchema: z.ZodString;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    mobile: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<typeof UserRole>>;
}, z.core.$strip>;
export declare const updateUserStatusSchema: z.ZodObject<{
    status: z.ZodEnum<typeof UserStatus>;
}, z.core.$strip>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
//# sourceMappingURL=user.d.ts.map