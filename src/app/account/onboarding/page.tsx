import { redirect } from "next/navigation";
import { nextStep } from "@/domain/onboarding";
import { loadOnboarding } from "@/server/onboarding";

export default async function OnboardingPage() {
  const { state } = await loadOnboarding();
  redirect(
    state?.completed_at
      ? "/account/overview"
      : `/account/onboarding/${nextStep(state)}`,
  );
}
