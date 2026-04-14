import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Northern Linen" },
      { name: "description", content: "Get in touch with Northern Linen. Serving Bloomington, MN with premium laundry pickup and delivery." },
      { property: "og:title", content: "Contact — Northern Linen" },
      { property: "og:description", content: "Get in touch with Northern Linen in Bloomington, MN." },
    ],
  }),
  component: ContactPage,
});

const buildings = [
  "The Fenley", "Indigo", "Carbon31", "Aire MSP",
  "Ardor on the Bluffs", "5 Apple Tree Condos", "Risor of Bloomington", "Reflections"
];

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-primary">{label}</p>
      <div className="mt-1 text-[17px] font-medium text-secondary">{children}</div>
    </div>
  );
}

function ContactPage() {
  return (
    <section className="bg-background px-6 py-20 md:py-20">
      <div className="mx-auto max-w-[700px] text-center">
        <h1 className="text-3xl font-bold tracking-tight text-secondary md:text-4xl">
          Contact Us
        </h1>
        <p className="mt-2 text-lg font-semibold text-primary">
          We respond to all inquiries within 24 hours
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-[700px] rounded-xl border-[1.5px] border-soft bg-background p-12">
        <ContactRow label="Email">
          <a href="mailto:info@northernlinen.com" className="transition-colors hover:text-primary">
            info@northernlinen.com
          </a>
        </ContactRow>

        <ContactRow label="Phone">
          Coming soon
        </ContactRow>

        <ContactRow label="Service Area">
          South Loop Bloomington, MN
        </ContactRow>

        <ContactRow label="Buildings Served">
          <div className="mt-2 flex flex-wrap gap-2">
            {buildings.map((b) => (
              <span
                key={b}
                className="rounded-full border-[1.5px] border-soft bg-background px-4 py-1.5 text-sm font-medium text-secondary"
              >
                {b}
              </span>
            ))}
          </div>
        </ContactRow>

        <ContactRow label="Pickup Hours">
          Monday through Saturday, 7am to 9am
        </ContactRow>

        <ContactRow label="Delivery">
          Next day after pickup
        </ContactRow>

        <ContactRow label="Delivery Fee">
          Always free — zero delivery fees ever
        </ContactRow>
      </div>
    </section>
  );
}
