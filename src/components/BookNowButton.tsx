import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function BookNowButton({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={className}>
      <Link to="/book-now">Book Now</Link>
    </Button>
  );
}
