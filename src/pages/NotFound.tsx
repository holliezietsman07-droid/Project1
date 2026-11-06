import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="page-width py-24 text-center">
      <p className="eyebrow mb-5">404 · A little off the path</p>
      <h1 className="section-heading">Let’s find your way back.</h1>
      <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-muted-foreground">This page isn’t available. Explore the academy or return home to continue your journey.</p>
      <Button asChild className="mt-8 h-12 rounded-sm"><Link to="/"><ArrowLeft aria-hidden="true" />Back to home</Link></Button>
    </section>
  );
}
