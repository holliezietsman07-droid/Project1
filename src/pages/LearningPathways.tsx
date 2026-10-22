import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { pathways } from "@/lib/hka-content";

export default function LearningPathways() {
  return (
    <>
      <section className="page-width pb-12 pt-14 sm:pb-16 sm:pt-20">
        <p className="eyebrow mb-5 text-[#76633e]">Learning pathways</p>
        <div className="grid gap-7 md:grid-cols-[1.4fr_1fr] md:items-end">
          <h1 className="section-heading text-[2.75rem] sm:text-[3.8rem]">Learn, ride and care<br />with confidence.</h1>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">You don’t need to fit into just one category. Find the pathways that reflect your interests, with horse welfare at the heart of every journey.</p>
        </div>
        <nav aria-label="Choose a pathway" className="mt-10 flex flex-wrap gap-2">
          {pathways.map((pathway, index) => <Link key={pathway.id} to={"#" + pathway.id} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/20 px-4 py-2 text-xs hover:bg-primary/5"><span className="text-[#76633e]">0{index + 1}</span>{pathway.title}</Link>)}
        </nav>
      </section>
      <div className="border-y border-primary/15 bg-[#e9e7dc]">
        <p className="page-width flex gap-3 py-5 text-xs leading-6"><BookOpen className="mt-1 size-4 shrink-0" aria-hidden="true" /><span><strong className="font-semibold">Good things take thoughtful preparation.</strong> Programmes and introductory lessons have not been published yet. This page introduces the pathways; learning content will follow.</span></p>
      </div>
      <div className="page-width py-6 sm:py-10">
        {pathways.map((pathway, index) => (
          <section key={pathway.id} id={pathway.id} tabIndex={-1} aria-labelledby={pathway.id + "-title"} className="grid scroll-mt-6 gap-7 border-b border-primary/15 py-10 last:border-0 sm:gap-10 md:grid-cols-[0.8fr_1.2fr] md:py-12">
            <PhotoPlaceholder slot={pathway.photo} className="aspect-[1.4] w-full rounded-sm" />
            <div className="flex flex-col items-start justify-center">
              <p className="eyebrow mb-4 text-[#76633e]">Pathway 0{index + 1}</p>
              <h2 id={pathway.id + "-title"} className="font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">{pathway.title}</h2><Button asChild variant={'outline'} className={'mt-5 h-11 rounded-sm'}><Link to={'/learning-pathways/' + pathway.id}>View pathway catalogue <ArrowRight aria-hidden={'true'} /></Link></Button>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{pathway.description} {pathway.audience}</p>
              <div className="mt-6 w-full border-l-2 border-[#B79B62] bg-card px-5 py-4">
                <p className="text-xs font-medium">No published lessons yet</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">Hollie’s programmes and one free introductory lesson will appear here when published.</p>
              </div>
            </div>
          </section>
        ))}
      </div>
      <section className="page-width pb-16 pt-3">
        <div className="flex flex-col justify-between gap-6 border-t border-primary/15 pt-10 sm:flex-row sm:items-center">
          <div><h2 className="font-serif text-3xl">A little guidance for your next step.</h2><p className="mt-3 text-sm text-muted-foreground">Explore the planned packages and find the support that suits you.</p></div>
          <Button asChild className="h-12 w-fit rounded-sm px-6"><Link to="/memberships">Explore memberships <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </section>
    </>
  );
}
