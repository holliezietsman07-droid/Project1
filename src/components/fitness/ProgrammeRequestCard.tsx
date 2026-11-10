import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestedProgrammePath, type ProgrammeRequest } from '@/lib/fitness/requests';

export function ProgrammeRequestCard({request,viewerId,reply=false,requesterName,onOpen}:{
  request:ProgrammeRequest; viewerId:string; reply?:boolean; requesterName?:string; onOpen?:()=>void;
}){
  const founder=viewerId===request.founder_id;
  return <div className='min-w-0 space-y-2 rounded-xl border border-[#B79B62]/45 bg-[#F6F1E7] px-3 py-3 text-primary'>
    <p className='flex items-center gap-2 font-semibold'><ClipboardList className='size-4 shrink-0 text-[#826e45]' aria-hidden='true'/>{reply?'Programme ready':'Programme request'}</p>
    <p className='break-words text-sm'>{request.kind==='horse'?'Horse conditioning · '+request.horse_name:'Rider fitness & mobility'}{requesterName?' · '+requesterName:''}</p>
    {founder && !reply
      ? (onOpen ? <Button type='button' variant='outline' size='sm' className='min-h-11 rounded-lg' onClick={onOpen}>Open request</Button>
        : <Button asChild variant='outline' size='sm' className='min-h-11 rounded-lg'><Link to={'/dashboard/programmes?request='+encodeURIComponent(request.id)}>Open request</Link></Button>)
      : reply&&request.programme_id&&!founder
        ? <Button asChild size='sm' className='min-h-11 rounded-lg'><Link to={requestedProgrammePath(request)}>View programme</Link></Button>
        : <p className='text-xs text-muted-foreground'>{reply?'Sent to the member':request.reply_message_id?'Programme sent':'Sent to Hollie'}</p>}
  </div>;
}
