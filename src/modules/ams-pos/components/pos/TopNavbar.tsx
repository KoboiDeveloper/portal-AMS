
import { useEffect, useState } from "react";
import {
  BarChart2,
  BarcodeIcon,
  Bell,
  ChevronDown,
  Clock,
  History,
  Package,
  RefreshCcw,
  Settings,
  User,
} from "lucide-react";
import { usePosStore } from "../../store/use-pos-store";
import { cn } from "../../lib/utils";
import { useStoreScope } from "../../../../hooks/useStoreScope";

function LiveClock() {
  const fmt = () =>
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []); // fmt defined in scope, stable
  return <span className="tabular-nums font-semibold text-zinc-700">{time}</span>;
}

const QUICK_MENUS = [
  { id: "riwayat",  icon: History,    label: "Riwayat",   color: "text-blue-600"   },
  { id: "stok",     icon: Package,    label: "Stok",      color: "text-emerald-600" },
  { id: "retur",    icon: RefreshCcw, label: "Retur",     color: "text-orange-600" },
  { id: "laporan",  icon: BarChart2,  label: "Laporan",   color: "text-purple-600" },
  { id: "settings", icon: Settings,   label: "Settings",  color: "text-zinc-500"   },
] as const;

export function TopNavbar() {
  const { cart, heldOrders, member } = usePosStore();
  const { storeName, storeId } = useStoreScope();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="flex h-12 shrink-0 flex-col border-b border-[#dbdfea] bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between px-4">

        {/* LEFT — brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
            <BarcodeIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900">
            AMS<span className="text-primary">POS</span>
          </span>
          <span className="ml-1 hidden rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:inline">
            {storeName || storeId || "Kasir"}
          </span>

          {/* quick menu pills */}
          <div className="ml-4 hidden items-center gap-1 lg:flex">
            {QUICK_MENUS.map((m) => {
              const Icon = m.icon;
              const active = activeMenu === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMenu(active ? null : m.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-zinc-800 bg-zinc-800 text-white"
                      : "border-[#dbdfea] bg-[#f5f6fa] text-zinc-600 hover:bg-[#ebeef2]"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : m.color)} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER — clock */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{today} &bull;</span>
          <LiveClock />
        </div>

        {/* RIGHT — status + user */}
        <div className="flex items-center gap-2">
          {/* cart badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{cart.length} item</span>
          </div>

          {/* hold badge */}
          {heldOrders.length > 0 && (
            <div className="hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:flex">
              <span>{heldOrders.length} hold</span>
            </div>
          )}

          {/* notif */}
          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:bg-zinc-100"
          >
            <Bell className="h-4 w-4" />
          </button>

          {/* cashier */}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-1.5 pr-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white">
              {member
                ? member.name.split(" ").slice(0, 2).map((n) => n[0]).join("")
                : <User className="h-3 w-3" />}
            </div>
            <span className="hidden sm:inline">
              {member ? member.name.split(" ")[0] : "Cashier"}
            </span>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Active menu hint bar */}
      {activeMenu && (
        <div className="flex h-8 items-center gap-2 border-t border-[#dbdfea] bg-[#f5f6fa] px-4">
          {(() => {
            const found = QUICK_MENUS.find((m) => m.id === activeMenu);
            if (!found) return null;
            const Icon = found.icon;
            return (
              <>
                <Icon className={cn("h-3.5 w-3.5", found.color)} />
                <span className="text-xs text-zinc-500">
                  {found.label} — fitur ini akan segera tersedia
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMenu(null)}
                  className="ml-auto text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  tutup
                </button>
              </>
            );
          })()}
        </div>
      )}
    </header>
  );
}
