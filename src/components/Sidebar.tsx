import type { PageKey } from "../types";

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const items: Array<{ key: PageKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "cards", label: "Cards" },
  { key: "import", label: "Import" },
  { key: "review", label: "Review" },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex min-h-0 w-full flex-col border-b border-slate-200 bg-white px-4 py-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Lingua Nexus
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-950">Corpus SRS</h1>
      </div>
      <nav className="grid grid-cols-4 gap-2 md:grid-cols-1">
        {items.map((item) => (
          <button
            key={item.key}
            className={`rounded-md px-3 py-2 text-left text-sm font-medium transition ${
              activePage === item.key
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            type="button"
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
