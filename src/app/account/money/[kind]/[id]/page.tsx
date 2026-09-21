import { notFound } from "next/navigation";
import { transactionKindSchema } from "@/domain/transactions";
import { TransactionScreen } from "@/features/money/transaction-screen";

export default async function TransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ month?: string; delete?: string }>;
}) {
  const route = await params;
  const kind = transactionKindSchema.safeParse(route.kind);
  if (!kind.success) notFound();
  const query = await searchParams;
  return (
    <TransactionScreen
      kind={kind.data}
      id={route.id}
      month={query.month}
      deleting={query.delete === "1"}
    />
  );
}
