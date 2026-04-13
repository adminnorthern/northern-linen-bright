import { createFileRoute } from "@tanstack/react-router";
import { BookNowButton } from "@/components/BookNowButton";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Northern Linen" },
      { name: "description", content: "Book online, we pick up, and deliver clean folded laundry the next day." },
      { property: "og:title", content: "How It Works — Northern Linen" },
      { property: "og:description", content: "Book online, we pick up, and deliver clean folded laundry the next day." },
    ],
  }),
  component: HowItWorksPage,
});

const steps = [
  {
    number: "01",
    title: "Book Online in 60 Seconds",
    description: "Choose your size and preferred pickup time. It's fast and simple.",
  },
  {
    number: "02",
    title: "We Pick Up Your Laundry",
    description: "Our team arrives between 7–9 AM to collect your items from your door.",
  },
  {
    number: "03",
    title: "Clean & Delivered Next Day",
    description: "Your laundry comes back clean, folded, and delivered right to your door.",
  },
];

function HowItWorksPage() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          How It Works
        </h1>
        <p className="mt-4 text-lg text-steel">
          Three simple steps to fresh laundry
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-2xl space-y-12">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {step.number}
            </div>
            <div className="pt-2">
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-steel leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <BookNowButton className="h-12 px-10 text-base" />
      </div>
    </section>
  );
}
