import { Link } from "react-router-dom";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { memberships, membershipQuestions } from "@/lib/hka-content";
import { cn } from "@/lib/utils";

export default function Memberships() {
  return (
    <>
      <section className="page-width pb-10 pt-14 text-center sm:pt-20">
        <p className="eyebrow mb-5 text-[#76633e]">Memberships</p>
        <h1 className="section-heading text-[2.75rem] sm:text-[3.8rem]">Your journey.<br /><span className="italic">The support to grow.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">Begin with the basics, keep learning at your own pace, or make space for more personal guidance from Hollie.</p>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.15em]">USD catalogue · Calendar-month memberships</p>
      </section>

      <section className="page-width pb-16">
        <div id="membership-availability" role="note" className="mb-8 flex gap-3 border border-primary/15 bg-[#e9e7dc] px-5 py-4 text-xs leading-6">
          <LockKeyhole aria-hidden="true" className="mt-1 size-4 shrink-0" />
          <p><strong className="font-semibold">Memberships are coming soon.</strong> Explore the planned packages and inclusions. Paid enrolment will open once secure checkout is available.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {memberships.map((membership, index) => (
            <article key={membership.name} className={cn("flex flex-col border bg-card p-7 sm:p-8", index === 2 ? "border-primary border-t-4" : "border-primary/20 border-t-4 border-t-[#B79B62]/60")}>
              <p className="eyebrow mb-5 text-[#76633e]">{membership.intro}</p>
              <h2 className="font-serif text-3xl">{membership.name}</h2>
              <p className="my-6 flex items-baseline gap-1"><span className="self-start pt-2 text-sm">US$</span><span className="font-serif text-6xl leading-none tracking-[-0.04em]">{membership.amount}</span><span className="ml-2 text-xs text-muted-foreground">{membership.amount === 0 ? "free" : "/ calendar month"}</span></p>
              <div className="mb-6 h-px bg-primary/15" />
              <ul className="space-y-4">
                {membership.features.map((feature) => <li key={feature} className="flex gap-3 text-[13px] leading-6"><Check className="mt-1 size-4 shrink-0 text-[#76633e]" strokeWidth={1.5} aria-hidden="true" /><span>{feature}</span></li>)}
              </ul>
              <p className="mb-7 mt-6 text-xs leading-6 text-muted-foreground">{membership.note}</p>
              <Button disabled aria-describedby="membership-availability" className="mt-auto h-12 w-full rounded-sm disabled:opacity-70">Coming soon <LockKeyhole aria-hidden="true" /></Button>
            </article>
          ))}
        </div>
        <div className="mt-7 grid gap-4 text-xs leading-6 text-muted-foreground sm:grid-cols-2">
          <p>All prices are in USD. In-person coaching is separately arranged and is not automatically included in any membership.</p>
          <p>Premium allowances apply per paid billing period with no automatic rollover. Additional uploads and horse profiles will have configured limits.</p>
        </div>
      </section>

      <section className="border-y border-primary/15 bg-[#e9e7dc]">
        <div className="page-width grid gap-8 py-14 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
          <div><p className="eyebrow mb-4 text-[#76633e]">A little clarity</p><h2 className="section-heading">Before you<br />find your place.</h2><Link className="text-link mt-6" to="/learning-pathways">Explore the pathways <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          <Accordion type="single" collapsible>
            {membershipQuestions.map((item, index) => <AccordionItem key={item.question} value={"question-" + index} className="border-primary/20"><AccordionTrigger className="gap-4 py-5 text-left text-sm">{item.question}</AccordionTrigger><AccordionContent className="text-sm leading-7 text-muted-foreground">{item.answer}</AccordionContent></AccordionItem>)}
          </Accordion>
        </div>
      </section>
    </>
  );
}
