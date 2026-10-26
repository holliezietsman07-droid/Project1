import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-hka-worker-secret',
};

type Delivery={
  delivery_id:string;lease_token:string;recipient_email:string;student_name:string;
  horse_name:string;care_title:string;care_type:string;appointment_date:string;
  appointment_time:string|null;student_timezone:string;reminder_days:number;
};

function required(name:string){
  const value=Deno.env.get(name);
  if(!value)throw new Error('missing_config:'+name.toLowerCase());
  return value;
}

async function equalSecret(actual:string,expected:string){
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(actual)),
    crypto.subtle.digest('SHA-256',encoder.encode(expected)),
  ]);
  const left=new Uint8Array(a);const right=new Uint8Array(b);let difference=left.length^right.length;
  for(let index=0;index<Math.max(left.length,right.length);index+=1)difference|=(left[index%left.length]??0)^(right[index%right.length]??0);
  return difference===0;
}

function escapeHtml(value:string){
  return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#039;');
}

function dateLabel(item:Delivery){
  const time=item.appointment_time?item.appointment_time.slice(0,5):'';
  const localDate=new Date(item.appointment_date+'T12:00:00Z');
  const date=new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'}).format(localDate);
  return time?date+' at '+time:date;
}

function reminderLabel(days:number){
  if(days===0)return 'today';
  if(days===1)return 'tomorrow';
  return 'in '+days+' days';
}

function renderEmail(item:Delivery,calendarUrl:string){
  const horse=escapeHtml(item.horse_name);
  const title=escapeHtml(item.care_title);
  const student=escapeHtml(item.student_name);
  const care=escapeHtml(item.care_type.replaceAll('_',' '));
  const when=escapeHtml(dateLabel(item));
  const lead=escapeHtml(reminderLabel(item.reminder_days));
  const safeUrl=escapeHtml(calendarUrl);
  const html=[
    '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content=width=device-width,initial-scale=1>',
    '<style>body{margin:0;background:#f4efe3;color:#173f2a;font-family:Georgia,serif}.wrap{width:100%;background:#f4efe3;padding:32px 12px}.card{max-width:620px;margin:auto;background:#fffdf6;border:1px solid #c4a35a}.head{background:#173f2a;color:#fffdf6;padding:28px;text-align:center}.mark{color:#d5b76e;letter-spacing:.18em;font-size:12px;text-transform:uppercase}.body{padding:34px}.detail{background:#f8f3e7;border-left:4px solid #b58a3b;padding:18px;margin:24px 0}.button{display:inline-block;background:#173f2a;color:#fffdf6!important;padding:13px 20px;text-decoration:none;border:1px solid #b58a3b}.foot{padding:20px 34px;color:#6f674f;font-family:Arial,sans-serif;font-size:12px;border-top:1px solid #e4d8bd}</style>',
    '</head><body><table role=presentation class=wrap><tr><td><table role=presentation class=card><tr><td class=head><div class=mark>HKA Equestrian</div><h1>Horse Care Reminder</h1></td></tr>',
    '<tr><td class=body><p>Dear '+student+',</p><p>A gentle reminder that <strong>'+title+'</strong> for <strong>'+horse+'</strong> is due '+lead+'.</p>',
    '<div class=detail><strong>Horse:</strong> '+horse+'<br><strong>Care:</strong> '+care+'<br><strong>Appointment:</strong> '+when+'</div>',
    '<p><a class=button href='+String.fromCharCode(34)+safeUrl+String.fromCharCode(34)+'>Open Horse Care Calendar</a></p><p>Warm regards,<br><strong>HKA Equestrian Online Academy</strong></p></td></tr>',
    '<tr><td class=foot>This private reminder was requested in your HKA notification and appointment settings. Sign in securely to view details or change preferences.</td></tr></table></td></tr></table></body></html>',
  ].join('');
  const text=[
    'HKA Equestrian Horse Care Reminder','',
    'Dear '+item.student_name+',','',
    item.care_title+' for '+item.horse_name+' is due '+reminderLabel(item.reminder_days)+'.',
    'Care: '+item.care_type.replaceAll('_',' '),
    'Appointment: '+dateLabel(item),'',
    'Open your secure Horse Care Calendar: '+calendarUrl,'',
    'HKA Equestrian Online Academy',
  ].join('\n');
  return {html,text};
}

serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
  if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:corsHeaders});

  try{
    const workerSecret=required('HKA_REMINDER_WORKER_SECRET');
    if(!await equalSecret(req.headers.get('x-hka-worker-secret')??'',workerSecret)){
      return new Response('Unauthorized',{status:401,headers:corsHeaders});
    }

    const supabase=createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{
      auth:{persistSession:false,autoRefreshToken:false},
    });
    const {data:settings,error:settingsError}=await supabase.from('hka_settings').select('id,value').in('id',[
      'horse_care_email_delivery_enabled','horse_care_email_kill_switch',
    ]);
    if(settingsError)throw new Error('settings_unavailable');
    const flags=Object.fromEntries((settings??[]).map((row:{id:string;value:string})=>[row.id,row.value]));
    if(flags.horse_care_email_delivery_enabled!=='true'||flags.horse_care_email_kill_switch!=='false'){
      return Response.json({status:'disabled'},{headers:corsHeaders});
    }

    const resendKey=required('RESEND_API_KEY');
    const sender=required('HKA_REMINDER_FROM');
    const appUrl=required('HKA_APP_URL').replace(/\/$/,'');
    const allowedEmail=Deno.env.get('HKA_REMINDER_TEST_EMAIL')||null;
    const workerId=crypto.randomUUID();

    const {error:prepareError}=await supabase.rpc('hka_prepare_care_email_deliveries',{at_time:new Date().toISOString()});
    if(prepareError)throw new Error('prepare_failed');
    const {data,error:claimError}=await supabase.rpc('hka_claim_care_email_deliveries',{
      worker_id:workerId,claim_limit:10,allowed_email:allowedEmail,
    });
    if(claimError)throw new Error('claim_failed');

    let sent=0;
    for(const item of (data??[]) as Delivery[]){
      const {data:eligible,error:eligibleError}=await supabase.rpc('hka_recheck_care_email_delivery',{
        target_delivery:item.delivery_id,target_lease:item.lease_token,
      });
      if(eligibleError||eligible!==true){
        await supabase.rpc('hka_finish_care_email_delivery',{
          target_delivery:item.delivery_id,target_lease:item.lease_token,outcome:'permanent_failure',
          resend_message_id:null,safe_error_code:'eligibility_recheck_failed',
        });
        continue;
      }

      const calendarUrl=appUrl+'/dashboard/student?section=horses';
      const content=renderEmail(item,calendarUrl);
      try{
        const response=await fetch('https://api.resend.com/emails',{
          method:'POST',
          headers:{
            Authorization:'Bearer '+resendKey,'Content-Type':'application/json',
            'Idempotency-Key':'hka-care-'+item.delivery_id,
          },
          body:JSON.stringify({
            from:sender,to:[item.recipient_email],
            subject:'Horse care reminder: '+item.horse_name+' · '+item.care_title,
            html:content.html,text:content.text,
          }),
        });
        if(response.ok){
          const payload=await response.json().catch(()=>({})) as {id?:string};
          const outcome=payload.id?'sent':'manual_review';
          await supabase.rpc('hka_finish_care_email_delivery',{
            target_delivery:item.delivery_id,target_lease:item.lease_token,outcome,
            resend_message_id:payload.id??null,safe_error_code:payload.id?null:'resend_missing_id',
          });
          if(payload.id)sent+=1;
        }else{
          const retry=response.status===408||response.status===429;
          const uncertain=response.status>=500;
          await supabase.rpc('hka_finish_care_email_delivery',{
            target_delivery:item.delivery_id,target_lease:item.lease_token,
            outcome:retry?'retry':uncertain?'manual_review':'permanent_failure',
            resend_message_id:null,safe_error_code:'resend_http_'+response.status,
          });
        }
      }catch{
        await supabase.rpc('hka_finish_care_email_delivery',{
          target_delivery:item.delivery_id,target_lease:item.lease_token,outcome:'manual_review',
          resend_message_id:null,safe_error_code:'resend_transport_uncertain',
        });
      }
    }

    console.log(JSON.stringify({event:'horse_care_email_run',claimed:(data??[]).length,sent}));
    return Response.json({status:'ok',claimed:(data??[]).length,sent},{headers:corsHeaders});
  }catch(error){
    const code=error instanceof Error&&/^[a-z0-9_:.-]+$/.test(error.message)?error.message:'worker_failed';
    console.error(JSON.stringify({event:'horse_care_email_error',code}));
    return Response.json({status:'error',code},{status:500,headers:corsHeaders});
  }
});
