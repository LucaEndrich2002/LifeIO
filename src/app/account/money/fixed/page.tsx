import { FixedCostsScreen } from "@/features/money/fixed-costs-screen";

export default async function FixedCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string }>;
}) {
  return <FixedCostsScreen query={await searchParams} />;
}
