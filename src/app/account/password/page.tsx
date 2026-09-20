import { AuthScreen } from "@/features/auth/auth-screen";
import { requireIdentity } from "@/server/identity";
export default async function PasswordPage() {
  await requireIdentity();
  return <AuthScreen mode="password" />;
}
