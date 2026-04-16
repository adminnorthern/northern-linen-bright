import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-secondary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-secondary">Page not found</h2>
        <p className="mt-2 text-[15px] text-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-[oklch(0.58_0.07_220)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Northern Linen — Premium Laundry Pickup & Delivery" },
      { name: "description", content: "Premium laundry pickup and delivery service in Bloomington, MN. Get your time back with Northern Linen." },
      { name: "author", content: "Northern Linen" },
      { property: "og:title", content: "Northern Linen — Premium Laundry Pickup & Delivery" },
      { property: "og:description", content: "Premium laundry pickup and delivery service in Bloomington, MN. Get your time back with Northern Linen." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Northern Linen — Premium Laundry Pickup & Delivery" },
      { name: "twitter:description", content: "Premium laundry pickup and delivery service in Bloomington, MN. Get your time back with Northern Linen." },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
