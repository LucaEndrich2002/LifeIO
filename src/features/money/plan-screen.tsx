import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { monthInZone, monthSchema } from "@/domain/money";
import { nextMonth } from "@/domain/plans";
import { PlanForm, type PlanInitial } from "@/features/money/plan-form";
import { requireMoneyAccount } from "@/server/money";

export async function PlanScreen({
  kind,
  id,
  month,
  ending,
}: {
  kind: "fixed" | "budget";
  id: string;
  month?: string;
  ending: boolean;
}) {
  const { supabase, user, profile } = await requireMoneyAccount();
  const selected = monthSchema.safeParse(
    month ?? monthInZone(new Date(), profile.time_zone),
  );
  if (
    !selected.success ||
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    (id === "new" && ending)
  )
    notFound();
  let initial: PlanInitial = {
    id: randomUUID(),
    new_id: randomUUID(),
    revision: 0,
    operation: "create",
    name: "",
    amount: null,
    month: selected.data,
    start_month: selected.data,
    end_month: "",
    return_month: selected.data,
  };
  if (id !== "new") {
    if (kind === "fixed") {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id,name,amount_minor,revision,start_month,end_month,superseded_by",
        )
        .eq("user_id", user.id)
        .eq("id", id)
        .eq("recurrence", "monthly")
        .maybeSingle();
      if (error) throw new Error("Fixed cost unavailable.");
      if (!data) notFound();
      if (data.superseded_by)
        return (
          <div className="space-y-5">
            <h1 className="text-3xl font-semibold">Früherer Fixkostenstand</h1>
            <p>
              Diese Angaben bleiben für frühere Monate erhalten. Eine spätere
              Fassung ist bereits gespeichert.
            </p>
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/account/money/fixed/${data.superseded_by}?month=${selected.data}`}
            >
              Spätere Fassung öffnen
            </Link>
            <br />
            <Link
              className="underline"
              href={`/account/money?month=${selected.data}`}
            >
              Zur Monatsübersicht
            </Link>
          </div>
        );
      const start = data.start_month!.slice(0, 7);
      const firstChange = nextMonth(start);
      if (!ending && (!firstChange || data.end_month?.slice(0, 7) === start))
        return (
          <div className="space-y-5">
            <h1 className="text-3xl font-semibold">
              Keine spätere Änderung möglich
            </h1>
            <p>
              Diese Fassung gilt nur für ihren Startmonat oder endet am letzten
              unterstützten Monat. Ihre Werte bleiben erhalten.
            </p>
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/account/money?month=${selected.data}`}
            >
              Zur Monatsübersicht
            </Link>
          </div>
        );
      const min = ending ? start : firstChange!;
      const end = data.end_month?.slice(0, 7) ?? "";
      const candidate = selected.data < min ? min : selected.data;
      initial = {
        ...initial,
        id: data.id,
        name: data.name,
        amount: data.amount_minor,
        revision: data.revision,
        start_month: start,
        end_month: end,
        month: ending
          ? end || candidate
          : end && candidate > end
            ? end
            : candidate,
        operation: ending ? "end" : "change",
      };
    } else {
      const { data, error } = await supabase
        .from("budgets")
        .select("id,name,amount_minor,revision,month")
        .eq("user_id", user.id)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error("Budget unavailable.");
      if (!data) notFound();
      initial = {
        ...initial,
        id: data.id,
        name: data.name,
        amount: data.amount_minor,
        revision: data.revision,
        month: data.month.slice(0, 7),
        operation: ending ? "delete" : "update",
      };
    }
  }
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-xs font-medium tracking-widest text-primary uppercase">
          Money · EUR
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {kind === "fixed" ? "Fixkosten" : "Monatsbudget"}{" "}
          {initial.operation === "create"
            ? "anlegen"
            : initial.operation === "end"
              ? "beenden"
              : initial.operation === "delete"
                ? "löschen"
                : "ändern"}
        </h1>
      </div>
      <PlanForm
        key={`${kind}-${id}-${initial.operation}`}
        kind={kind}
        initial={initial}
      />
    </div>
  );
}
