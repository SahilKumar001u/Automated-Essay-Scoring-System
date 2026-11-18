import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { useAuth } from "../auth";
import { ErrorNote } from "../components/ui";

const ROLES = [
  ["student", "Student", "Submit essays and read feedback"],
  ["educator", "Educator", "Set assignments and review scores"],
];

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = isRegister ? form : { email: form.email, password: form.password };
      login(await api(`/auth/${mode}`, { method: "POST", body }));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-3xl font-medium">{isRegister ? "Create your account" : "Sign in"}</h1>
      <p className="mt-1 text-sm text-muted">
        {isRegister ? "Already registered? " : "New here? "}
        <Link className="font-medium text-accent underline" to={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-4">
        {isRegister && (
          <>
            <fieldset>
              <legend className="label">I am a</legend>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(([value, title, hint]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-md border p-3 has-focus-visible:outline-2 has-focus-visible:outline-accent ${
                      form.role === value ? "border-accent bg-accent-soft" : "border-line bg-white"
                    }`}
                  >
                    <input type="radio" name="role" value={value} checked={form.role === value} onChange={set("role")} className="sr-only" />
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="input" required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} />
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required autoComplete="email" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={form.password}
            onChange={set("password")}
          />
          {isRegister && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
