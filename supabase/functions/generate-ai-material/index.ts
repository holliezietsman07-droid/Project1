import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const MODEL = "gpt-6-luna";
const DAILY_LIMIT = 20;
const HOURLY_LIMIT = 6;
const labels: Record<string, string> = {
  riding_lesson: "Riding lesson plan",
  pony_club: "Pony Club worksheet",
  quiz: "Quiz",
  assessment: "Assessment",
  horse_care: "Horse-care plan",
  revision: "Student revision material",
  development: "Student development programme",
  memorandum: "Marking memorandum",
  competition: "Competition preparation plan",
  stable: "Stable management checklist",
};
const allowedKeys = new Set(["materialType", "title", "riderLevel", "durationMinutes", "learningObjectives", "horseDetails", "equipment", "safetyConsiderations"]);

type StudioInput = {
  materialType: string; title: string; riderLevel: string; durationMinutes: number;
  learningObjectives: string; horseDetails: string; equipment: string; safetyConsiderations: string;
};

function field(value: unknown, name: string, max: number, required = true) {
  const clean = typeof value === "string" ? value.trim() : "";
  if (required && !clean) throw new Error(`${name} is required.`);
  if (clean.length > max) throw new Error(`${name} is too long.`);
  return clean;
}

function parseInput(value: unknown): StudioInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid generation request.");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw new Error("Unsupported fields supplied. Student records and identities are not accepted.");
  const materialType = field(body.materialType, "Material type", 40);
  if (!labels[materialType]) throw new Error("Choose a supported material type.");
  const durationMinutes = Number(body.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 240) throw new Error("Duration must be between 10 and 240 minutes.");
  return {
    materialType,
    title: field(body.title, "Title", 160),
    riderLevel: field(body.riderLevel, "Rider level", 120),
    durationMinutes,
    learningObjectives: field(body.learningObjectives, "Learning objectives", 2400),
    horseDetails: field(body.horseDetails, "Horse details", 1600, false),
    equipment: field(body.equipment, "Available equipment", 1200, false),
    safetyConsiderations: field(body.safetyConsiderations, "Safety considerations", 1600),
  };
}

function promptFor(input: StudioInput) {
  return [
    `Create a professional ${labels[input.materialType]} for equestrian education.`,
    `Title: ${input.title}`,
    `Rider level: ${input.riderLevel}`,
    `Duration: ${input.durationMinutes} minutes`,
    `Learning objectives: ${input.learningObjectives}`,
    `Horse details: ${input.horseDetails || "None supplied"}`,
    `Available equipment: ${input.equipment || "Standard arena equipment"}`,
    `Safety considerations: ${input.safetyConsiderations}`,
    "Use clear headings, timed activities where relevant, differentiation, safety checks, assessment criteria, and a Founder review checklist.",
    "Do not infer or request student identities, personal records, photographs, medical information, or assessment history.",
    "Label the result as AI-generated and require qualified human review before use, publishing, or sharing.",
  ].join("\n");
}

function mockContent(input: StudioInput) {
  const activity = input.materialType === "horse_care"
    ? "Observe and complete the care sequence with welfare checks at every stage."
    : ["quiz", "assessment"].includes(input.materialType)
      ? "Complete knowledge questions, scenario decisions and a coach-observed practical task."
      : ["pony_club", "revision"].includes(input.materialType)
        ? "Work through guided recall, applied examples and a short self-check activity."
        : "Progress from controlled warm-up through focused practice to a calm consolidation exercise.";
  return [
    "AI-GENERATED DRAFT — MOCK PREVIEW",
    "Qualified Founder review required before use, publishing or sharing.", "",
    input.title, `${labels[input.materialType]} · ${input.riderLevel} · ${input.durationMinutes} minutes`, "",
    "Learning objectives", input.learningObjectives, "",
    "Horse and equipment context", `${input.horseDetails || "No specific horse details supplied."}\nEquipment: ${input.equipment || "Standard arena equipment."}`, "",
    "Structured teaching sequence",
    "1. Welcome, readiness and safety briefing — confirm environment, tack or tools, and participant readiness.",
    "2. Foundation review — connect prior knowledge to the stated objectives.",
    `3. Main learning activity — ${activity}`,
    "4. Supported practice — adjust complexity, pace and assistance for rider level and horse response.",
    "5. Consolidation — review key decisions, correct misconceptions and identify next steps.", "",
    "Safety and welfare", input.safetyConsiderations,
    "Stop or adapt immediately if horse welfare, rider confidence, footing, equipment or supervision becomes unsuitable.", "",
    "Assessment criteria",
    "• Demonstrates safe preparation and correct sequencing.",
    "• Explains decisions using appropriate equestrian terminology.",
    "• Responds appropriately to horse behaviour and welfare signals.",
    "• Identifies one strength and one practical next step.", "",
    "Founder review checklist",
    "□ Confirm technical accuracy and age/level suitability.",
    "□ Confirm horse welfare and site-specific safety requirements.",
    "□ Edit timings, equipment and differentiation for the real setting.",
    "□ Remove personal information before saving, downloading, publishing or sharing.",
  ].join("\n");
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload.output) ? payload.output : []) {
    const content = item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    for (const part of content) if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") return String((part as Record<string, unknown>).text);
  }
  throw new Error("OpenAI returned no editable text.");
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let usageId = "";
  let admin: ReturnType<typeof createClient> | null = null;
  try {
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: jsonHeaders });
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Sign in is required." }), { status: 401, headers: jsonHeaders });
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Server configuration is incomplete.");
    admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) return new Response(JSON.stringify({ error: "Session is invalid or expired." }), { status: 401, headers: jsonHeaders });
    const { data: profile, error: profileError } = await admin.from("hka_profiles").select("role,suspended").eq("id", authData.user.id).single();
    if (profileError || !profile || profile.role !== "admin" || profile.suspended) {
      return new Response(JSON.stringify({ error: "Founder access is required for AI generation." }), { status: 403, headers: jsonHeaders });
    }

    const body = await request.json();
    const live = Deno.env.get("HKA_AI_LIVE")?.trim().toLowerCase() === "true";
    if (body && typeof body === "object" && !Array.isArray(body) && (body as Record<string, unknown>).action === "status") {
      return new Response(JSON.stringify({
        mode: live ? "live" : "mock",
        model: MODEL,
        configured: live && Boolean(Deno.env.get("OPENAI_API_KEY")),
        dailyLimit: DAILY_LIMIT,
        hourlyLimit: HOURLY_LIMIT,
      }), { headers: jsonHeaders });
    }

    const input = parseInput(body);
    const dayStart = new Date(Date.now() - 86_400_000).toISOString();
    const hourStart = new Date(Date.now() - 3_600_000).toISOString();
    const [{ count: daily }, { count: hourly }] = await Promise.all([
      admin.from("hka_ai_usage").select("id", { count: "exact", head: true }).eq("founder_id", authData.user.id).gte("created_at", dayStart),
      admin.from("hka_ai_usage").select("id", { count: "exact", head: true }).eq("founder_id", authData.user.id).gte("created_at", hourStart),
    ]);
    if ((daily ?? 0) >= DAILY_LIMIT || (hourly ?? 0) >= HOURLY_LIMIT) {
      return new Response(JSON.stringify({ error: "AI Studio request limit reached. Try again after the limit window resets." }), { status: 429, headers: jsonHeaders });
    }

    const mode = live ? "live" : "mock";
    const prompt = promptFor(input);
    const { data: usage, error: usageError } = await admin.from("hka_ai_usage").insert({ founder_id: authData.user.id, mode, model: MODEL, material_type: input.materialType, status: "started", input_chars: prompt.length }).select("id").single();
    if (usageError || !usage) throw new Error("Usage tracking is unavailable.");
    usageId = String(usage.id);

    let content: string;
    let inputTokens: number | null;
    let outputTokens: number | null;
    if (!live) {
      content = mockContent(input);
      inputTokens = Math.ceil(prompt.length / 4);
      outputTokens = Math.ceil(content.length / 4);
    } else {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("Live AI generation is not configured.");
      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          instructions: "You are HKA Equestrian AI Studio. Produce accurate, practical educational drafts in South African English. Prioritise horse welfare, rider safety and qualified human review. Never invent personal student data.",
          input: prompt,
          reasoning: { effort: "low" },
          max_output_tokens: 2200,
          store: false,
        }),
      });
      if (!openaiResponse.ok) throw new Error(`OpenAI generation failed with status ${openaiResponse.status}.`);
      const payload = await openaiResponse.json() as Record<string, unknown>;
      content = outputText(payload);
      const usageData = payload.usage as Record<string, unknown> | undefined;
      inputTokens = Number(usageData?.input_tokens) || null;
      outputTokens = Number(usageData?.output_tokens) || null;
    }

    await admin.from("hka_ai_usage").update({ status: "completed", output_chars: content.length, input_tokens: inputTokens, output_tokens: outputTokens }).eq("id", usageId);
    return new Response(JSON.stringify({ content, mode, model: MODEL, aiGenerated: true, remainingDaily: Math.max(0, DAILY_LIMIT - (daily ?? 0) - 1) }), { headers: jsonHeaders });
  } catch (error) {
    if (usageId && admin) await admin.from("hka_ai_usage").update({ status: "failed" }).eq("id", usageId);
    const message = error instanceof Error ? error.message : "AI generation failed.";
    const status = /required|Invalid|Choose|too long|Duration|Unsupported/.test(message) ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
  }
});
