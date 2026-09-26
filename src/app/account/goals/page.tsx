import { GoalsScreen } from "@/features/goals/goals-screen";
export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return <GoalsScreen query={await searchParams} />;
}
