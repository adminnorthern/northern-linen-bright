import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/book-now")({
  head: () => ({
    meta: [
      { title: "Book Now — Northern Linen" },
      { name: "description", content: "Schedule your premium laundry pickup and delivery in Bloomington, MN." },
      { property: "og:title", content: "Book Now — Northern Linen" },
      { property: "og:description", content: "Schedule your premium laundry pickup and delivery." },
    ],
  }),
  component: BookNowPage,
});

function BookNowPage() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
          Book Your Pickup
        </h1>
        <p className="mt-4 text-lg text-steel">
          Online booking is coming soon. In the meantime, reach out to schedule your first pickup.
        </p>
        <div className="mt-10 rounded-xl border border-soft/40 bg-muted/30 p-8">
          <p className="font-medium">Contact us to book</p>
          <div className="mt-4 space-y-2 text-steel">
            <p>
              <a href="mailto:ahmed@northernlinen.com" className="text-primary hover:underline">
                ahmed@northernlinen.com
              </a>
            </p>
            <p>
              <a href="tel:+10000000000" className="text-primary hover:underline">
                (000) 000-0000
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
