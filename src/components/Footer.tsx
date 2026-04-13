export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold tracking-tight text-white">
            Northern Linen
          </p>
          <div className="flex flex-col items-center gap-1 text-sm text-white/70">
            <a href="https://northernlinen.com" className="transition-colors hover:text-white">
              northernlinen.com
            </a>
            <a href="mailto:ahmed@northernlinen.com" className="transition-colors hover:text-white">
              ahmed@northernlinen.com
            </a>
            <a href="tel:+10000000000" className="transition-colors hover:text-white">
              (000) 000-0000
            </a>
          </div>
          <p className="mt-4 text-xs text-white/40">
            © {new Date().getFullYear()} Northern Linen. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
