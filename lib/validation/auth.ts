import { z } from "zod";

const email = z.email({ error: "이메일 형식을 확인해 주세요" }).trim().toLowerCase();
const password = z
  .string()
  .min(8, { error: "비밀번호는 8자 이상이어야 해요" })
  .max(72, { error: "비밀번호는 72자 이하로 입력해 주세요" });

export const loginSchema = z.object({ email, password });

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "이름을 입력해 주세요" })
    .max(30, { error: "이름은 30자 이하로 입력해 주세요" }),
  email,
  password,
});

export type AuthField = "name" | "email" | "password";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  message?: string;
  status?: "error" | "info";
  values?: { name?: string; email?: string };
};
