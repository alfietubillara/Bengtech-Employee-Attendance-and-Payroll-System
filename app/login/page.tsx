import { Smartphone } from "lucide-react";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-beng-mist px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-beng-green text-white">
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-beng-ink">Bengtech</h1>
            <p className="text-sm text-slate-500">Attendance and Payroll</p>
          </div>
        </div>

        {params.error ? <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{params.error}</div> : null}

        <form action={signIn} className="space-y-4">
          <div>
            <label className="label" htmlFor="login">
              Email or Username
            </label>
            <input className="field mt-1" id="login" name="login" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input className="field mt-1" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn-primary w-full" type="submit">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
