import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { to: "/" as const, label: "Home" },
  { to: "/how-it-works" as const, label: "How It Works" },
  { to: "/pricing" as const, label: "Pricing" },
  { to: "/contact" as const, label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background text-base rounded-none opacity-100 shadow-sm" style={{ height: "72px" }}>
      <div className="mx-auto h-full max-w-[1200px] px-6 items-center justify-between shadow-none flex flex-row">
        <Link to="/" className="flex items-center">
          <img
            src="/northern-linen-logo.png"
            alt="Northern Linen"
            className="h-[72px] w-auto object-contain"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[15px] font-medium text-secondary transition-colors hover:text-primary"
              activeProps={{ className: "text-[15px] font-medium text-primary border-b-2 border-primary pb-1" }}
              activeOptions={{ exact: true }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/book-now"
            className="rounded-lg bg-primary px-5 py-2.5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-[oklch(0.58_0.07_220)]"
          >
            Book Now
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-secondary md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav - full screen overlay */}
      {mobileOpen && (
        <nav className="fixed inset-0 top-[72px] z-50 bg-background md:hidden">
          <div className="flex flex-col items-center justify-center gap-8 pt-16">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[22px] font-semibold text-secondary transition-colors hover:text-primary"
                activeProps={{ className: "text-[22px] font-semibold text-primary" }}
                activeOptions={{ exact: true }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/book-now"
              className="rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-[oklch(0.58_0.07_220)]"
              onClick={() => setMobileOpen(false)}
            >
              Book Now
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
