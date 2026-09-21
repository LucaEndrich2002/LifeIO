import { redirect } from "next/navigation";
import { requireMoneyAccount } from "@/server/money";

export async function OverviewScreen() {
  const { onboarding } = await requireMoneyAccount();
  return redirect(`/account/money?month=${onboarding.month.slice(0, 7)}`);
}
