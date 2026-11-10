import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/contexts/SessionContext';
import { db } from '@/lib/academy';
import { fitnessRequestsEnabled, type ProgrammeRequest } from '@/lib/fitness/requests';

const requestCardColumns='id,student_id,founder_id,horse_id,horse_name,kind,message_id,programme_id,reply_message_id,created_at';

export function useFitnessRequests(enabled=true){
  const {session}=useSession();
  return useQuery<ProgrammeRequest[]>({
    queryKey:['academy',session?.user.id,'fitness-requests'],
    enabled:enabled&&fitnessRequestsEnabled&&Boolean(session),
    queryFn:async()=>{
      const {data,error}=await db().from('hka_fitness_requests').select(requestCardColumns).order('created_at',{ascending:false});
      if(error)throw error;
      return (data??[]) as ProgrammeRequest[];
    },
    retry:false,
    refetchInterval:15000,
  });
}
