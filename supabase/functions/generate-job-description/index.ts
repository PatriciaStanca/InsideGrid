import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
type GeminiCandidate = { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { web?: { title?: string; uri?: string } }[] } };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Authentication required." }, 401);

    const input = await request.json();
    const title = String(input.title ?? "").trim();
    const organizationId = String(input.organizationId ?? "").trim();
    const action = input.action === "chat" ? "chat" : "draft";
    if (!title || !organizationId) return json({ error: "Organization and job title are required." }, 400);
    const { data: organization } = await client.from("organizations").select("id, name").eq("id", organizationId).single();
    if (!organization) return json({ error: "Workspace not found or access denied." }, 403);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Gemini is not configured for this workspace yet." }, 503);
    const companyWebsite = String(input.companyWebsite ?? "").trim();
    const researchNotes = Array.isArray(input.researchNotes) ? input.researchNotes.slice(-10).map(String) : [];
    const role = { company: organization.name, companyWebsite, title, department: input.department, location: input.location, employmentType: input.employmentType, workspaceMode: input.workspaceMode };
    const systemInstruction = action === "chat"
      ? "You are a careful recruitment writing partner. Help refine the supplied role facts and distinguish confirmed information from general recruitment patterns. Free mode does not open websites or perform live searches, so state that limitation when relevant. Never invent benefits, salary, culture claims, requirements or company facts. Answer conversationally in English, mention uncertainties, and ask at most two useful follow-up questions. Do not write the final advertisement yet."
      : "Write a concise, inclusive English job advertisement using only the supplied role facts and recruiter notes. The company URL is a reference only and has not been opened. Use general recruitment patterns only as suggestions; do not claim that live comparable advertisements were searched. Never invent salary, benefits, experience years, technology or culture claims. Structure the editable draft with a short introduction, What you will do, What we are looking for, and practical details. Use plain text with short bullets and no inline citations.";
    const prompt = action === "chat"
      ? JSON.stringify({ role, conversation: researchNotes, recruiterMessage: String(input.message ?? "Help refine the role and explain what should shape this advertisement.") })
      : JSON.stringify({ role, agreedResearch: researchNotes });
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: action === "chat" ? 550 : 900 } }),
    });
    if (!response.ok) return json({ error: "Gemini could not complete the research. Check the key and free-tier quota." }, 502);
    const payload = await response.json();
    const candidate = (payload.candidates?.[0] ?? {}) as GeminiCandidate;
    const text = (candidate.content?.parts ?? []).map((part) => part.text ?? "").filter(Boolean).join("\n").trim();
    if (!text) return json({ error: "Gemini returned an empty response." }, 502);

    const sourceMap = new Map<string, { title: string; url: string }>();
    for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
      const url = chunk.web?.uri;
      if (url) sourceMap.set(url, { title: chunk.web?.title || new URL(url).hostname, url });
    }
    if (companyWebsite) {
      try { const url = new URL(companyWebsite); sourceMap.set(url.href, { title: url.hostname, url: url.href }); } catch { /* The form validates URLs. */ }
    }
    const sources = [...sourceMap.values()].slice(0, 8);
    return action === "chat" ? json({ reply: text, sources }) : json({ description: text, sources });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected AI research error." }, 500);
  }
});
