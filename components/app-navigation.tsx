"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Home, Baby, Users, GraduationCap, CalendarCheck,
  ClipboardCheck, FileCheck, Clock, Sparkles, BookOpen, UserX,
  MessageSquare, CreditCard, UserCheck, Megaphone, Bell, Send,
  BarChart3, TrendingUp, Settings, ShieldCheck, Building2, LogOut,
  Menu, X, Heart,
} from "lucide-react";

const icons = {
  LayoutDashboard, Home, Baby, Users, GraduationCap, CalendarCheck,
  ClipboardCheck, FileCheck, Clock, Sparkles, BookOpen, UserX,
  MessageSquare, CreditCard, UserCheck, Megaphone, Bell, Send,
  BarChart3, TrendingUp, Settings, ShieldCheck, Building2,
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
};

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/parent" || href === "/super-admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavigationLinks({ items, onNavigate }: { items: AppNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="app-nav" aria-label="Navigation principale">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
            <span className="nav-icon"><Icon size={18} strokeWidth={2.1} /></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation({
  items,
  name,
  initials,
  areaLabel,
  logoutLabel,
  logoutAction,
}: {
  items: AppNavItem[];
  name: string;
  initials: string;
  areaLabel: string;
  logoutLabel: string;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const primary = items.slice(0, 4);

  return (
    <>
      <header className="mobile-app-header">
        <Link href={items[0]?.href || "/"} className="mobile-brand">
          <span className="brand-mark"><Heart size={19} fill="currentColor" /></span>
          <span><strong>Smart Kids</strong><small>{areaLabel}</small></span>
        </Link>
        <button className="icon-button" type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open}>
          <Menu size={22} />
        </button>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        {primary.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}><Icon size={20} /><span>{item.label}</span></Link>;
        })}
        <button type="button" onClick={() => setOpen(true)} aria-label="Plus de rubriques"><Menu size={20} /><span>Plus</span></button>
      </nav>

      {open && <button className="drawer-backdrop" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}
      <aside className={`mobile-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div><strong>{name}</strong><span>{areaLabel}</span></div>
          </div>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Fermer"><X size={21} /></button>
        </div>
        <div className="drawer-scroll"><NavigationLinks items={items} onNavigate={() => setOpen(false)} /></div>
        <form action={logoutAction} className="drawer-logout">
          <button type="submit" className="button secondary"><LogOut size={16} /> {logoutLabel}</button>
        </form>
      </aside>
    </>
  );
}
