import { MoneyScreen, type MoneyQuery } from "@/features/money/money-screen";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<MoneyQuery>;
}) {
  return <MoneyScreen query={await searchParams} />;
}
