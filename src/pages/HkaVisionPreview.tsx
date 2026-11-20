import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Award, BookOpen, CalendarDays, CheckCircle2,
  ChevronRight, GraduationCap, Heart, Home, LayoutDashboard, Menu,
  MessageCircle, Monitor, PlayCircle, ShieldCheck, Smartphone, Sparkles,
  Target, Users, type LucideIcon,
} from 'lucide-react';
import { brandLogo } from '@/lib/hka-content';

/**
 * HKA Vision 2.0: an isolated, fully local design review.
 * IMPORTANT: This screen never queries or writes Supabase, accepts payments,
 * creates accounts, or alters the app's existing routes or business logic.
 * All learners, percentages, messages and activities below are examples.
 */
type Screen = 'welcome' | 'dashboard' | 'academy' | 'lesson' | 'training' | 'horses' | 'workspace';
type Role = 'student' | 'parent' | 'coach' | 'founder';
type Device = 'desktop' | 'mobile';

const palette = { green: '#2F4A3C', deep: '#193D30', ivory: '#F6F1E7', gold: '#B79B62' } as const;

const nav: { screen: Screen; label: string; Icon: LucideIcon }[] = [
  { screen: 'dashboard', label: 'My Home', Icon: Home },
  { screen: 'academy', label: 'Academy', Icon: BookOpen },
  { screen: 'training', label: 'My Training', Icon: Target },
  { screen: 'horses', label: 'My Horses', Icon: Heart },
  { screen: 'workspace', label: 'My Workspace', Icon: Users },
];

const pathways = [
  { id: 'foundations', name: 'Equestrian Foundations', level: 'Beginner friendly', image: '/images/PATHWAY_04_Young_Riders_Pony_Learning.jpg', note: 'Handling, grooming, horse behaviour and safety.' },
  { id: 'rider', name: 'Rider Development', level: 'All developing riders', image: '/images/PATHWAY_01_Riding_Rider_Development.webp', note: 'Position, balance, riding aids and confidence.' },
  { id: 'competition', name: 'Performance & Competition', level: 'Experienced riders', image: '/images/PATHWAY_05_Competition_Preparation.webp', note: 'Training analysis, preparation and welfare.' },
  { id: 'care', name: 'Horse Care & Horsemanship', level: 'All experience levels', image: '/images/PATHWAY_02_Horse_Care_Ownership.jpg', note: 'Daily care, nutrition, health and management.' },
  { id: 'coaching', name: 'Coaching & Instructor Development', level: 'Aspiring instructors', image: '/images/FOUNDER_PHOTO_Hollie_With Horse.jpg', note: 'Lesson planning, observation and feedback.' },
];

const panel = 'rounded-2xl border border-[#DFD7C9] bg-[#FFFCF6] shadow-[0_10px_30px_rgba(47,74,60,.05)]';
const kicker = 'text-[10px] font-semibold uppercase tracking-[.19em] text-[#987C4D]';
const mainButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#2F4A3C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193D30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const softButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D2C6B4] bg-[#FFFCF6] px-5 py-3 text-sm font-medium transition hover:bg-[#F1EBDD]';

function SectionTitle({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return <div className="mb-6">
    <p className={kicker}>{label}</p>
    <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{title}</h2>
    {subtitle && <p className="mt-3 max-w-2xl text-sm leading-7 text-[#69746C]">{subtitle}</p>}
  </div>;
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  return <div className="flex items-center gap-3">
    <div className="grid size-16 shrink-0 place-items-center rounded-full p-[6px]" style={{ background: 'conic-gradient(' + palette.green + ' ' + value + '%, #E8E3D7 0)' }}>
      <span className="grid size-full place-items-center rounded-full bg-[#FFFCF6] text-xs font-semibold">{value}%</span>
    </div>
    <div className="text-xs leading-5 text-[#69746C]">{label}</div>
  </div>;
}

export default function HkaVisionPreview() {
  const [role, setRole] = useState<Role>('student');
  const [device, setDevice] = useState<Device>('desktop');
  const [screen, setScreen] = useState<Screen>('welcome');
  const [selectedLearner, setSelectedLearner] = useState('Example learner');
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (next: Screen) => { setScreen(next); setMenuOpen(false); };

  const viewDashboard = () => {
    const copy = {
      student: ['Your journey, your pace.', 'Your next lesson and learning progress, all in one place.'],
      parent: ['Your family, growing together.', 'Follow approved child accounts and their learning milestones.'],
      coach: ['A calmer way to coach.', 'Students, reviews and learning plans without the clutter.'],
      founder: ['Welcome to your HKA overview.', 'A clear home for members, courses and academy activity.'],
    }[role];
    const cards: { title: string; body: string; action: string; next: Screen; Icon: LucideIcon }[] = role === 'student' ? [
      { title: 'Continue learning', body: 'Understanding Horse Body Language', action: 'Open lesson', next: 'lesson', Icon: BookOpen },
      { title: 'My learning pathway', body: 'Equestrian Foundations · Sample progress', action: 'Explore Academy', next: 'academy', Icon: GraduationCap },
      { title: 'Training & practice', body: 'Observation practice for your next stable visit', action: 'See training', next: 'training', Icon: Target },
      { title: 'My horses', body: 'Your private horse care space', action: 'Open horses', next: 'horses', Icon: Heart },
    ] : role === 'parent' ? [
      { title: 'Linked learners', body: 'Example child profile and education overview', action: 'View family', next: 'workspace', Icon: Users },
      { title: 'Learning progress', body: 'Achievements, assignments and recommended next steps', action: 'View Academy', next: 'academy', Icon: Award },
      { title: 'Coaching notes', body: 'Private feedback from an authorised instructor', action: 'View workspace', next: 'workspace', Icon: MessageCircle },
      { title: 'Upcoming activities', body: 'Planned lessons and tasks', action: 'View activities', next: 'training', Icon: CalendarDays },
    ] : [
      { title: 'My students', body: 'Open student profiles directly by name', action: 'Open workspace', next: 'workspace', Icon: Users },
      { title: 'Review submissions', body: 'Example learning activities awaiting assessment', action: 'Review workspace', next: 'workspace', Icon: CheckCircle2 },
      { title: 'Learning content', body: 'Pathways, courses, modules and lessons', action: 'Explore Academy', next: 'academy', Icon: BookOpen },
      { title: 'Coaching plans', body: 'Training goals and progress notes', action: 'Explore training', next: 'training', Icon: Target },
    ];
    return <>
      <div className="relative overflow-hidden rounded-[24px] bg-[#2F4A3C] p-6 text-white sm:p-9">
        <div className="absolute inset-y-0 right-0 w-2/5 bg-[url('/images/PATHWAY_01_Riding_Rider_Development.webp')] bg-cover bg-center opacity-25" aria-hidden="true" />
        <div className="relative max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#DCC593]">Your HKA space</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{copy[0]}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/80">{copy[1]}</p>
          <button type="button" onClick={() => go(role === 'student' ? 'lesson' : 'workspace')} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#D9BE85] px-5 text-sm font-semibold text-[#193D30]">My next step <ArrowRight size={16} /></button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map(({ title, body, action, next, Icon }) => <section key={title} className={panel + ' flex flex-col p-5'}>
          <Icon size={23} className="text-[#9A804C]" strokeWidth={1.5} />
          <h3 className="mt-4 font-serif text-2xl">{title}</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-[#69746C]">{body}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold underline decoration-[#B79B62] underline-offset-4" onClick={() => go(next)}>{action}<ArrowRight size={16} /></button>
        </section>)}
      </div>
      {role === 'student' && <div className={panel + ' mt-5 flex flex-wrap items-center justify-between gap-5 p-5'}>
        <ProgressRing value={35} label="Illustrative pathway progress — not your actual results." />
        <button type="button" onClick={() => go('academy')} className={softButton}>Explore your pathway <ChevronRight size={16} /></button>
      </div>}
    </>;
  };

  const viewAcademy = () => <>
    <SectionTitle label="The HKA Academy" title="Find your path. Grow with confidence." subtitle="A learning experience tailored to age, skills and interests. The five pathways below are an example catalogue, not published courses." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {pathways.map((path, index) => <article className={panel + ' overflow-hidden'} key={path.id}>
        <img src={path.image} alt="" className="aspect-[1.7] w-full object-cover" />
        <div className="p-5">
          <div className="flex items-center justify-between gap-3"><p className={kicker}>Pathway 0{index + 1}</p><p className="text-[10px] text-[#69746C]">{path.level}</p></div>
          <h3 className="mt-2 font-serif text-2xl leading-tight">{path.name}</h3>
          <p className="mt-3 min-h-12 text-sm leading-6 text-[#69746C]">{path.note}</p>
          <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-[#B79B62] underline-offset-4" onClick={() => go('lesson')}>Preview lesson format <ArrowRight size={16} /></button>
        </div>
      </article>)}
    </div>
  </>;

  const viewLesson = () => <>
    <button type="button" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm" onClick={() => go('academy')}><ArrowLeft size={16}/> Back to Academy</button>
    <div className={panel + ' overflow-hidden'}>
      <div className="grid gap-0 lg:grid-cols-[1.2fr_.8fr]">
        <img src="/images/IMG_5698.jpg" alt="Bay horse in a bridle" className="h-60 w-full object-cover lg:h-full" />
        <div className="p-6 sm:p-8">
          <p className={kicker}>Sample lesson · Horse behaviour</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight">Understanding Horse Body Language</h2>
          <p className="mt-4 text-sm leading-7 text-[#69746C]">Learn the difference between what you observe and why you think a horse may be behaving that way.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-[#E8ECDC] px-3 py-2">Learn</span><span className="rounded-full bg-[#F2EBDA] px-3 py-2">Observe</span><span className="rounded-full bg-[#F2EBDA] px-3 py-2">Reflect</span></div>
        </div>
      </div>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_.7fr]">
        <div>
          <p className={kicker}>Knowledge check</p>
          <h3 className="mt-3 font-serif text-2xl">Which is an observation?</h3>
          <p className="mt-3 text-sm leading-6 text-[#69746C]">A pony turns its head away as a handler approaches with a bridle. Choose the statement a camera could confirm.</p>
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Choose the observation</legend>
            {[['camera','The pony turns its head away from the approaching handler.'],['assumption','The pony dislikes its bridle because the handler is impatient.']].map(([value, label]) => <label key={value} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#DAD1C2] bg-white/70 p-4 text-sm"><input type="radio" name="hka-vision-question" value={value} checked={answer===value} onChange={() => {setAnswer(value);setChecked(false);}} className="accent-[#2F4A3C]"/>{label}</label>)}
          </fieldset>
          <button type="button" disabled={!answer} onClick={() => setChecked(true)} className={mainButton + ' mt-5 disabled:cursor-not-allowed disabled:opacity-50'}>Check my answer <CheckCircle2 size={17}/></button>
          {checked && <p role="status" className="mt-4 rounded-xl bg-[#EBF0E4] p-4 text-sm leading-6">{answer === 'camera' ? 'Correct! That describes visible behaviour without assuming a cause.' : 'Not quite. This explains a possible cause rather than describing what can be directly seen.'}</p>}
        </div>
        <aside className="rounded-2xl bg-[#EDF0E7] p-5">
          <p className={kicker}>From knowledge to practice</p>
          <h3 className="mt-3 font-serif text-2xl">Try it at the stables</h3>
          <p className="mt-3 text-sm leading-7 text-[#69746C]">With appropriate supervision, observe a horse calmly and write down three visible behaviours. Keep explanations separate from observations.</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-[#496152]"><ShieldCheck size={18}/> Welfare and safety first</div>
          <p className="mt-5 text-xs text-[#69746C]">This design sample does not submit or save answers.</p>
        </aside>
      </div>
    </div>
  </>;

  const viewTraining = () => <>
    <SectionTitle label="My Training" title="Turn knowledge into progress." subtitle="A future home for riding goals, supervised practice, journals and coach feedback. The items shown are examples only." />
    <div className="grid gap-4 sm:grid-cols-3">
      {[{Icon:Target,name:'Current goal',body:'Develop better observation skills'},{Icon:PlayCircle,name:'Practice activity',body:'Horse body language exercise'},{Icon:MessageCircle,name:'Coach feedback',body:'A calm place for meaningful next steps'}].map(({Icon,name,body})=><div key={name} className={panel+' p-5'}><Icon size={25} className="text-[#9A804C]"/><h3 className="mt-4 font-serif text-xl">{name}</h3><p className="mt-2 text-sm leading-6 text-[#69746C]">{body}</p></div>)}
    </div>
    <button type="button" onClick={()=>go('lesson')} className={mainButton+' mt-6'}>Try a practice lesson <ArrowRight size={17}/></button>
  </>;

  const viewHorses = () => <>
    <SectionTitle label="My Horses" title="Thoughtful care, all in one place." subtitle="Horse profiles and essential records will grow alongside the Academy. No horse data is accessed in this design preview." />
    <div className={panel+' grid items-center gap-6 overflow-hidden md:grid-cols-[.8fr_1.2fr]'}>
      <img src="/images/PATHWAY_02_Horse_Care_Ownership.jpg" alt="Horse being cared for at a stable" className="h-56 w-full object-cover md:h-full"/>
      <div className="p-6 sm:p-8"><Heart className="text-[#9A804C]"/><h3 className="mt-3 font-serif text-2xl">Your horse, your responsibility</h3><p className="mt-3 text-sm leading-7 text-[#69746C]">A private place for horse details and care reminders, without making the Academy difficult to use.</p><button type="button" onClick={()=>go('academy')} className={softButton+' mt-5'}>Explore horse-care learning <ArrowRight size={16}/></button></div>
    </div>
  </>;

  const viewWorkspace = () => {
    const educator = role === 'coach' || role === 'founder';
    return <>
      <SectionTitle label={role==='founder'?'Founder management':educator?'Coach workspace':'Family overview'} title={role==='founder'?'Manage your academy, effortlessly.':educator?'Your students, in one clear view.':'A better view of their journey.'} subtitle="Names and activity below are illustrative examples only. This preview has no connection to real student records."/>
      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <div className={panel+' p-5'}>
          <p className={kicker}>{educator?'Select a student':'Select an approved child'}</p>
          <h3 className="mt-2 font-serif text-2xl">{educator?'Student list':'Family profiles'}</h3>
          <div className="mt-5 space-y-2">
            {(educator?['Example learner','Second example learner','Third example learner']:['Example learner']).map(name=><button key={name} type="button" onClick={()=>setSelectedLearner(name)} className={'flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-left text-sm '+(name===selectedLearner?'border-[#B79B62] bg-[#F3EBDC]':'border-[#E2DBCF] bg-white/60 hover:bg-[#F5F1E8]')}><span>{name}</span><ChevronRight size={18}/></button>)}
          </div>
        </div>
        <div className={panel+' p-5'}>
          <p className={kicker}>Open profile · Example only</p>
          <h3 className="mt-2 font-serif text-2xl">{selectedLearner}</h3>
          <p className="mt-2 text-sm text-[#69746C]">Equestrian Foundations • illustrative learning record</p>
          <div className="mt-5"><ProgressRing value={35} label="Example pathway completion"/></div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {['Learning','Assignments','Progress','Notes'].map(item=><div key={item} className="rounded-xl border border-[#E2DBCF] bg-[#FAF6ED] p-3 text-center text-xs font-medium">{item}</div>)}
          </div>
          <p className="mt-6 text-xs leading-6 text-[#69746C]">In the actual application these sections will use existing authorisation rules and connected records. They are not interactive here.</p>
        </div>
      </div>
    </>;
  };

  return <div className="min-h-screen bg-[#F6F1E7] font-sans text-[#2F4A3C]">
    <div className="border-b border-[#DCCEB6] bg-[#EDE6D7] px-4 py-2 text-center text-[11px] font-semibold tracking-[.08em] text-[#4D584C]">HKA VISION 2.0 — DESIGN PREVIEW ONLY · SAMPLE DATA · NO SAVING</div>
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
      <div className="flex items-center gap-3"><img src={brandLogo.src} alt={brandLogo.alt} className="h-auto w-20 object-contain sm:w-28"/><span className="hidden border-l border-[#D1C7B8] pl-3 text-xs font-semibold uppercase tracking-widest sm:inline">Vision 2.0</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs"><span className="sr-only">Example role</span><select aria-label="Preview role" value={role} onChange={event=>setRole(event.target.value as Role)} className="min-h-11 rounded-full border border-[#D2C6B4] bg-white px-4 text-xs"><option value="student">Student</option><option value="parent">Parent</option><option value="coach">Coach</option><option value="founder">Founder</option></select></label>
        <button type="button" onClick={()=>setDevice(device==='desktop'?'mobile':'desktop')} className={softButton} aria-label={device==='desktop'?'Preview mobile layout':'Preview desktop layout'}>{device==='desktop'?<Smartphone size={17}/>:<Monitor size={17}/>} <span className="hidden sm:inline">{device==='desktop'?'Mobile':'Desktop'} preview</span></button>
        <Link to="/" className="inline-flex min-h-11 items-center gap-1 px-2 text-xs underline underline-offset-4">Current HKA <ArrowRight size={14}/></Link>
      </div>
    </div>
    <div className={'mx-auto px-3 pb-16 transition-[max-width] duration-300 sm:px-6 '+(device==='mobile'?'max-w-[440px]':'max-w-[1440px]')}>
      <div className={'overflow-hidden rounded-[24px] border border-[#D5CABA] bg-[#F9F6EF] shadow-[0_24px_70px_rgba(25,61,48,.12)] '+(device==='mobile'?'':'lg:grid lg:grid-cols-[230px_1fr]')}>
        <aside className={'bg-[#193D30] p-5 text-[#F6F1E7] '+(device==='mobile'?'hidden':'hidden lg:block')}>
          <p className="mb-8 font-serif text-2xl">Your equestrian world.</p>
          <div className="space-y-2">{nav.map(({screen:next,label,Icon})=><button key={next} type="button" onClick={()=>go(next)} className={'flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm transition '+(screen===next?'bg-[#B79B62] text-[#193D30]':'text-[#F6F1E7] hover:bg-white/10')}><Icon size={19}/>{label}</button>)}</div>
          <button type="button" className="mt-8 flex items-center gap-2 text-xs text-[#E7D0A6] underline underline-offset-4" onClick={()=>go('welcome')}><Sparkles size={16}/> Public welcome</button>
        </aside>
        <main className="min-w-0">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-[#DFD7C9] bg-[#FFFCF6] px-4 sm:px-7">
            <div className="flex items-center gap-2"><button type="button" className="grid size-10 place-items-center rounded-xl border border-[#D5CABA] lg:hidden" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle preview navigation" aria-expanded={menuOpen}><Menu size={19}/></button><p className="font-serif text-xl">{screen==='welcome'?'Welcome to HKA':nav.find(n=>n.screen===screen)?.label??'Sample lesson'}</p></div>
            <span className="rounded-full bg-[#EEE8DB] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider">Demo</span>
          </header>
          {menuOpen && <nav aria-label="Preview navigation" className="grid grid-cols-2 gap-2 border-b border-[#DFD7C9] bg-[#FFFCF6] p-3 lg:hidden">{[{screen:'welcome' as Screen,label:'Welcome',Icon:Sparkles},...nav].map(({screen:next,label,Icon})=><button type="button" key={next} onClick={()=>go(next)} className="flex min-h-11 items-center gap-2 rounded-lg bg-[#F5F0E7] px-3 text-left text-xs"><Icon size={15}/>{label}</button>)}</nav>}
          <div className="min-h-[570px] p-4 sm:p-7">
            {screen==='welcome'&&<>
              <div className="relative grid overflow-hidden rounded-[22px] bg-[#2F4A3C] text-white md:grid-cols-[1.1fr_.9fr]">
                <div className="relative z-10 flex flex-col justify-center p-7 sm:p-11"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#DCC593]">Rooted in Horsemanship. Inspired by Learning.</p><h1 className="mt-5 font-serif text-[clamp(2.3rem,4vw,4.1rem)] leading-[1.08]">Every rider.<br/>A journey of their own.</h1><p className="mt-5 max-w-md text-sm leading-7 text-white/80">Understand horses more deeply. Build your riding knowledge. Put learning into practice with confidence.</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={()=>go('academy')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#D9BE85] px-5 text-sm font-semibold text-[#193D30]">Discover pathways <ArrowRight size={16}/></button><button type="button" onClick={()=>go('dashboard')} className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm">Preview my HKA space</button></div></div>
                <img src="/images/PATHWAY_01_Riding_Rider_Development.webp" alt="Rider preparing a horse for a training session" className="h-64 w-full object-cover md:h-full"/>
              </div>
              <div className="mt-7 grid gap-4 md:grid-cols-3">{[{Icon:BookOpen,t:'Learn with understanding',d:'Clear explanations and meaningful activities.'},{Icon:Target,t:'Practise with purpose',d:'Connect theory to real horsemanship.'},{Icon:Heart,t:'Care with confidence',d:'Horse welfare at every step.'}].map(({Icon,t,d})=><div key={t} className={panel+' p-5'}><Icon size={23} className="text-[#9A804C]"/><h3 className="mt-3 font-serif text-xl">{t}</h3><p className="mt-2 text-sm leading-6 text-[#69746C]">{d}</p></div>)}</div>
            </>}
            {screen==='dashboard'&&viewDashboard()}
            {screen==='academy'&&viewAcademy()}
            {screen==='lesson'&&viewLesson()}
            {screen==='training'&&viewTraining()}
            {screen==='horses'&&viewHorses()}
            {screen==='workspace'&&viewWorkspace()}
          </div>
          <div className="grid grid-cols-5 border-t border-[#DFD7C9] bg-[#FFFCF6] lg:hidden">{nav.map(({screen:next,label,Icon})=><button type="button" key={next} onClick={()=>go(next)} className={'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[9px] '+(screen===next?'text-[#8A6A32]':'text-[#50685B]')}><Icon size={19}/><span className="text-center">{label.replace('My ','')}</span></button>)}</div>
        </main>
      </div>
      <p className="mt-5 text-center text-xs leading-6 text-[#67756B]">This preview is a design review, not a live product. It uses existing HKA images and local sample data. No accounts, progress, messages or payments are connected.</p>
    </div>
  </div>;
}
