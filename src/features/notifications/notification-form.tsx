"use client";
import { useActionState } from "react";
import {
  checkNotifications,
  changeNotificationRead,
} from "@/server/notification-actions";
import {
  notificationHref,
  type NotificationQuery,
} from "@/domain/notifications";
import type { FormState } from "@/features/auth/form-state";

export function NotificationForm({
  query,
  item,
}: {
  query: NotificationQuery;
  item?: { id: string; revision: number; read: boolean };
}) {
  const [state, action, pending] = useActionState(
    item ? changeNotificationRead : checkNotifications,
    { status: "idle" } as FormState,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="filter" value={query.filter} />
      <input type="hidden" name="page" value={query.page} />
      {item && (
        <>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="revision" value={item.revision} />
          <input type="hidden" name="read" value={item.read ? "no" : "yes"} />
        </>
      )}
      <button
        disabled={pending}
        className="min-h-11 rounded-xl border bg-background px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending
          ? "Wird gespeichert …"
          : item
            ? item.read
              ? "Als ungelesen markieren"
              : "Als gelesen markieren"
            : "Hinweise prüfen"}
      </button>
      {state.message && (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className="space-y-2 text-sm"
        >
          <p>{state.message}</p>
          {state.status === "error" && (
            <a
              href={notificationHref(query)}
              className="inline-flex min-h-11 items-center underline"
            >
              Aktuellen Stand neu laden
            </a>
          )}
        </div>
      )}
    </form>
  );
}
