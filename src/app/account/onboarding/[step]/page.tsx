import { notFound } from "next/navigation";
import { stepSchema } from "@/domain/onboarding";
import { OnboardingScreen } from "@/features/onboarding/onboarding-screen";

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const step = stepSchema.safeParse((await params).step);
  if (!step.success) notFound();
  return <OnboardingScreen step={step.data} />;
}
