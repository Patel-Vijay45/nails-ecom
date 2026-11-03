import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const metadata = { title: "Admin login", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const store = await getStore();
  return (
    <div className="grid min-h-screen place-items-center bg-shell px-4">
      <div className="w-full max-w-sm">
        <p className="display text-center text-4xl">
          {store.name}
          <span className="text-berry">.</span>
        </p>
        <p className="mt-2 text-center text-sm text-muted">Shop admin</p>
        <LoginForm />
      </div>
    </div>
  );
}
