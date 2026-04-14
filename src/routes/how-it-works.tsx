import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
    number: "1",
    title: "Book your pickup online in 60 seconds",
    description: "Choose your laundry size — Regular starting at 25lbs, Big starting at 40lbs, or Jumbo starting at 60lbs. Select your preferred pickup time between 7 and 9am, enter your delivery address, and add your payment details. A temporary hold is placed on your card based on your selected size. You are only ever charged for the actual weight of your laundry after pickup.",
  },
  {
    number: "2",
    title: "We pick up at your door between 7 and 9am",
    description: "Leave your Northern Linen laundry bag outside your door by 7am on your scheduled pickup day. Our team picks it up and takes it to our cleaning facility. You do not need to be home. You will receive an SMS confirmation the moment your order is picked up.",
  },
  {
    number: "3",
    title: "Clean folded laundry delivered back to your door the next day",
    description: "Your laundry is professionally washed, dried, and folded according to your scent preference. We deliver it back to your door the following day. You will receive an SMS when your order is on its way. Fresh. Clean. Done.",
  },
];

const faqs = [
  {
    q: "What is the minimum order size?",
    a: "All orders have a 25lb minimum charge regardless of actual weight. If your laundry weighs less than 25lbs you are still charged for 25lbs.",
  },
  {
    q: "When do you pick up and deliver?",
    a: "We pick up between 7 and 9am Monday through Saturday. Clean laundry is delivered back to your door the next day.",
  },
  {
    q: "Is there a delivery fee?",
    a: "Never. Pickup and delivery is always completely free. No hidden fees. No surprises.",
  },
];

function HowItWorksPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-background px-6 pt-20 pb-0 md:pt-20">
        <div className="mx-auto max-w-[800px] text-center">
          <h1 className="text-3xl font-bold tracking-tight text-secondary md:text-4xl">
            How It Works
          </h1>
          <p className="mt-2 text-xl font-semibold text-primary">
            Laundry pickup and delivery made completely effortless
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-background px-6 py-16">
        <div className="mx-auto max-w-[800px] space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-6 rounded-xl border-[1.5px] border-soft bg-background p-10"
            >
              <span className="text-[64px] font-bold leading-none text-primary" style={{ minWidth: "80px" }}>
                {step.number}
              </span>
              <div>
                <h3 className="text-[22px] font-semibold text-secondary">{step.title}</h3>
                <p className="mt-3 text-base leading-[1.7] text-secondary">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link to="/book-now">Book Now</Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] border-t border-soft" />

      {/* FAQ */}
      <section className="bg-background px-6 py-20">
        <div className="mx-auto max-w-[800px]">
          <h2 className="text-center text-[30px] font-bold text-secondary">Frequently Asked Questions</h2>
          <div className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border-[1.5px] border-soft bg-background p-8">
                <h3 className="text-[17px] font-semibold text-secondary">{faq.q}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
