import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Clock, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-delivery.jpg";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const features = [
  {
    icon: Truck,
    title: "Free Pickup and Delivery",
    description: "We come to your door. No trips to the laundromat. No delivery fees. Ever.",
  },
  {
    icon: Clock,
    title: "24 Hour Turnaround",
    description: "Your laundry is picked up in the morning and delivered clean and folded to your door the very next day.",
  },
  {
    icon: Shirt,
    title: "Professional Folding",
    description: "Every item washed, dried, and folded with care. Your laundry comes back fresh, clean, and ready to put away.",
  },
];

const steps = [
  {
    number: "1",
    title: "Book online in 60 seconds",
    description: "Choose your laundry size and pickup time — enter your address — we hold your card and only charge after we weigh your laundry.",
  },
  {
    number: "2",
    title: "We pick up at your door between 7 and 9am",
    description: "Leave your Northern Linen bag outside your door — you do not need to be home.",
  },
  {
    number: "3",
    title: "Clean folded laundry back at your door next day",
    description: "Fresh. Clean. Folded. Delivered.",
  },
];

const buildings = [
  "The Fenley", "Indigo", "Carbon31", "Aire MSP",
  "Ardor on the Bluffs", "5 Apple Tree Condos", "Risor of Bloomington", "Reflections"
];

function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-background px-6 py-20 md:py-28" style={{ minHeight: "480px" }}>
        <div className="mx-auto max-w-[800px] text-center">
          <h1 className="text-4xl font-bold tracking-tight text-secondary md:text-[56px] md:leading-tight">
            Get Your Time Back
          </h1>
          <p className="mx-auto mt-4 max-w-[600px] text-[22px] font-semibold text-primary md:text-[22px]">
            Premium laundry pickup and delivery in South Loop Bloomington MN
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link to="/book-now">Book Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] border-t border-soft" />

      {/* Why Northern Linen */}
      <section className="bg-background px-6 py-20">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="text-3xl font-bold text-secondary md:text-4xl">Why Northern Linen</h2>
          <p className="mt-2 text-xl font-semibold text-primary shadow-none">
            We handle the laundry. You get your time back.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border-[1.5px] border-soft bg-background p-8 text-center transition-shadow hover:shadow-md"
              >
                <feature.icon className="mx-auto h-12 w-12 text-primary" />
                <h3 className="mt-5 text-lg font-semibold text-secondary">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] border-t border-soft" />

      {/* How It Works preview */}
      <section className="bg-background px-6 py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="text-3xl font-bold text-secondary md:text-4xl">How It Works</h2>
          <p className="mt-2 text-xl font-semibold text-primary">
            Three simple steps to fresh clean laundry
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <span className="text-[64px] font-bold leading-none text-primary">{step.number}</span>
                <h3 className="mt-4 text-lg font-semibold text-secondary">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link to="/book-now">Book Now</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] border-t border-soft" />

      {/* Buildings we serve */}
      <section className="bg-background px-6 py-20">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="text-2xl font-bold text-secondary md:text-[28px]">Serving South Loop Bloomington</h2>
          <p className="mt-2 text-lg font-semibold text-primary">
            We currently serve these buildings with free pickup and delivery
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {buildings.map((b) => (
              <span
                key={b}
                className="rounded-full border-[1.5px] border-soft bg-background px-5 py-2 text-sm font-medium text-secondary"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
