"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  Menu,
  Phone,
  Sparkles,
  X,
} from "lucide-react";

type PublicHeaderProps = {
  portalLabel?: string;
};

export function PublicHeader({
  portalLabel = "Portail parents",
}: PublicHeaderProps) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
        <header className="public-header">
                  <div className="shell public-header-inner">
                        <Link href="/" className="public-brand" onClick={closeMenu}>
                    <span className="public-brand-mark">
                                    <GraduationCap size={23} />
          </span>

                    <span className="public-brand-text">
            <strong>Smart Kids</strong>
            <small>Education Care</small>
          </span>
        </Link>

              

        <nav className="public-nav" aria-label="Navigation principale">
                    <a href="#about">
                        <Sparkles size={15} />
            Notre approche
          </a>
                    <a href="#programme">Pédagogie</a>
                    <a href="#contact">Contact</a>
                              <a href="tel:+212661282288" className="public-phone">
                        <Phone size={15} />
            06 61 28 22 88
          </a>
         
          <Link href="/login" className="button public-header-button">
            {portalLabel}
                                    <ArrowRight size={16} />
          </Link>
        </nav>

                                                                                                                <button
          type="button"
          className="public-menu-button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
                <div className="public-mobile-menu">
                              <a href="#about" onClick={closeMenu}>
            Notre approche
          </a>
                              <a href="#programme" onClick={closeMenu}>
            Pédagogie
          </a>
                    <a href="#contact" onClick={closeMenu}>
            Contact
          </a>
          <a href="tel:+212661282288" onClick={closeMenu}>
            <Phone size={16} />
            06 61 28 22 88
          </a>
                    
          <Link href="/login" className="button" onClick={closeMenu}>
            {portalLabel}
                                    <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </header>
  );
}
