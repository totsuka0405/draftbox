// components/NavBar.js
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../lib/i18n";

export default function NavBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const links = useMemo(() => ([
    { href: "/",        label: t("nav.home") },
    { href: "/limits",  label: t("nav.limits") },
    { href: "/privacy", label: t("nav.privacy") },
    { href: "/about",   label: t("nav.about") },
    { href: "/terms",   label: t("nav.terms") },
    { href: "/help",    label: t("nav.help") },
    { href: "/contact", label: t("nav.contact") },
    // ← /auth/reset はここに入れない
  ]), [t]);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="nav-wrap" role="banner">
      <nav className="nav container" aria-label="Global navigation">
        <div className="nav-left">
          <Link href="/" className="nav-brand">
            <span className="nav-logo">✦</span> {t("brand")}
          </Link>
        </div>

        <button
          className="nav-burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <ul className={`nav-links ${open ? "open" : ""}`}>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={`nav-link ${isActive(l.href) ? "active" : ""}`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
