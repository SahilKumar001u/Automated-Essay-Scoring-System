import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth";

const navClass = ({ isActive }) =>
  `rounded px-2 py-1 text-sm ${isActive ? "font-medium text-accent" : "text-muted hover:text-ink"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" className="font-serif text-xl font-medium text-ink">
            AES
          </Link>
          {user ? (
            <nav className="flex items-center gap-1 sm:gap-3" aria-label="Main">
              <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
              {user.role === "student" && <NavLink to="/submit" className={navClass}>New essay</NavLink>}
              {user.role === "educator" && <NavLink to="/assignments" className={navClass}>Assignments</NavLink>}
              <span className="hidden border-l border-line pl-3 text-sm text-muted sm:inline">
                {user.name} · {user.role}
              </span>
              <button
                className="btn px-3 py-1.5"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-2" aria-label="Main">
              <Link to="/login" className="btn px-3 py-1.5">Sign in</Link>
              <Link to="/register" className="btn btn-primary px-3 py-1.5">Create account</Link>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-line py-4 text-center text-xs text-muted">
        AI scores are a first reading. An educator's review is the final word.
      </footer>
    </div>
  );
}
