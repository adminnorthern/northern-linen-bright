import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Northern Linen" },
      { name: "description", content: "Affordable premium laundry pricing. Wash & fold $2.50/lb, dry cleaning $10/item, comforters $40 flat." },
      { property: "og:title", content: "Pricing — Northern Linen" },
      { property: "og:description", content: "Affordable premium laundry pricing starting at $2.50/lb." },
    ],
  }),
  component: PricingPage,
});

const sizes = [
  {
    name: "Regular",
    sub: "Starting at 25lbs",
    desc: "Perfect for one person or a single week of laundry",
  },
  {
    name: "Big",
    sub: "Starting at 40lbs",
    desc: "Great for couples or heavier laundry weeks",
  },
  {
    name: "Jumbo",
    sub: "Starting at 60lbs",
    desc: "Large loads, families, and heavy laundry weeks",
  },
];

const scents = ["Classic", "Fresh", "Gentle"];

function PricingPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-background px-6 pt-20 pb-0 md:pt-20">
        <div className="mx-auto max-w-[1100px] text-center">
          <h1 className="text-3xl font-bold tracking-tight text-secondary md:text-4xl">
            Simple Pricing
          </h1>
          <p className="mt-2 text-xl font-semibold text-primary">
            No hidden fees. No surprises. Just clean laundry.
          </p>
        </div>
      </section>

      {/* Size cards */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-3">
          {sizes.map((size) => (
            <div
              key={size.name}
              className="rounded-xl border-[1.5px] border-soft bg-background p-8 text-center"
            >
              <h3 className="text-[22px] font-bold text-secondary">{size.name}</h3>
              <p className="mt-1 text-[15px] font-semibold text-primary">{size.sub}</p>
              <p className="mt-3 text-[15px] leading-[1.7] text-secondary">{size.desc}</p>
              <p className="mt-4 text-[28px] font-bold text-secondary">$2.50<span className="text-base font-medium">/lb</span></p>
              <div className="mt-6">
                <Button asChild className="w-full">
                  <Link to="/book-now">Book Now</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] border-t border-soft" />

      {/* Additional services */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-[700px]">
          <h2 className="text-center text-[28px] font-bold text-secondary">Additional Services</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-[1.5px] border-soft bg-background p-8 text-center">
              <h3 className="text-xl font-bold text-secondary">Dry Cleaning</h3>
              <p className="mt-3 text-[28px] font-bold text-secondary">$10.00<span className="text-base font-medium">/item</span></p>
              <p className="mt-2 text-sm text-primary">All garments same flat price</p>
            </div>
            <div className="rounded-xl border-[1.5px] border-soft bg-background p-8 text-center">
              <h3 className="text-xl font-bold text-secondary">Comforters</h3>
              <p className="mt-3 text-[28px] font-bold text-secondary">$40.00<span className="text-base font-medium"> flat</span></p>
              <p className="mt-2 text-sm text-primary">All sizes same flat price</p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimum charge notice */}
      <section className="bg-background px-6 pb-16">
        <div className="mx-auto max-w-[700px] rounded-xl border-[1.5px] border-soft bg-background p-8 text-center">
          <p className="text-[15px] leading-[1.7] text-secondary">
            All orders have a 25lb minimum charge regardless of actual weight. Your selected size only determines the temporary hold placed on your card at booking. You are always charged for the actual weight of your laundry after pickup. The hold is released within 5 to 7 business days if unused.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] border-t border-soft" />

      {/* Scent profiles */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-[700px] text-center">
          <h2 className="text-[28px] font-bold text-secondary">Choose Your Scent</h2>
          <p className="mt-2 text-lg font-semibold text-primary">
            Select your preferred scent at booking — no extra charge
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {scents.map((s) => (
              <span
                key={s}
                className="rounded-full border-[1.5px] border-soft bg-background px-8 py-3 text-base font-medium text-secondary"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-primary">All scents included at no extra charge</p>
        </div>
      </section>
    </>
  );
}
