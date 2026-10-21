import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Swords } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <header className="mx-auto mt-8 flex max-w-6xl items-center justify-between gap-4 rounded-xl border bg-panel px-6 py-4">
      <Link to="/" className="flex items-center gap-2 text-primary">
        <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-primary rotate-45">
          <Swords className="h-5 w-5 -rotate-45" />
        </span>
        <span className="ml-2 font-display text-lg font-bold text-foreground">PvP Ladder</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm md:flex">
        <Link to="/" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Rankings</Link>
        <Link to="/admin" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
          {isAdmin ? "Admin" : "Staff login"}
        </Link>
      </nav>
      <form
        onSubmit={(e) => { e.preventDefault(); navigate({ to: "/", search: q ? { q } : {} }); }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search player..."
          className="w-44 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring md:w-52"
        />
      </form>
    </header>
  );
}
