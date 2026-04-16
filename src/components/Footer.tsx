import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-soft bg-background">
      <div className="mx-auto max-w-[1200px] px-6 pt-12 pb-8">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Column 1 */}
          <div className="text-center">
            <img src="/northern-linen-logo.png" alt="Northern Linen" className="h-[160px] w-auto object-contain mx-auto" />
            <p className="mt-2 text-[15px] font-medium text-secondary">Get Your Time Back</p>
          </div>

          {/* Column 2 */}
          <div className="text-center md:text-left">
            <p className="text-base font-semibold text-secondary">Quick Links</p>
            <div className="mt-3 flex flex-col gap-1">
              {[
                { to: "/" as const, label: "Home" },
                { to: "/how-it-works" as const, label: "How It Works" },
                { to: "/pricing" as const, label: "Pricing" },
                { to: "/book-now" as const, label: "Book Now" },
                { to: "/contact" as const, label: "Contact" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-secondary leading-8 transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3 */}
          <div className="text-center md:text-left">
            <p className="text-[16px] font-semibold text-[#1B3A4B]">Contact</p>
            <div className="mt-3 flex flex-col gap-1 text-[14px] text-[#1B3A4B] leading-8">
              <p>info@northernlinen.com</p>
              <p>Service area: South Loop Bloomington MN</p>
              <p>Pickup hours: Monday through Saturday 7am to 9am</p>
              <p>Delivery fee: Always free</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-soft pt-4 text-center">
          <p className="text-[13px] text-secondary">
            © {new Date().getFullYear()} Northern Linen. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
