import { notFound } from "next/navigation";
import { transactionKindSchema } from "@/domain/transactions";
import { TransactionScreen } from "@/features/money/transaction-screen";
import { PlanScreen } from "@/features/money/plan-screen";

export default async function TransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ month?: string; delete?: string }>;
}) {
  const route = await params;
  const query = await searchParams;
  if (route.kind === "fixed" || route.kind === "budget")
    return (
      <PlanScreen
        kind={route.kind}
        id={route.id}
        month={query.month}
        ending={query.delete === "1"}
      />
    );
  const kind = transactionKindSchema.safeParse(route.kind);
  if (!kind.success) notFound();
  return (
    <TransactionScreen
      kind={kind.data}
      id={route.id}
      month={query.month}
      deleting={query.delete === "1"}
    />
  );
}
