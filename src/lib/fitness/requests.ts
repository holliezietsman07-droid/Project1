import type { FitnessKind, Intake } from './model';

export const fitnessRequestsEnabled = import.meta.env.VITE_FITNESS_DATABASE_ENABLED === 'true'
  && import.meta.env.VITE_FITNESS_REQUESTS_ENABLED === 'true';

export type ProgrammeRequest = {
  id: string;
  student_id: string;
  founder_id: string;
  horse_id: string | null;
  horse_name: string | null;
  kind: FitnessKind;
  message_id: string;
  programme_id: string | null;
  reply_message_id: string | null;
  created_at: string;
};
export type ProgrammeRequestDetails = ProgrammeRequest & {intake: Intake};

export function requestedProgrammePath(request: ProgrammeRequest){
  const path=request.horse_id
    ? '/dashboard/fitness/horse/'+encodeURIComponent(request.horse_id)
    : '/dashboard/fitness/rider';
  return path+'?panel=progress&programme='+encodeURIComponent(request.programme_id??'');
}
