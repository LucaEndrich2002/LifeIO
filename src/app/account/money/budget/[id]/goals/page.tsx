import { BudgetGoalsScreen } from "@/features/money/budget-goals-screen";
export default async function BudgetGoalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <BudgetGoalsScreen
      id={(await params).id}
      page={(await searchParams).page}
    />
  );
}
