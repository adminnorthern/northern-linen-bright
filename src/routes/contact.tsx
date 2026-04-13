import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

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

const contactItems = [
  {
    icon: Phone,
    label: "Phone",
    value: "(000) 000-0000",
    href: "tel:+10000000000",
  },
  {
    icon: Mail,
    label: "Email",
    value: "ahmed@northernlinen.com",
    href: "mailto:ahmed@northernlinen.com",
  },
  {
    icon: MapPin,
    label: "Service Area",
    value: "Bloomington, MN",
    href: undefined,
  },
  {
    icon: Clock,
    label: "Pickup Hours",
    value: "7:00 AM – 9:00 AM, Monday – Saturday",
    href: undefined,
  },
];

function ContactPage() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Get in Touch
        </h1>
        <p className="mt-4 text-lg text-steel">
          We'd love to hear from you
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-2xl gap-6 sm:grid-cols-2">
        {contactItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-soft/40 bg-card p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-4 text-sm font-medium text-steel">{item.label}</p>
            {item.href ? (
              <a
                href={item.href}
                className="mt-1 block text-lg font-semibold text-secondary transition-colors hover:text-primary"
              >
                {item.value}
              </a>
            ) : (
              <p className="mt-1 text-lg font-semibold">{item.value}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
