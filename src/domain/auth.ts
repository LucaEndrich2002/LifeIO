import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email("Bitte gib eine gültige E-Mail-Adresse ein.")
  .toLowerCase();
export const passwordSchema = z
  .string()
  .min(12, "Verwende mindestens 12 Zeichen.")
  .max(128, "Verwende höchstens 128 Zeichen.");
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Bitte gib dein Passwort ein.").max(128),
});
export const emailFormSchema = z.object({ email: emailSchema });
export const verificationSchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .regex(/^\d{6}$/, "Gib den sechsstelligen Code aus der E-Mail ein."),
});
export const newPasswordSchema = z.object({ password: passwordSchema });
