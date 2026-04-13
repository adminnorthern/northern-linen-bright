import { createFileRoute } from "@tanstack/react-router";
import { BookNowButton } from "@/components/BookNowButton";

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
  { name: "Regular", weight: "Starting at 25 lbs", highlight: false },
  { name: "Big", weight: "Starting at 40 lbs", highlight: true },
  { name: "Jumbo", weight: "Starting at 60 lbs", highlight: false },
];

const rates = [
  { service: "Wash & Fold", price: "$2.50/lb" },
  { service: "Dry Cleaning", price: "$10/item" },
  { service: "Comforters", price: "$40 flat" },
];

function PricingPage() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-steel">
          No hidden fees — just clean laundry
        </p>
      </div>

      {/* Size cards */}
      <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
        {sizes.map((size) => (
          <div
            key={size.name}
            className={`rounded-xl border p-8 text-center transition-shadow hover:shadow-md ${
              size.highlight
                ? "border-primary bg-primary/5 shadow-md"
                : "border-soft/40 bg-card shadow-sm"
            }`}
          >
            <h3 className="text-2xl font-bold">{size.name}</h3>
            <p className="mt-2 text-steel">{size.weight}</p>
          </div>
        ))}
      </div>

      {/* Rates */}
      <div className="mx-auto mt-14 max-w-md">
        <div className="divide-y divide-soft/40 rounded-xl border border-soft/40 bg-card">
          {rates.map((rate) => (
            <div key={rate.service} className="flex items-center justify-between px-6 py-5">
              <span className="font-medium">{rate.service}</span>
              <span className="text-lg font-semibold text-primary">{rate.price}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-md text-center text-sm text-steel">
        All orders have a 25 lb minimum charge.
      </p>

      <div className="mt-12 text-center">
        <BookNowButton className="h-12 px-10 text-base" />
      </div>
    </section>
  );
}
