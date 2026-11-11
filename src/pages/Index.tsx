import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, Globe2, Heart, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { founderNote, pathways } from "@/lib/hka-content";

export default function Index() {
  return (
    <>
      <section className="page-width grid items-center gap-12 pb-14 pt-12 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-16 lg:pt-14">
        <div className="min-w-0 max-w-xl">
          <p className="eyebrow mb-7 flex min-w-0 items-start gap-3"><span className="mt-2 h-px w-8 shrink-0 bg-[#B79B62]" /><span className="min-w-0">A life with horses. A journey of learning.</span></p>
          <h1 className="font-serif text-[clamp(2.8rem,5vw,4.5rem)] leading-[1.06] tracking-[-0.045em]">
            Rooted in<br />Horsemanship.<br /><span className="italic text-[#7a694a]">Inspired by<br />Learning.</span>
          </h1>
          <p className="mt-7 max-w-[400px] text-[15px] leading-[1.85] text-muted-foreground">Thoughtful, practical online learning for riders, horse owners and curious minds. Wherever you are. Wherever your journey begins.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <Button asChild size="lg" className="h-12 rounded-sm px-6 text-[13px]"><Link to="/learning-pathways">Explore learning pathways <ArrowUpRight aria-hidden="true" className="ml-2" /></Link></Button>
            <Link to="/about" className="text-link text-[13px]">Meet Hollie <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
          <p className="mt-9 flex items-center gap-2 text-[11px] text-muted-foreground"><Globe2 aria-hidden="true" className="size-3.5" />Online learning, wherever you call home.</p>
        </div>
        <div className="relative mx-auto w-full max-w-[550px] pb-6 pr-3 sm:pr-6">
          <PhotoPlaceholder slot="hero" className="aspect-[1.04] rounded-t-[150px] sm:aspect-[0.95] lg:aspect-[0.93]" />
          <div className="absolute bottom-0 right-0 max-w-[83%] border border-primary/15 bg-background px-7 py-5 sm:px-9">
            <p className="eyebrow mb-2 text-[#76633e]">The heart of HKA</p>
            <p className="font-serif text-xl leading-snug sm:text-2xl">Better understanding.<br />Stronger partnerships.</p>
          </div>
          <span className="absolute left-0 top-1/2 hidden -translate-x-[55%] -rotate-90 bg-background px-4 text-[8px] uppercase tracking-[0.3em] xl:block">Horse welfare at heart</span>
        </div>
      </section>

      <section aria-label="Our approach" className="border-y border-primary/15">
        <div className="page-width grid gap-6 py-7 sm:grid-cols-3 sm:gap-8">
          {[{ Icon: Leaf, title: "Horse welfare first", text: "At the heart of everything we do." }, { Icon: BookOpen, title: "Thoughtful, practical learning", text: "Understanding that goes beyond the saddle." }, { Icon: Heart, title: "Your journey, your pace", text: "A welcoming place to keep growing." }].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4">
              <Icon strokeWidth={1.25} className="size-6 shrink-0 text-[#826e45]" aria-hidden="true" />
              <div><p className="text-[13px] font-medium">{title}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="page-width py-16 sm:py-24">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="eyebrow mb-4 text-[#76633e]">Find your pathway</p><h2 className="section-heading max-w-xl">Learn, ride and care<br className="hidden sm:block" /> with confidence.</h2></div>
          <p className="max-w-[310px] text-sm leading-7 text-muted-foreground">Five pathways, shaped around your interests. Start with what matters to you.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {pathways.map((pathway, index) => (
            <Link key={pathway.id} to={"/learning-pathways#" + pathway.id} className="group flex h-full flex-col border-b border-primary/25 pb-5">
              <PhotoPlaceholder slot={pathway.photo} compact className="aspect-[1.2] w-full rounded-sm" />
              <span className="mt-5 text-[10px] tracking-[0.15em] text-[#76633e]">0{index + 1}</span>
              <h3 className="mb-3 mt-2 text-[23px] leading-tight tracking-[-0.03em]">{pathway.title}</h3>
              <p className="mb-5 text-xs leading-[1.8] text-muted-foreground">{pathway.description}</p>
              <span className="mt-auto flex min-h-10 items-center justify-between text-xs font-medium">Explore pathway <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
        <p className="mt-7 text-xs leading-6 text-muted-foreground">A thoughtful beginning: programmes and free introductory lessons will appear as Hollie publishes them.</p>
      </section>

      <section className="bg-[#e9e7dc]">
        <div className="page-width grid items-center gap-10 py-16 md:grid-cols-[0.85fr_1.15fr] md:gap-20 sm:py-20">
          <div className="relative max-w-[400px]">
            <PhotoPlaceholder slot="founder" className="aspect-[1.05] rounded-t-[110px]" />
            <span className="absolute -bottom-3 right-5 border border-primary/15 bg-background px-5 py-3 font-serif text-lg italic">A note from Hollie</span>
          </div>
          <div>
            <p className="eyebrow mb-5 text-[#76633e]">Personal guidance. Shared passion.</p>
            <h2 className="section-heading mb-6">Horses bring us together.<br /><span className="italic">Learning takes us further.</span></h2>
            <blockquote className="max-w-xl text-sm leading-[1.95] text-muted-foreground">“{founderNote[0]}”</blockquote>
            <p className="mt-6 font-serif text-2xl">Hollie Zietsman</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.17em] text-muted-foreground">Founder & Main Coach</p>
            <Link to="/about" className="text-link mt-4">The story behind HKA <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section className="page-width py-16 sm:py-20">
        <div className="grid gap-8 bg-primary px-7 py-10 text-background sm:px-12 sm:py-12 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div><p className="eyebrow mb-4 text-[#d8c79f]">Room to grow</p><h2 className="font-serif text-4xl leading-tight tracking-[-0.03em]">Find your place<br />in the academy.</h2><p className="mt-4 max-w-md text-sm leading-7 text-background/80">From a first introduction to more personal guidance. Explore the planned memberships and what’s included.</p></div>
          <div className="md:border-l md:border-background/20 md:pl-12">
            <p className="font-serif text-2xl">Free · Basic · Premium</p>
            <p className="mt-3 text-xs leading-6 text-background/80">US$0 · US$20 · US$100 per calendar month<br />Online memberships · Enrolment coming soon</p>
            <Button asChild variant="outline" className="mt-6 h-12 rounded-sm border-background/35 bg-transparent px-6 text-background hover:bg-background hover:text-primary"><Link to="/memberships">Discover memberships <ArrowUpRight aria-hidden="true" /></Link></Button>
          </div>
        </div>
      </section>
      <section className="page-width pb-16">
        <details className="rounded-lg border border-primary/20 bg-card px-5 py-3">
          <summary className="min-h-11 cursor-pointer py-2 font-medium text-primary">Install HKA on your phone</summary>
          <ul className="space-y-2 pb-3 text-sm leading-6 text-muted-foreground">
            <li><strong>iPhone:</strong> In Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if shown.</li>
            <li><strong>Android:</strong> In Chrome, open the menu and choose Install app or Add to Home screen.</li>
          </ul>
        </details>
      </section>
    </>
  );
}
