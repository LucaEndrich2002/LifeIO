"use client";

import { useActionState } from "react";
import { signOut } from "@/server/auth-actions";

export function SignOutButton() {
  const [state, action, pending] = useActionState(signOut, { status: "idle" });
  return (
    <form action={action}>
      <button
        disabled={pending}
        className="min-h-11 rounded-md text-sm font-medium text-primary disabled:opacity-60"
      >
        {pending ? "Abmelden …" : "Abmelden"}
      </button>
      {state.message && (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
