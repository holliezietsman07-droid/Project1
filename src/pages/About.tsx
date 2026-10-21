import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Heart, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { founderNote } from "@/lib/hka-content";

export default function About() {
  return (
    <>
      <section className="page-width grid gap-10 pb-16 pt-14 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-20 sm:py-20">
        <div className="order-2 mx-auto w-full max-w-[430px] md:order-1">
          <PhotoPlaceholder slot="founder" className="aspect-[0.85] rounded-t-[160px]" />
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.17em] text-muted-foreground">Hollie Zietsman · Founder & Main Coach</p>
        </div>
        <div className="order-1 md:order-2">
          <p className="eyebrow mb-5 text-[#76633e]">The heart behind the academy</p>
          <h1 className="section-heading text-[2.75rem] sm:text-[3.8rem]">A shared love of horses.<br /><span className="italic">A thoughtful way forward.</span></h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">HKA Equestrian — Online Academy is founded and coached by Hollie Zietsman. A place for riders, horse owners and learners, wherever they live and whatever stage they’re at.</p>
          <div className="mt-7 h-px w-16 bg-[#B79B62]" />
          <p className="mt-6 font-serif text-2xl leading-relaxed">Rooted in Horsemanship.<br />Inspired by Learning.</p>
        </div>
      </section>

      <section className="border-y border-primary/15 bg-[#e9e7dc]">
        <div className="page-width py-16 sm:py-20">
          <div className="mx-auto max-w-[780px]">
            <p className="eyebrow mb-7 text-[#76633e]">A note from Hollie</p>
            <blockquote className="space-y-6 font-serif text-[23px] leading-[1.65] tracking-[-0.015em] sm:text-[27px]">
              {founderNote.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </blockquote>
            <p className="mt-8 font-serif text-3xl italic">Hollie Zietsman</p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">Founder & Main Coach, HKA Equestrian</p>
          </div>
        </div>
      </section>

      <section className="page-width py-16 sm:py-20">
        <p className="eyebrow mb-4 text-[#76633e]">What guides us</p>
        <h2 className="section-heading">Understanding before everything.</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[{ Icon: Leaf, title: "The horse comes first", text: "Horse welfare sits at the heart of Hollie’s approach to learning, riding and care." }, { Icon: Heart, title: "Confidence through connection", text: "Thoughtful guidance begins with understanding and the partnership between horse and rider." }, { Icon: BookOpen, title: "Learning has no postcode", text: "Online learning welcomes an international community. In-person coaching is separately arranged where Hollie operates." }].map(({ Icon, title, text }) => <article key={title} className="border-t border-primary/25 pt-6"><Icon className="mb-5 size-6 text-[#826e45]" strokeWidth={1.25} aria-hidden="true" /><h3 className="font-serif text-2xl">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></article>)}
        </div>
        <Button asChild className="mt-10 h-12 rounded-sm px-6"><Link to="/learning-pathways">Find your learning pathway <ArrowUpRight aria-hidden="true" /></Link></Button>
      </section>
    </>
  );
}
