import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { monthInZone, monthSchema } from "@/domain/money";
import { dateInZone, type TransactionKind } from "@/domain/transactions";
import {
  TransactionForm,
  type TransactionInitial,
} from "@/features/money/transaction-form";
import { requireMoneyAccount } from "@/server/money";

export async function TransactionScreen({
  kind,
  id,
  month,
  deleting,
}: {
  kind: TransactionKind;
  id: string;
  month?: string;
  deleting: boolean;
}) {
  const { supabase, user, profile } = await requireMoneyAccount();
  const returnMonth = monthSchema.safeParse(
    month ?? monthInZone(new Date(), profile.time_zone),
  );
  if (!returnMonth.success || (id !== "new" && !z.uuid().safeParse(id).success))
    notFound();
  const today = dateInZone(new Date(), profile.time_zone);
  let initial: TransactionInitial = {
    id: randomUUID(),
    revision: 0,
    name: "",
    amount: null,
    date:
      kind === "income"
        ? returnMonth.data
        : today.startsWith(returnMonth.data)
          ? today
          : `${returnMonth.data}-01`,
    category: "other",
    operation: "create",
    returnMonth: returnMonth.data,
  };
  if (id !== "new") {
    const result =
      kind === "income"
        ? await supabase
            .from("incomes")
            .select("id,name,amount_minor,month,revision")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : await supabase
            .from("expenses")
            .select("id,name,amount_minor,spent_on,category,revision")
            .eq("id", id)
            .eq("user_id", user.id)
            .eq("recurrence", "once")
            .maybeSingle();
    if (result.error) throw new Error("Entry unavailable.");
    if (!result.data) notFound();
    const row = result.data;
    initial = {
      ...initial,
      id: row.id,
      name: row.name,
      amount: row.amount_minor,
      revision: row.revision,
      date: "month" in row ? row.month.slice(0, 7) : row.spent_on!,
      category: "category" in row ? row.category! : "other",
      operation: deleting ? "delete" : "update",
    };
  } else if (deleting) notFound();
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Money · EUR
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {kind === "income" ? "Einnahme" : "Ausgabe"}{" "}
          {initial.operation === "create"
            ? "erfassen"
            : initial.operation === "delete"
              ? "löschen"
              : "bearbeiten"}
        </h1>
      </div>
      <TransactionForm
        key={`${kind}-${id}-${initial.operation}`}
        kind={kind}
        initial={initial}
      />
    </div>
  );
}
