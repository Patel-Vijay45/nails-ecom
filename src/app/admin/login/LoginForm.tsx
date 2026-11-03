"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="card mt-8 space-y-4 p-6">
      <label className="block">
        <span className="label">Password</span>
        <input type="password" name="password" required autoFocus className="field" />
      </label>
      {state.error && <p className="text-sm text-berry">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
