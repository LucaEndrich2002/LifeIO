import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthScreen } from "@/features/auth/auth-screen";
export default async function AuthPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const mode = z
    .enum(["login", "signup", "confirm", "recover", "recovery", "resend"])
    .safeParse((await params).mode);
  if (!mode.success) notFound();
  return <AuthScreen mode={mode.data} />;
}
