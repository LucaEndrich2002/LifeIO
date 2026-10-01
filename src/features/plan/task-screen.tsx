import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { taskQuerySchema } from "@/domain/tasks";
import { dateInZone } from "@/domain/transactions";
import { TaskForm, type TaskInitial } from "@/features/plan/task-form";
import type { TaskSearch } from "@/features/plan/tasks-screen";
import { requireMoneyAccount } from "@/server/money";
import { loadTask } from "@/server/tasks";

export async function TaskScreen({
  id,
  query,
  action,
}: {
  id: string;
  query: TaskSearch;
  action?: string;
}) {
  const account = await requireMoneyAccount();
  const parsed = taskQuerySchema.safeParse({
    ...query,
    day: query.day ?? dateInZone(new Date(), account.profile.time_zone),
  });
  if (
    !parsed.success ||
    (id !== "new" && !z.uuid().safeParse(id).success) ||
    (action !== undefined && action !== "remove") ||
    (id === "new" && action)
  )
    notFound();
  let initial: TaskInitial = {
    ...parsed.data,
    id: randomUUID(),
    revision: 0,
    operation: "create",
    title: "",
    priority: "normal",
    due_on: "",
  };
  if (id !== "new") {
    const task = await loadTask(account, id);
    initial = {
      ...initial,
      ...task,
      due_on: task.due_on ?? "",
      operation: action === "remove" ? "remove" : "update",
    };
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">
        {id === "new"
          ? "Aufgabe anlegen"
          : action === "remove"
            ? "Aufgabe löschen"
            : "Aufgabe bearbeiten"}
      </h1>
      <TaskForm initial={initial} />
      {id !== "new" && action !== "remove" && (
        <Link
          href={`/account/plan/${id}/goals`}
          className="inline-flex min-h-11 items-center text-sm underline"
        >
          Verknüpfte Ziele
        </Link>
      )}
    </div>
  );
}
