"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Ideas", icon: "💡" },
  { href: "/publish", label: "Publisher", icon: "📱" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/assistant", label: "AI Assistant", icon: "🤖" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center justify-between px-4 z-50 md:hidden">
        <div>
          <span className="text-lg font-bold text-primary">Command Centre</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-hover"
        >
          <span className="text-xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar - desktop: fixed left, mobile: slide-in overlay */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-surface border-r border-border flex flex-col z-50 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Command Centre</h1>
          <p className="text-sm text-muted mt-1">Flavour Founders</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-surface-hover"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
              JH
            </div>
            <div>
              <p className="text-sm font-medium">John Hawes</p>
              <p className="text-xs text-muted">Flavour Founders</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
