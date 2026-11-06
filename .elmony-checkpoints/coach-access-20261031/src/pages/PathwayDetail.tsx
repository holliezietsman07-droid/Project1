import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, LockKeyhole, Signal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoPlaceholder } from '@/components/PhotoPlaceholder';
import { useSession } from '@/contexts/SessionContext';
import { db, type Row } from '@/lib/academy';
import { pathways } from '@/lib/hka-content';

export default function PathwayDetail() {
  const { pathwayId } = useParams();
  const pathway = pathways.find((item) => item.id === pathwayId);
  const { session } = useSession();
  const courses = useQuery({
    queryKey: ['pathway-courses', pathwayId, Boolean(session)],
    enabled: Boolean(pathway),
    queryFn: async () => {
      const { data, error } = await db().from('hka_courses').select('*').eq('pathway_id', pathwayId!).is('archived_at', null).order('created_at');
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  if (!pathway) return <Navigate to={'/learning-pathways'} replace />;
  return <section className={'page-width py-12 sm:py-16'}>
    <Button asChild variant={'ghost'} className={'-ml-4 mb-8'}><Link to={'/learning-pathways'}><ArrowLeft />All pathways</Link></Button>
    <div className={'grid gap-8 border-b border-primary/15 pb-10 md:grid-cols-[0.8fr_1.2fr] md:items-center'}>
      <PhotoPlaceholder slot={pathway.photo} className={'aspect-[1.4] rounded-sm'} />
      <div><p className={'eyebrow mb-4 text-[#76633e]'}>HKA Learning Pathway</p><h1 className={'section-heading'}>{pathway.title}</h1><p className={'mt-5 max-w-2xl text-sm leading-7 text-muted-foreground'}>{pathway.description} {pathway.audience}</p></div>
    </div>
    <div className={'py-10'}>
      <div className={'flex flex-wrap items-end justify-between gap-4'}><div><p className={'eyebrow mb-3 text-[#76633e]'}>Course catalogue</p><h2 className={'font-serif text-3xl'}>Available learning</h2></div>{!session && <Button asChild variant={'outline'}><Link to={'/sign-in'}>Sign in to enrol</Link></Button>}</div>
      {courses.isLoading ? <p className={'mt-8 text-sm text-muted-foreground'} role={'status'}>Loading courses…</p> :
       courses.error ? <p className={'mt-8 text-sm text-destructive'} role={'alert'}>Course catalogue could not be loaded.</p> :
       courses.data?.length ? <div className={'mt-7 grid gap-5 lg:grid-cols-2'}>{courses.data.map((course) => {
        const published=Boolean(course.published);
        return <article key={course.id} className={'paper-card flex flex-col p-6'}>
          <div className={'flex flex-wrap gap-2'}><Badge variant={published ? 'default' : 'secondary'}>{published ? 'Published' : 'Coming soon'}</Badge><Badge variant={'outline'}>{String(course.access_level ?? 'free')}</Badge></div>
          <h3 className={'mt-4 font-serif text-2xl'}>{String(course.title)}</h3><p className={'mt-3 flex-1 text-sm leading-6 text-muted-foreground'}>{String(course.description || 'Course details are being prepared.')}</p>
          <div className={'mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground'}><span className={'inline-flex items-center gap-2'}><Signal className={'size-4'} />{String(course.level ?? 'All levels')}</span><span className={'inline-flex items-center gap-2'}><Clock className={'size-4'} />{Number(course.duration_minutes || 0) ? Math.ceil(Number(course.duration_minutes)/60)+' hours' : 'Duration coming soon'}</span></div>
          <p className={'mt-4 border-t border-primary/10 pt-4 text-xs'}><strong>Eligibility:</strong> {String(course.eligibility ?? 'Active academy account')}</p>
          <div className={'mt-5'}>{published && session ? <Button asChild className={'rounded-sm'}><Link to={'/academy/courses/'+course.id}>View course <ArrowRight /></Link></Button> : <span className={'inline-flex items-center gap-2 text-xs text-muted-foreground'}><LockKeyhole className={'size-4'} />{published ? 'Sign in to access enrolment' : 'Not open for enrolment'}</span>}</div>
        </article>;
      })}</div> : <div className={'paper-card mt-7 p-7'}><p className={'font-medium'}>No published courses yet</p><p className={'mt-2 text-sm leading-6 text-muted-foreground'}>HKA is preparing this pathway thoughtfully. Unfinished educational content is not shown.</p></div>}
    </div>
  </section>;
}
 
