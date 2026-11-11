import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Download, FilePlus2, Library, MoreHorizontal, RefreshCw, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/contexts/SessionContext';
import { useRefreshAcademy, useRows } from '@/hooks/use-academy';
import { db, displayDate, errorText, removeRow, rpc, saveRow, type Row } from '@/lib/academy';
import { CourseContentEditor, CoursePreview } from '@/components/accounts/CourseContentEditor';
import { pathways } from '@/lib/hka-content';
import { FocusedForm } from '@/components/accounts/FocusedForm';
import { showError, showSuccess } from '@/utils/toast';
import { PrivateFileButton } from '@/components/accounts/PrivateFileButton';

function Notice({ text, good=false }: { text:string; good?:boolean }) {
 return text?<p className={'mt-4 text-sm '+(good?'text-primary':'text-destructive')} role={'status'}>{text}</p>:null;
}

function CourseManager() {
 const { profile }=useSession(); const refresh=useRefreshAcademy(); const courses=useRows('hka_courses');
 const [searchParams,setSearchParams]=useSearchParams();
 const courseHeading=useRef<HTMLHeadingElement>(null);
 const [courseSearch,setCourseSearch]=useState('');
 const [deleting,setDeleting]=useState<{id:string;kind:'course'|'lesson'|'module';label:string;title:string}|null>(null);
 const [deleteError,setDeleteError]=useState('');
 function confirmDeletion(row:Row,kind:'course'|'lesson'|'module'){
  setDeleteError('');
  setDeleting({id:row.id,kind,label:kind==='lesson'&&['quiz','assignment'].includes(String(row.kind))?String(row.kind):kind,title:String(row.title)});
 }
 async function deleteItem(){
  if(!deleting||busy||submitting.current)return;
  submitting.current=true;
  setBusy(true);
  setDeleteError('');
  try{
   const removed=await rpc('hka_course_studio_delete_draft',{item_type:deleting.kind,item_id:deleting.id});
   if(removed!==deleting.id)throw new Error('Deletion could not be confirmed.');
   await Promise.all([reloadContent(),courses.refetch()]);
   if(deleting.kind==='course')setSelected('');
   showSuccess('Deleted '+deleting.label+' “'+deleting.title+'”.');
   setDeleting(null);
  }catch(error){
   setDeleteError(errorText(error));
  }finally{
   submitting.current=false;
   setBusy(false);
  }
 }
 const submitting=useRef(false); const [selected,setSelected]=useState(()=>searchParams.get('course')??''); const [creating,setCreating]=useState(()=>searchParams.get('action')==='create'); const [materialLesson,setMaterialLesson]=useState(''); const [materialFile,setMaterialFile]=useState<File|null>(null); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(selected||creating||courses.isLoading)return;
  const filter=searchParams.get('filter');
  const rows=(courses.data??[]).filter(row=>!filter||filter==='all'||filter===(row.archived_at?'archived':row.published?'published':'drafts'));
  const preferred=rows.find(row=>!row.published&&!row.archived_at)??rows.find(row=>!row.archived_at)??rows[0];
  if(preferred)setSelected(String(preferred.id));
 },[courses.data,courses.isLoading,creating,searchParams,selected]);
 const lessons=useQuery({queryKey:['manage-lessons',selected],enabled:Boolean(selected),queryFn:async()=>{const {data,error}=await db().from('hka_lessons').select('*').eq('course_id',selected).order('position');if(error)throw error;return (data??[]) as Row[];}});
 const modules=useQuery({queryKey:['manage-modules',selected],enabled:Boolean(selected),queryFn:async()=>{const {data,error}=await db().from('hka_modules').select('*').eq('course_id',selected).order('position');if(error)throw error;return (data??[]) as Row[];}});
 useEffect(()=>{setMaterialLesson('');setMaterialFile(null);},[selected]);
 async function reloadContent(){await Promise.all([lessons.refetch(),modules.refetch()]);await refresh();}
 async function toggleLesson(row:Row){if(busy)return;setBusy(true);setMessage('');try{await saveRow('hka_lessons',{published:!row.published},row.id);showSuccess((row.published?'Unpublished':'Published')+' lesson “'+String(row.title)+'”.');await lessons.refetch();}catch(error){showError(errorText(error));setMessage(errorText(error));}finally{setBusy(false);}}
 async function createCourse(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!profile||submitting.current)return;submitting.current=true;const formElement=event.currentTarget;setBusy(true);setMessage('');const form=new FormData(formElement);try{const row=await saveRow('hka_courses',{coach_id:profile.id,pathway_id:form.get('pathway'),title:form.get('title'),description:form.get('description'),level:form.get('level'),duration_minutes:Number(form.get('duration')||0),eligibility:form.get('eligibility'),access_level:form.get('access'),published:false});setSelected(String(row.id));setCreating(false);if(formElement.isConnected)formElement.reset();refresh();showSuccess('Saved course “'+String(row.title)+'”.');return true;}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{submitting.current=false;setBusy(false);}}
 async function addLesson(event:FormEvent<HTMLFormElement>){event.preventDefault();if(submitting.current)return;submitting.current=true;const formElement=event.currentTarget;const form=new FormData(formElement);setBusy(true);setMessage('');try{await saveRow('hka_lessons',{course_id:selected,title:form.get('title'),description:form.get('description'),content:form.get('content'),kind:form.get('kind'),duration_minutes:Number(form.get('duration')||0),position:(lessons.data?.length??0)+1,module_id:form.get('module')||null,free_preview:form.get('free')==='on',published:false});if(formElement.isConnected)formElement.reset();await lessons.refetch();showSuccess('Saved lesson “'+String(form.get('title'))+'”.');return true;}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{submitting.current=false;setBusy(false);}}
 async function addModule(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selected||submitting.current)return;submitting.current=true;const formElement=event.currentTarget;const form=new FormData(formElement);setBusy(true);setMessage('');try{await saveRow('hka_modules',{course_id:selected,title:form.get('title'),description:form.get('description'),position:(modules.data?.length??0)+1,published:false});if(formElement.isConnected)formElement.reset();await modules.refetch();showSuccess('Module draft saved.');return true;}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{submitting.current=false;setBusy(false);}}
 async function addQuestion(event:FormEvent<HTMLFormElement>){event.preventDefault();if(submitting.current)return;submitting.current=true;const formElement=event.currentTarget;const form=new FormData(formElement);setBusy(true);try{const question=await saveRow('hka_questions',{lesson_id:form.get('lesson'),question_type:form.get('type'),prompt:form.get('prompt'),options:String(form.get('options')||'').split(',').map(x=>x.trim()).filter(Boolean),marking_criteria:form.get('criteria'),points:Number(form.get('points')||1),position:1,requires_coach:form.get('coach')==='on'});const answer=String(form.get('answer')||'').trim();if(answer)await saveRow('hka_answer_keys',{question_id:question.id,answer,explanation:form.get('explanation')});if(formElement.isConnected)formElement.reset();showSuccess('Assessment question saved.');return true;}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{submitting.current=false;setBusy(false);}}
 async function uploadMaterial(){if(!profile||!materialLesson||!materialFile||submitting.current)return;submitting.current=true;setBusy(true);try{if(!(lessons.data??[]).some(row=>row.id===materialLesson))throw new Error('Choose a lesson in the selected course.');const allowed=['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm'];if(!allowed.includes(materialFile.type)||materialFile.size<=0||materialFile.size>52428800)throw new Error('Choose a JPG, PNG, WebP, PDF, MP4 or WebM file up to 50 MB.');const id=crypto.randomUUID();const ext=materialFile.name.split('.').pop()||'file';const path=profile.id+'/'+id+'.'+ext;const {error:meta}=await db().from('hka_files').insert({id,owner_id:profile.id,path,original_name:materialFile.name,purpose:'material',mime_type:materialFile.type,size_bytes:materialFile.size,lesson_id:materialLesson});if(meta)throw meta;const {error:upload}=await db().storage.from('hka-private').upload(path,materialFile,{contentType:materialFile.type});if(upload){await db().from('hka_files').delete().eq('id',id);throw upload;}setMaterialFile(null);showSuccess('Private lesson material uploaded.');}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{submitting.current=false;setBusy(false);}}
 async function moveLesson(index:number,direction:-1|1){const rows=lessons.data??[];const other=rows[index+direction];const current=rows[index];if(!other||!current)return;setBusy(true);try{await Promise.all([saveRow('hka_lessons',{position:Number(other.position)},String(current.id)),saveRow('hka_lessons',{position:Number(current.position)},String(other.id))]);await lessons.refetch();showSuccess('Lesson order saved.');}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{setBusy(false);}}
 function selectCourse(id:string){
  setSelected(id);setMessage('');
  if(window.matchMedia('(max-width: 1279px)').matches){
   requestAnimationFrame(()=>courseHeading.current?.focus());
  }
 }
 async function changeCourse(id:string,changes:Record<string,unknown>,success:string,lessonToPublish?:Row){
  if(submitting.current||busy)return false;
  submitting.current=true;setBusy(true);setMessage('');
  let lessonPublished=false;
  try{
   if(changes.published===true){
    const course=(courses.data??[]).find(row=>row.id===id);
    if(!String(course?.title??'').trim()||!String(course?.description??'').trim())throw new Error('Save a course title and introduction before publishing.');
    if(lessons.isLoading||modules.isLoading||lessons.error||modules.error)throw new Error('Wait for course content to load before publishing.');
    const published=(lessons.data??[]).filter(row=>row.published||row.id===lessonToPublish?.id);
    if(!published.some(row=>String(row.title??'').trim()&&String(row.content??'').trim()))throw new Error('Add a lesson title and educational text before publishing.');
    if(published.some(row=>row.module_id&&!(modules.data??[]).some(module=>module.id===row.module_id&&module.published)))throw new Error('Publish the module containing the lesson first.');
    if(lessonToPublish){
     await saveRow('hka_lessons',{published:true},lessonToPublish.id);
     lessonPublished=true;
    }
   }
   await saveRow('hka_courses',changes,id);
   showSuccess(success);
   await reloadContent();
   return true;
  }catch(error){
   const message=lessonPublished ? 'The lesson was saved in the draft course. Retry Publish course. '+errorText(error) : errorText(error);
   showError(message);setMessage(message);
   if(lessonPublished)await reloadContent();
   return false;
  }finally{submitting.current=false;setBusy(false);}
 }
 async function editCourse(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selected)return;const form=new FormData(event.currentTarget);return await changeCourse(selected,{title:form.get('title'),description:form.get('description'),eligibility:form.get('eligibility'),access_level:form.get('access')},'Saved course “'+String(form.get('title'))+'”.');}
 async function duplicate(id:string){setBusy(true);try{const newId=await rpc('hka_duplicate_course',{source_course:id});refresh();setSelected(String(newId));showSuccess('Course duplicated as an unpublished draft.');}catch(e){showError(errorText(e));setMessage(errorText(e));}finally{setBusy(false);}}
 const course=(courses.data??[]).find(row=>row.id===selected);
 const lessonList=lessons.data??[];
 const quickLesson=lessonList.length===1&&!lessonList[0].published ? lessonList[0] : undefined;
 const canPublish=Boolean(quickLesson||lessonList.some(row=>row.published));
 const contentLoading=lessons.isLoading||modules.isLoading||Boolean(lessons.error||modules.error);
 const filter=searchParams.get('filter')??'all';
 const visibleCourses=(courses.data??[]).filter(row=>{
  const status=row.archived_at?'archived':row.published?'published':'drafts';
  return (filter==='all'||filter===status)&&String(row.title).toLowerCase().includes(courseSearch.trim().toLowerCase());
 });
 function setCourseFilter(value:string){
  const next=new URLSearchParams(searchParams);
  if(value==='all')next.delete('filter');
  else next.set('filter',value);
  setSearchParams(next);
 }
 return <div className='grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)]'>
  <aside aria-label='Course library' className='rounded-2xl border border-primary/15 bg-[#fffdf8] p-4 xl:sticky xl:top-20'>
   <div className='flex flex-wrap items-center justify-between gap-2'>
    <h2 className='font-serif text-xl text-primary'>Courses</h2>
    <Button type='button' size='sm' className='min-h-10 rounded-lg' onClick={()=>setCreating(true)}><FilePlus2 aria-hidden='true'/>New course</Button>
   </div>
   <div className='mt-3 flex gap-2'>
    <label className='relative min-w-0 flex-1'>
     <Search aria-hidden='true' className='pointer-events-none absolute left-2.5 top-3 size-4 text-muted-foreground'/>
     <Input aria-label='Search courses' placeholder='Search' className='h-10 rounded-lg pl-8' value={courseSearch} onChange={event=>setCourseSearch(event.target.value)}/>
    </label>
    <select aria-label='Filter courses' className='h-10 max-w-[8rem] rounded-lg border border-input bg-background px-2 text-sm' value={filter} onChange={event=>setCourseFilter(event.target.value)}>
     <option value='all'>All</option><option value='drafts'>Drafts</option><option value='published'>Published</option><option value='archived'>Archived</option>
    </select>
   </div>
   {courses.isLoading?<p role='status' className='mt-3 text-sm'>Loading courses…</p>:courses.error?<p role='alert' className='mt-3 text-sm text-destructive'>Could not load courses.</p>:<>
    <select aria-label='Choose course' className='mt-3 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm xl:hidden' value={selected} disabled={busy} onChange={event=>selectCourse(event.target.value)}>
     {(!course||!visibleCourses.some(row=>row.id===selected))&&<option value={selected}>{course?String(course.title):'Choose a course'}</option>}
     {visibleCourses.map(row=><option key={row.id} value={row.id}>{String(row.title)}</option>)}
    </select>
    <ul className='mt-3 hidden max-h-[65dvh] space-y-1 overflow-y-auto xl:block'>
     {visibleCourses.map(row=><li key={row.id}>
      <button type='button' aria-current={row.id===selected?'true':undefined} disabled={busy} onClick={()=>selectCourse(row.id)} className={'flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-3 text-left transition-colors '+(row.id===selected?'bg-primary text-primary-foreground':'hover:bg-primary/5')}>
       <span className='min-w-0 flex-1'><span className='block break-words text-sm font-medium'>{String(row.title)}</span><span className='mt-1 block text-xs opacity-80'>{row.archived_at?'Archived':row.published?'Published':'Draft'} · {String(row.access_level??'free').toUpperCase()}</span></span>
       <ChevronRight className='size-4 shrink-0' aria-hidden='true'/>
      </button>
     </li>)}
    </ul>
    {!visibleCourses.length&&<p className='mt-3 text-sm text-muted-foreground'>No courses match.</p>}
   </>}
  </aside>
  <div className='min-w-0 space-y-4'>
   {creating&&<FocusedForm title="New course draft" triggerLabel="Create course" feedback={message} onSubmit={createCourse} open={creating} onOpenChange={setCreating}><div><Label htmlFor={'course-title'}>Title</Label><Input id={'course-title'} name={'title'} required maxLength={150}/></div><div className={'grid gap-4 sm:grid-cols-2'}><div><Label>Pathway</Label><Select name={'pathway'} required><SelectTrigger><SelectValue placeholder={'Choose pathway'}/></SelectTrigger><SelectContent>{pathways.map(p=><SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div><div><Label>Level</Label><Select name={'level'} defaultValue={'All levels'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Beginner','Intermediate','Advanced','All levels'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div></div><div><Label htmlFor={'course-description'}>Introduction</Label><Textarea id={'course-description'} name={'description'} required/></div><div className={'grid gap-4 sm:grid-cols-3'}><div><Label htmlFor={'course-duration'}>Minutes</Label><Input id={'course-duration'} name={'duration'} type={'number'} min={0}/></div><div><Label>Access</Label><Select name={'access'} defaultValue={'free'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['free','basic','premium'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor={'course-eligibility'}>Eligibility</Label><Input id={'course-eligibility'} name={'eligibility'} defaultValue={'Active academy account'}/></div></div><div className={'flex flex-wrap gap-2'}><Button disabled={busy}><Save/>Save draft</Button></div></FocusedForm>}
   {!course&&!courses.isLoading&&!creating&&<div className='rounded-2xl border border-dashed border-primary/25 bg-[#fffdf8] p-6'>
    <BookOpen className='size-5 text-primary' aria-hidden='true'/><h2 className='mt-2 font-serif text-2xl'>Choose a course</h2>
    <p className='mt-2 text-sm text-muted-foreground'>Select a course or start a new draft.</p>
   </div>}
   <AlertDialog open={Boolean(deleting)} onOpenChange={open=>{if(!open&&!busy)setDeleting(null);}}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>Delete {deleting?.label}?</AlertDialogTitle>
      <AlertDialogDescription>“{deleting?.title}” will be permanently removed if it has no protected records.</AlertDialogDescription>
     </AlertDialogHeader>
     {deleteError&&<p role='alert' className='text-sm text-destructive'>{deleteError}</p>}
     <AlertDialogFooter>
      <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
      <Button type='button' variant='destructive' disabled={busy} onClick={()=>void deleteItem()}>{busy?'Deleting…':'Delete '+deleting?.label}</Button>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
   {course&&<>
    <header className='rounded-2xl border border-[#B79B62]/40 bg-[#2F4A3C] p-5 text-[#F6F1E7] sm:p-6'>
     <p className='text-xs font-semibold uppercase tracking-wider text-[#DFCEA3]'>{course.archived_at?'Archived':course.published?'Published':'Draft'} · {String(course.access_level??'free')}</p>
     <h2 ref={courseHeading} tabIndex={-1} className='mt-2 break-words font-serif text-3xl focus:outline-none'>{String(course.title)}</h2>
     <p className='mt-2 text-sm text-[#F6F1E7]/85'>{lessonList.length} {lessonList.length===1?'lesson':'lessons'} · {lessonList.filter(row=>row.published).length} published</p>
     <div className='mt-4 flex flex-wrap items-start gap-2'>
      {course.archived_at&&<Button variant='secondary' className='min-h-11 rounded-lg' disabled={busy} onClick={()=>void changeCourse(course.id,{published:false,archived_at:null},'Restored course “'+String(course.title)+'” as a draft.')}>Restore as draft</Button>}
      {!course.archived_at&&!course.published&&<Button variant='secondary' className='min-h-11 rounded-lg' disabled={busy||contentLoading||!canPublish} onClick={()=>void changeCourse(course.id,{published:true,archived_at:null},quickLesson?'Published lesson “'+String(quickLesson.title)+'” and course “'+String(course.title)+'”.':'Published course “'+String(course.title)+'”.',quickLesson)}>{busy?'Working…':quickLesson?'Publish lesson & course':'Publish course'}</Button>}
      <CoursePreview key={'preview:'+course.id} course={course} lessons={lessonList} modules={modules.data??[]} triggerClassName='min-h-11 rounded-lg bg-transparent text-[#F6F1E7] hover:bg-white/10 hover:text-white'/>
      <details key={'actions:'+course.id} className='relative'>
       <summary className='flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-white/25 px-3 text-sm font-medium hover:bg-white/10 [&::-webkit-details-marker]:hidden'><MoreHorizontal className='size-4' aria-hidden='true'/>More actions</summary>
       <div className='absolute left-0 top-full z-10 mt-1 grid min-w-40 gap-1 rounded-xl border border-primary/15 bg-[#fffdf8] p-2 text-primary shadow-lg'>
        {course.published&&<Button variant='ghost' className='justify-start' disabled={busy} onClick={()=>void changeCourse(course.id,{published:false},'Unpublished course “'+String(course.title)+'”.')}>Unpublish</Button>}
        <Button variant='ghost' className='justify-start' disabled={busy} onClick={()=>void duplicate(course.id)}>Duplicate</Button>
        {profile?.role==='admin'&&!course.published&&<Button variant='ghost' className='justify-start text-destructive hover:text-destructive' disabled={busy} onClick={()=>confirmDeletion(course,'course')}>Delete course</Button>}
        {!course.archived_at&&<Button variant='ghost' className='justify-start' disabled={busy} onClick={()=>void changeCourse(course.id,{published:false,archived_at:new Date().toISOString()},'Archived course “'+String(course.title)+'”.')}>Archive</Button>}
       </div>
      </details>
     </div>
     {!course.archived_at&&!course.published&&!contentLoading&&!canPublish&&<p className='mt-3 text-sm text-[#F6F1E7]/85'>{lessonList.length?'Publish a lesson to make this course ready.':'Add a lesson to make this course ready.'}</p>}
    </header>
    {(lessons.error||modules.error)&&<p role='alert' className='text-sm text-destructive'>Could not load course content. Publishing is unavailable.</p>}
    <Tabs key={course.id} defaultValue='lessons'>
     <TabsList aria-label='Course tools' className='h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-primary/15 bg-[#fffdf8] p-1.5'>
      <TabsTrigger className='min-h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' value='lessons'>Lessons</TabsTrigger>
      <TabsTrigger className='min-h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' value='details'>Details</TabsTrigger>
      <TabsTrigger className='min-h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' value='structure'>Modules &amp; quizzes</TabsTrigger>
      <TabsTrigger className='min-h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' value='materials'>Materials</TabsTrigger>
     </TabsList>
     <TabsContent value='lessons'><section className="paper-card p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-3xl">Lessons</h2><FocusedForm title="Add lesson" compactTrigger feedback={message} onSubmit={addLesson}><div><Label>Module</Label><Select name={'module'}><SelectTrigger><SelectValue placeholder={'Optional module'}/></SelectTrigger><SelectContent>{(modules.data??[]).map(m=><SelectItem key={m.id} value={String(m.id)}>{String(m.title)}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor={'lesson-title'}>Lesson title</Label><Input id={'lesson-title'} name={'title'} required/></div><div><Label htmlFor={'lesson-description'}>Description</Label><Input id={'lesson-description'} name={'description'}/></div><div><Label htmlFor={'lesson-content'}>Formatted educational text</Label><Textarea id={'lesson-content'} name={'content'} className={'min-h-48'} /></div><div className={'grid gap-4 sm:grid-cols-3'}><div><Label>Type</Label><Select name={'kind'} defaultValue={'lesson'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['lesson','quiz','assignment'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor={'lesson-duration'}>Minutes</Label><Input id={'lesson-duration'} name={'duration'} type={'number'} min={0}/></div><label className={'flex items-end gap-2 pb-2 text-sm'}><input name={'free'} type={'checkbox'}/>Free introduction</label></div><Button disabled={busy} className={'w-fit'}><FilePlus2/>Add lesson draft</Button></FocusedForm></div>{lessons.isLoading?<p role='status' className='text-sm text-muted-foreground'>Loading lessons…</p>
 : !lessonList.length?<div className='rounded-xl border border-dashed border-primary/25 p-6 text-sm text-muted-foreground'>Add your first lesson to start building this course.</div>
 : <ol className='divide-y divide-primary/10 rounded-xl border border-primary/15'>
  {lessonList.map((lesson,index)=><li key={lesson.id} className='flex min-w-0 flex-wrap items-center gap-3 p-3 sm:p-4'>
   <span aria-hidden='true' className='grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary'>{index+1}</span>
   <div className='min-w-0 flex-1'>
    <p className='break-words text-sm font-semibold'>{String(lesson.title)}</p>
    <p className='mt-1 text-xs capitalize text-muted-foreground'>{String(lesson.kind)} · {lesson.published?'Published':'Draft'}</p>
   </div>
   <div className='flex w-full flex-wrap items-center gap-1 sm:w-auto'>
    <CourseContentEditor row={lesson} kind='lesson' onSaved={reloadContent}/>
    {profile?.role==='admin'&&(!lesson.published||course.archived_at)&&<Button type='button' size='icon' variant='ghost' className='size-11 text-destructive hover:text-destructive' aria-label={'Delete '+String(lesson.title)} disabled={busy} onClick={()=>confirmDeletion(lesson,'lesson')}><Trash2 className='size-4' aria-hidden='true'/></Button>}
    <Button type='button' size='sm' variant='ghost' className='min-h-11' disabled={busy||Boolean(course.archived_at)} onClick={()=>void toggleLesson(lesson)}>{lesson.published?'Unpublish lesson':'Publish lesson'}</Button>
    {lessonList.length>1&&<div className='flex gap-1'>
     <Button type='button' size='icon' variant='ghost' aria-label={'Move '+String(lesson.title)+' up'} disabled={index===0||busy} onClick={()=>void moveLesson(index,-1)}><ArrowUp aria-hidden='true'/></Button>
     <Button type='button' size='icon' variant='ghost' aria-label={'Move '+String(lesson.title)+' down'} disabled={index===lessonList.length-1||busy} onClick={()=>void moveLesson(index,1)}><ArrowDown aria-hidden='true'/></Button>
    </div>}
   </div>
  </li>)}
 </ol>}</section></TabsContent>
     <TabsContent value='details'><section className='paper-card space-y-3 p-5'>
      <h3 className='font-serif text-2xl'>Course details</h3>
      <p className='whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground'>{String(course.description||'Add an introduction to your course.')}</p>
      {selected&&<FocusedForm title="Course details" triggerLabel="Edit course" feedback={message} onSubmit={editCourse}><Input name={'title'} defaultValue={String((courses.data??[]).find(c=>c.id===selected)?.title??'')} required/><Textarea name={'description'} defaultValue={String((courses.data??[]).find(c=>c.id===selected)?.description??'')}/><div className={'grid gap-4 sm:grid-cols-2'}><Input name={'eligibility'} defaultValue={String((courses.data??[]).find(c=>c.id===selected)?.eligibility??'Active academy account')}/><Select name={'access'} defaultValue={String((courses.data??[]).find(c=>c.id===selected)?.access_level??'free')}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['free','basic','premium'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><Button className={'w-fit'} disabled={busy}><Save/>Save course changes</Button></FocusedForm>}
     </section></TabsContent>
     <TabsContent value='structure' className='space-y-4'><section className="paper-card p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-3xl">Modules</h2><FocusedForm title="Add module" compactTrigger feedback={message} onSubmit={addModule}><Input name={'title'} placeholder={'Module title'} required/><Textarea name={'description'} placeholder={'Module description'}/><Button className={'w-fit'} disabled={busy}>Add module draft</Button></FocusedForm></div><div className={'space-y-2'}>{(modules.data??[]).map(m=><div key={m.id} className='flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-sm border border-primary/15 p-3 text-sm'><span className='break-words'>{String(m.title)} · {m.published?'Published':'Draft'}</span><div className='flex items-center gap-2'><CourseContentEditor row={m} kind='module' onSaved={reloadContent}/>{profile?.role==='admin'&&(!m.published||course.archived_at)&&<Button type='button' size='icon' variant='ghost' className='size-11 text-destructive hover:text-destructive' aria-label={'Delete '+String(m.title)} disabled={busy} onClick={()=>confirmDeletion(m,'module')}><Trash2 className='size-4' aria-hidden='true'/></Button>}</div></div>)}</div></section>{selected&&Boolean(lessons.data?.length)&&<FocusedForm title="Assessment question" triggerLabel="Add question" feedback={message} onSubmit={addQuestion}><Select name={'lesson'} required><SelectTrigger><SelectValue placeholder={'Choose quiz or assignment'}/></SelectTrigger><SelectContent>{(lessons.data??[]).filter(l=>l.kind!=='lesson').map(l=><SelectItem key={l.id} value={String(l.id)}>{String(l.title)}</SelectItem>)}</SelectContent></Select><Select name={'type'} defaultValue={'multiple_choice'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['multiple_choice','true_false','short_answer','long_answer','practical','riding_video'].map(x=><SelectItem key={x} value={x}>{x.replace('_',' ')}</SelectItem>)}</SelectContent></Select><Textarea name={'prompt'} placeholder={'Question or assignment prompt'} required/><Input name={'options'} placeholder={'Multiple-choice options, comma separated'}/><div className={'grid gap-4 sm:grid-cols-2'}><Input name={'answer'} placeholder={'Automated answer, when appropriate'}/><Input name={'points'} type={'number'} min={1} defaultValue={1}/></div><Textarea name={'criteria'} placeholder={'Marking criteria'}/><Textarea name={'explanation'} placeholder={'Automated explanation after submission'}/><label className={'flex items-center gap-2 text-sm'}><input name={'coach'} type={'checkbox'}/>Requires personal coach review</label><Button className={'w-fit'} disabled={busy}>Save assessment question</Button></FocusedForm>}</TabsContent>
     <TabsContent value='materials'>{selected&&<section className={'paper-card grid gap-4 p-6'}><h2 className={'font-serif text-3xl'}>Lesson materials</h2><Select value={materialLesson} onValueChange={setMaterialLesson}><SelectTrigger><SelectValue placeholder={'Choose lesson'}/></SelectTrigger><SelectContent>{(lessons.data??[]).map(l=><SelectItem key={l.id} value={String(l.id)}>{String(l.title)}</SelectItem>)}</SelectContent></Select><Input type={'file'} accept={'image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm'} onChange={(event:ChangeEvent<HTMLInputElement>)=>setMaterialFile(event.target.files?.[0]??null)}/><Button className={'w-fit'} disabled={busy||!materialLesson||!materialFile} onClick={()=>void uploadMaterial()}><FilePlus2/>Upload private material</Button></section>}</TabsContent>
    </Tabs>
   </>}
   <Notice text={message} good={message.includes('saved')||message.includes('published')||message.includes('duplicated')||message.includes('archived')||message.includes('uploaded')}/>
  </div>
 </div>;
}

function ReviewQueue(){
 const {profile}=useSession();const submissions=useRows('hka_submissions');const refresh=useRefreshAcademy();const [searchParams]=useSearchParams();const openedSubmission=useRef('');const [active,setActive]=useState<Row|null>(null);const [message,setMessage]=useState('');
 useEffect(()=>{const id=searchParams.get('submission');if(!id||openedSubmission.current===id)return;const row=(submissions.data??[]).find(item=>item.id===id);if(row){openedSubmission.current=id;setActive(row);}},[searchParams,submissions.data]);
 async function review(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!active||!profile)return;const f=new FormData(event.currentTarget);try{await saveRow('hka_assessments',{submission_id:active.id,coach_id:profile.id,grade:Number(f.get('grade')),feedback:f.get('feedback'),decision:f.get('decision'),automated:false});await saveRow('hka_submissions',{status:f.get('decision')==='resubmission_requested'?'resubmission_requested':'approved'},String(active.id));refresh();setActive(null);setMessage('Personal coach feedback returned to student.');return true;}catch(e){setMessage(errorText(e));}}
 return <div className={'grid gap-7 lg:grid-cols-2'}><section className={'paper-card p-6'}><h2 className={'font-serif text-3xl'}>Coach review queue</h2><p className={'mt-2 text-sm text-muted-foreground'}>Practical work, riding videos and certification decisions always require authorised human review.</p><ul className={'mt-5 space-y-2'}>{(submissions.data??[]).filter(s=>['submitted','under_review'].includes(String(s.status))).map(s=><li key={s.id}><button className={'w-full rounded-sm border border-primary/15 p-4 text-left text-sm'} onClick={()=>setActive(s)}><strong>{String(s.review_kind??'practice')} submission</strong><span className={'mt-1 block text-muted-foreground'}>{String(s.status??'submitted')} · {String(s.response||'File submission').slice(0,90)}</span></button></li>)}</ul>{!submissions.isLoading&&!(submissions.data??[]).some(s=>['submitted','under_review'].includes(String(s.status)))&&<p className={'mt-5 text-sm text-muted-foreground'}>No submissions await review.</p>}</section>
 {active&&<FocusedForm title="Review submission" triggerLabel="Open feedback editor" feedback={message} onSubmit={review} open={Boolean(active)} onOpenChange={open=>{if(!open)setActive(null);}}>{active.file_id&&<PrivateFileButton fileId={String(active.file_id)} label='View submitted file'/>}<p className={'rounded-sm bg-primary/5 p-4 text-sm leading-6'}>{String(active.response||'Uploaded practical work')}</p><div><Label htmlFor={'grade'}>Score out of 100</Label><Input id={'grade'} name={'grade'} type={'number'} min={0} max={100} required/></div><div><Label htmlFor={'feedback'}>Coach comments</Label><Textarea id={'feedback'} name={'feedback'} className={'min-h-36'} required/></div><Select name={'decision'} defaultValue={'feedback'}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={'feedback'}>Return feedback</SelectItem><SelectItem value={'approved'}>Approve</SelectItem><SelectItem value={'resubmission_requested'}>Request resubmission</SelectItem></SelectContent></Select><Button><Save/>Return feedback</Button></FocusedForm>}<Notice text={message} good={message.includes('returned')}/></div>;
}

const studioTemplates:Record<string,string>={riding_lesson:'Warm-up\n\nMain exercises\n\nCool-down\n\nSafety considerations\n\nAssessment criteria',development:'Current position\n\nGoals\n\nMilestones\n\nPractice plan\n\nReview dates',horse_care:'Daily routine\n\nStable management checklist\n\nExercise and conditioning\n\nWelfare observations\n\nThis educational draft is not veterinary advice.',quiz:'Learning objectives\n\nQuestions\n\nAnswer guide\n\nCoach review requirements',assessment:'Learning objectives\n\nQuestions and activities\n\nMarking criteria\n\nCoach review requirements',revision:'Key concepts\n\nGuided recall\n\nApplied examples\n\nSelf-check\n\nNext steps',memorandum:'Assessment outcomes\n\nModel answers\n\nPoint allocation\n\nCommon errors\n\nCoach approval',pony_club:'Topic\n\nLearning objectives\n\nWorksheet activities\n\nPractical checks\n\nAnswer guide',competition:'Rider goals\n\nTraining schedule\n\nHorse welfare checks\n\nEquipment checklist\n\nCompetition-day plan',stable:'Daily tasks\n\nWeekly tasks\n\nSafety checks\n\nWelfare observations\n\nSign-off'};
const studioMaterialLabels:Record<string,string>={riding_lesson:'Riding lesson plan',development:'Student development programme',quiz:'Quiz',assessment:'Assessment',revision:'Student revision material',memorandum:'Marking memorandum',pony_club:'Pony Club worksheet',horse_care:'Horse-care plan',competition:'Competition preparation',stable:'Stable management checklist'};
export function AIStudio(){
 const {profile}=useSession();const drafts=useRows('hka_ai_drafts');const refresh=useRefreshAcademy();const [category,setCategory]=useState('riding_lesson');const [title,setTitle]=useState('');const [riderLevel,setRiderLevel]=useState('');const [duration,setDuration]=useState('60');const [objectives,setObjectives]=useState('');const [horseDetails,setHorseDetails]=useState('');const [equipment,setEquipment]=useState('');const [safety,setSafety]=useState('');const [content,setContent]=useState('');const [selectedId,setSelectedId]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [generating,setGenerating]=useState(false);const [generated,setGenerated]=useState(false);
 const isFounder=profile?.role==='admin';
 const liveStatus=useQuery({queryKey:['ai-studio-status',profile?.id],enabled:isFounder,queryFn:async()=>{const {data,error}=await db().functions.invoke<{mode?:'live'|'mock';model?:string;configured?:boolean;dailyLimit?:number;hourlyLimit?:number;error?:string}>('generate-ai-material',{body:{action:'status'}});if(error)throw error;if(!data?.mode)throw new Error(data?.error||'AI Studio status is unavailable.');return data;}});
 const liveMode=liveStatus.data?.mode==='live'&&liveStatus.data.configured===true;
 const liveUnavailable=liveStatus.data?.mode==='live'&&liveStatus.data.configured===false;
 function promptData(){return {riderLevel,durationMinutes:Number(duration),learningObjectives:objectives,horseDetails,equipment,safetyConsiderations:safety};}
 function prepare(){setContent('HKA Studio template draft\n\nRider level\n'+riderLevel.trim()+'\n\nLearning objectives\n'+objectives.trim()+'\n\nHorse details\n'+horseDetails.trim()+'\n\nAvailable equipment\n'+equipment.trim()+'\n\nSafety considerations\n'+safety.trim()+'\n\n'+studioTemplates[category]);setGenerated(false);setMessage('Editable template prepared. No AI provider call was made.');}
 async function generate(){
  if(!isFounder){setMessage('Founder access is required for AI generation.');return;}
  if(!title.trim()||!riderLevel.trim()||!objectives.trim()||!safety.trim()){setMessage('Add a title, rider level, learning objectives and safety considerations.');return;}
  setGenerating(true);setMessage(liveMode?'Generating secure live AI draft…':'Generating secure mock preview…');
  try{
   const {data,error}=await db().functions.invoke<{content?:string;mode?:string;model?:string;remainingDaily?:number;error?:string}>('generate-ai-material',{body:{materialType:category,title:title.trim(),riderLevel:riderLevel.trim(),durationMinutes:Number(duration),learningObjectives:objectives.trim(),horseDetails:horseDetails.trim(),equipment:equipment.trim(),safetyConsiderations:safety.trim()}});
   if(error){const context='context' in error?(error as {context?:Response}).context:undefined;const detail=context?await context.clone().json().catch(()=>null) as {error?:string}|null:null;throw new Error(detail?.error||error.message);}if(!data?.content)throw new Error(data?.error||'AI Studio returned no editable content.');
   setContent(data.content);setSelectedId('');setGenerated(true);setMessage(`AI-generated ${data.mode==='mock'?'mock preview':'draft'} ready for Founder review. Not saved · ${data.remainingDaily??0} requests remaining today.`);
  }catch(e){setMessage(errorText(e));}finally{setGenerating(false);}
 }
 async function save(asNew=false){
  if(!profile||!title.trim()||!content.trim())return;
  setBusy(true);setMessage('');
  try{
   const changes={category,title:title.trim(),prompt_data:promptData(),content,status:'draft',updated_at:new Date().toISOString()};
   const row=selectedId&&!asNew?await saveRow('hka_ai_drafts',changes,selectedId):await saveRow('hka_ai_drafts',{...changes,author_id:profile.id});
   setSelectedId(String(row.id));await refresh();showSuccess(selectedId&&!asNew?'Draft changes saved.':asNew?'Draft saved as a new copy.':'Draft saved privately.');
  }catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 }
 function openDraft(d:Row){
  const prompt=d.prompt_data as unknown as Record<string,unknown>|null;
  setSelectedId(String(d.id));setTitle(String(d.title));setCategory(String(d.category));setContent(String(d.content));setRiderLevel(String(prompt?.riderLevel??''));setDuration(String(prompt?.durationMinutes??60));setObjectives(String(prompt?.learningObjectives??prompt?.brief??''));setHorseDetails(String(prompt?.horseDetails??''));setEquipment(String(prompt?.equipment??''));setSafety(String(prompt?.safetyConsiderations??''));setGenerated(String(d.content).startsWith('AI-GENERATED'));setMessage('Draft opened for editing.');
 }
 function newDraft(){setSelectedId('');setCategory('riding_lesson');setTitle('');setRiderLevel('');setDuration('60');setObjectives('');setHorseDetails('');setEquipment('');setSafety('');setContent('');setGenerated(false);setMessage('New draft ready.');}
 async function deleteDraft(d:Row){
  if(!profile||(profile.role!=='admin'&&String(d.author_id)!==profile.id))return;
  if(!window.confirm('Delete '+String(d.title)+'? This cannot be undone.'))return;
  setBusy(true);setMessage('');
  try{await removeRow('hka_ai_drafts',String(d.id));if(selectedId===d.id)newDraft();await refresh();showSuccess('Draft deleted.');}catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 }
 const savedDrafts=[...(drafts.data??[])].sort((a,b)=>new Date(String(b.updated_at)).getTime()-new Date(String(a.updated_at)).getTime());
 function download(){const blob=new Blob([content],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(title||'hka-studio-draft')+'.txt';a.click();URL.revokeObjectURL(url);}
 return <div className={'grid gap-7 lg:grid-cols-[1fr_0.7fr]'}><section className={'paper-card p-6'}><div className={'flex items-start gap-3'}><Sparkles className={'mt-1 text-[#826e45]'}/><div><h2 className={'font-serif text-3xl'}>HKA AI Studio</h2><p className={'mt-2 text-sm leading-6 text-muted-foreground'}>{liveStatus.isLoading?'Checking secure AI mode…':liveStatus.isError?'AI mode status could not be verified.':liveUnavailable?'Live mode is enabled, but OpenAI configuration is incomplete.':liveMode?'Live AI generation is enabled for the authenticated Founder · '+liveStatus.data?.model+' · '+liveStatus.data?.hourlyLimit+'/hour and '+liveStatus.data?.dailyLimit+'/day limits.':'Founder-only mock mode is active; no paid OpenAI request will be made.'}</p></div></div>
  <div className={'mt-6 grid gap-4'}><div className={'flex flex-wrap items-center justify-between gap-3'}><p className={'text-xs text-muted-foreground'}>{selectedId?'Editing saved draft':'Creating new draft'}</p><Button type={'button'} size={'sm'} variant={'ghost'} onClick={newDraft} disabled={busy||generating}><FilePlus2/>New draft</Button></div><div><Label>Material type</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value={'riding_lesson'}>Riding lesson plan</SelectItem><SelectItem value={'pony_club'}>Pony Club worksheet</SelectItem><SelectItem value={'quiz'}>Quiz</SelectItem><SelectItem value={'assessment'}>Assessment</SelectItem><SelectItem value={'horse_care'}>Horse-care plan</SelectItem><SelectItem value={'revision'}>Student revision material</SelectItem><SelectItem value={'development'}>Student development programme</SelectItem><SelectItem value={'memorandum'}>Marking memorandum</SelectItem><SelectItem value={'competition'}>Competition preparation</SelectItem><SelectItem value={'stable'}>Stable management checklist</SelectItem></SelectContent></Select></div><div><Label htmlFor={'studio-title'}>Draft title</Label><Input id={'studio-title'} value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></div><div className={'grid gap-4 sm:grid-cols-2'}><div><Label htmlFor={'studio-level'}>Rider level</Label><Input id={'studio-level'} value={riderLevel} onChange={e=>setRiderLevel(e.target.value)} placeholder={'e.g. Pony Club D+, novice adult'}/></div><div><Label htmlFor={'studio-duration'}>Lesson duration (minutes)</Label><Input id={'studio-duration'} type={'number'} min={10} max={240} value={duration} onChange={e=>setDuration(e.target.value)}/></div></div><div><Label htmlFor={'studio-objectives'}>Learning objectives</Label><Textarea id={'studio-objectives'} value={objectives} onChange={e=>setObjectives(e.target.value)} className={'min-h-24'}/></div><div><Label htmlFor={'studio-horse'}>Horse details</Label><Textarea id={'studio-horse'} value={horseDetails} onChange={e=>setHorseDetails(e.target.value)} placeholder={'Temperament, training level and relevant welfare needs — no owner or student identity'}/></div><div><Label htmlFor={'studio-equipment'}>Available equipment</Label><Textarea id={'studio-equipment'} value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder={'Arena size, poles, cones, grooming or stable equipment'}/></div><div><Label htmlFor={'studio-safety'}>Safety considerations</Label><Textarea id={'studio-safety'} value={safety} onChange={e=>setSafety(e.target.value)} className={'min-h-24'}/></div><p className={'rounded-sm border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground'}>Privacy: only the planning details entered above are sent to the generation function. Do not enter student names, records, photos or assessment history.</p><div className={'flex flex-wrap gap-2'}><Button type={'button'} onClick={()=>void generate()} disabled={!isFounder||generating||busy||liveStatus.isLoading||liveStatus.isError||liveUnavailable}>{generating?<RefreshCw className={'animate-spin'}/>:<Sparkles/>}{generating?(liveMode?'Generating live AI draft…':'Generating mock preview…'):(liveMode?'Generate live AI draft':'Generate mock AI draft')}</Button><Button type={'button'} variant={'outline'} onClick={prepare} disabled={generating||busy}><RefreshCw/>Prepare manual template</Button></div><div><div className={'mb-1 flex items-center justify-between gap-3'}><Label htmlFor={'studio-content'}>Editable draft</Label>{generated&&<span className={'text-[10px] font-semibold uppercase tracking-[0.12em] text-[#76633e]'}>AI-generated · Founder review required</span>}</div><Textarea id={'studio-content'} value={content} onChange={e=>setContent(e.target.value)} className={'min-h-72'}/></div><div className={'flex flex-wrap gap-2'}><Button onClick={()=>void save()} disabled={busy||generating||!title.trim()||!content.trim()}><Save/>{selectedId?'Save changes':'Save draft'}</Button>{selectedId&&<Button variant={'outline'} onClick={()=>void save(true)} disabled={busy||generating||!title.trim()||!content.trim()}><FilePlus2/>Save as New</Button>}<Button variant={'outline'} onClick={download} disabled={busy||generating||!content}><Download/>Download</Button></div><Notice text={message} good={message.includes('saved')||message.includes('prepared')||message.includes('opened')||message.includes('ready')||message.includes('deleted')}/></div>
 </section><aside className={'paper-card h-fit p-6'}><h2 className={'font-serif text-2xl'}>Saved drafts</h2><p className={'mt-2 text-xs leading-5 text-muted-foreground'}>Open a draft to edit or rename it. Founder access can manage every draft.</p><ul className={'mt-4 space-y-3'}>{savedDrafts.map(d=>{const canManage=profile?.role==='admin'||String(d.author_id)===profile?.id;return <li key={d.id} className={'rounded-sm border p-3 '+(selectedId===d.id?'border-primary bg-primary/5':'border-primary/15')}><button className={'w-full text-left'} onClick={()=>openDraft(d)} disabled={busy}><span className={'block text-sm font-medium'}>{String(d.title)}</span><span className={'mt-1 block text-xs text-muted-foreground'}>{studioMaterialLabels[String(d.category)]??String(d.category)}</span><span className={'mt-1 block text-[11px] text-muted-foreground'}>Updated {displayDate(String(d.updated_at))}</span></button>{canManage&&<Button type={'button'} size={'sm'} variant={'ghost'} className={'mt-2 h-8 px-2 text-xs text-destructive hover:text-destructive'} onClick={()=>void deleteDraft(d)} disabled={busy} aria-label={'Delete '+String(d.title)}><Trash2 className={'size-3.5'}/>Delete</Button>}</li>})}</ul>{!drafts.isLoading&&!savedDrafts.length&&<p className={'mt-4 text-sm text-muted-foreground'}>No Studio drafts yet.</p>}</aside></div>;
}

export default function AcademyWorkspace(){
 const {profile}=useSession();const [searchParams,setSearchParams]=useSearchParams();const allowed=profile?.role==='coach'||profile?.role==='admin';const defaultTab=useMemo(()=>profile?.role==='admin'?'courses':'reviews',[profile?.role]);
 if(!allowed)return <p className={'page-width py-16 text-sm text-destructive'}>Authorised coach or administrator access is required.</p>;
 return <section className='mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-6 sm:py-7'><div className='mb-3'><h1 className='font-serif text-3xl text-primary sm:text-4xl'>Course Studio</h1></div><Tabs value={['courses','reviews'].includes(searchParams.get('tab')??'')?searchParams.get('tab')!:defaultTab} onValueChange={tab=>{const next=new URLSearchParams(searchParams);next.set('tab',tab);next.delete('submission');setSearchParams(next);}}><TabsList className='mb-3 h-auto flex-wrap'><TabsTrigger value={'courses'}><Library className={'mr-2 size-4'}/>Courses</TabsTrigger><TabsTrigger value={'reviews'}>Coach reviews</TabsTrigger><></></TabsList><TabsContent value={'courses'}><CourseManager/></TabsContent><TabsContent value={'reviews'}><ReviewQueue/></TabsContent><></></Tabs></section>;
}
