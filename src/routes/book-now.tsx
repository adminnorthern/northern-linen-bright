import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
    <section className="bg-background px-6 py-20 md:py-20">
      <div className="mx-auto max-w-[600px] text-center">
        <h1 className="text-3xl font-bold tracking-tight text-secondary md:text-4xl">
          Book Your Pickup
        </h1>
        <p className="mx-auto mt-4 max-w-[600px] text-lg font-semibold text-primary">
          Our booking form is almost ready. In the meantime reach us directly at info@northernlinen.com
        </p>

        <div className="mx-auto mt-12 max-w-[600px] rounded-xl border-[1.5px] border-soft bg-background px-8 py-20">
          <h2 className="text-[22px] font-semibold text-secondary">Booking Form Coming Soon</h2>
          <div className="mt-6">
            <Button asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
