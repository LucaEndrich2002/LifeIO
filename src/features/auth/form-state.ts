export type AuthMode =
  | "login"
  | "signup"
  | "confirm"
  | "recover"
  | "recovery"
  | "password"
  | "resend";
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
};
