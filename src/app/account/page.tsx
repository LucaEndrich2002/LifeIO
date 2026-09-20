import { ProfileScreen } from "@/features/profile/profile-screen";
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return (
    <ProfileScreen
      passwordUpdated={(await searchParams).notice === "password-updated"}
    />
  );
}
