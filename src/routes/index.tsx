import { createFileRoute } from "@tanstack/react-router";
import { Truck, Clock, Shirt } from "lucide-react";
import { BookNowButton } from "@/components/BookNowButton";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const features = [
  {
    icon: Truck,
    title: "Free Pickup & Delivery",
    description: "We come to you — no trips, no hassle, no extra charge.",
  },
  {
    icon: Clock,
    title: "24-Hour Turnaround",
    description: "Drop off today, get it back tomorrow — fresh and folded.",
  },
  {
    icon: Shirt,
    title: "Professional Folding",
    description: "Every item handled with care and folded to perfection.",
  },
];

function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="px-6 py-24 md:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Get Your Time Back
          </h1>
          <p className="mt-6 text-lg text-steel md:text-xl">
            Premium laundry pickup and delivery in Bloomington, MN
          </p>
          <div className="mt-10">
            <BookNowButton className="h-12 px-10 text-base" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-soft/30 bg-muted/30 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-soft/40 bg-card p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-steel">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
