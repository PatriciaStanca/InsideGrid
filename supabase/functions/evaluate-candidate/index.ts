import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const asWords = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9+#.]{3,}/g) ?? []);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Authentication required." }, 401);
    const { applicationId } = await request.json();
    const { data: application, error } = await client.from("applications").select("id, organization_id, candidate_id, job_id").eq("id", applicationId).single();
    if (error || !application) return json({ error: "Application not found or access denied." }, 404);
    const [{ data: candidate }, { data: job }] = await Promise.all([
      client.from("candidates").select("full_name, professional_title, summary, skills").eq("id", application.candidate_id).single(),
      client.from("jobs").select("title, description").eq("id", application.job_id).single(),
    ]);
    if (!candidate || !job) return json({ error: "Candidate or job is unavailable." }, 404);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    let result: { summary: string; strengths: string[]; gaps: string[]; follow_up_questions: string[] };
    let model = "rules-fallback";
    if (apiKey) {
      model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";
      const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input: [{ role: "system", content: "You create cautious recruitment decision support. Use only supplied facts. Never infer protected characteristics. Return JSON with summary, strengths, gaps, and follow_up_questions. Do not recommend rejection or hiring." }, { role: "user", content: JSON.stringify({ job, candidate }) }], text: { format: { type: "json_schema", name: "candidate_insights", strict: true, schema: { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, gaps: { type: "array", items: { type: "string" } }, follow_up_questions: { type: "array", items: { type: "string" } } }, required: ["summary", "strengths", "gaps", "follow_up_questions"] } } } }) });
      if (!response.ok) throw new Error("The AI provider could not complete the evaluation.");
      const payload = await response.json();
      const outputText = payload.output_text ?? payload.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).find((item: { type: string }) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("The AI provider returned no structured output.");
      result = JSON.parse(outputText);
    } else {
      const requirements = asWords(`${job.title} ${job.description}`); const supported = candidate.skills.filter((skill: string) => [...asWords(skill)].some((word) => requirements.has(word)));
      result = { summary: supported.length ? `${candidate.full_name} has explicit profile evidence for part of the ${job.title} requirements.` : `The current profile does not contain enough direct evidence to assess ${job.title}.`, strengths: supported.length ? supported.map((skill: string) => `${skill} appears in the candidate profile and the job context.`) : ["No direct requirement match was claimed."], gaps: ["Confirm the depth, recency, and project context of the key requirements."], follow_up_questions: ["Which recent project best demonstrates the most important requirement for this role?"] };
    }
    const { data: evaluation, error: insertError } = await client.from("ai_evaluations").insert({ organization_id: application.organization_id, application_id: application.id, ...result, model, input_snapshot: { job, candidate }, created_by: user.id }).select().single();
    if (insertError) throw insertError;
    return json({ evaluation });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Unexpected AI evaluation error." }, 500); }
});
