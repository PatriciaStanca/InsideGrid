import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const MAX = 10 * 1024 * 1024;
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length")) > MAX + 600000) return json({ error: "The PDF must be no larger than 10 MB." }, 413);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let storagePath: string | undefined;
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}:${ip}`));
    const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const limit = await admin.rpc("reserve_application_attempt", { rate_key: key });
    if (limit.error) throw new Error("Unable to submit right now. Please try again later.");
    if (!limit.data) return json({ error: "Too many attempts. Please try again in 15 minutes." }, 429);
    const form = await request.formData();
    const field = (name: string, max: number) => {
      const value = form.get(name);
      if (value !== null && typeof value !== "string") throw new Error("Invalid form data.");
      const text = (value || "").trim();
      if (text.length > max) throw new Error(`${name} is too long.`);
      return text;
    };
    if (field("company_website", 200)) return json({ error: "Unable to submit this application." }, 400);
    const slug = field("slug", 120);
    const first = field("first_name", 90), last = field("last_name", 90);
    const email = field("email", 254).toLowerCase();
    if (!first || !last || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || field("consent", 10) !== "on") throw new Error("Please complete the required fields and accept the privacy information.");
    const urlField = (name: string) => {
      const value = field(name, 1500);
      if (value && !["https:", "http:"].includes(new URL(value).protocol)) throw new Error("Profile links must use http or https.");
      return value;
    };
    const person = { id: crypto.randomUUID(), full_name: `${first} ${last}`, email, phone: field("phone", 60), linkedin_url: urlField("linkedin_url"), website: urlField("website"), motivation: field("motivation", 10000) };
    const file = form.get("cv");
    if (!(file instanceof File) || !file.size || file.size > MAX || !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Please upload a PDF no larger than 10 MB.");
    if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-") throw new Error("The uploaded file is not a PDF.");
    const pages = JSON.parse(field("pages", 500000) || "[]");
    if (!Array.isArray(pages) || pages.length > 100 || pages.some(p => !Number.isInteger(p.page) || p.page < 1 || typeof p.text !== "string")) throw new Error("Invalid CV text.");
    const job = await admin.from("jobs").select("id,organization_id").eq("public_slug", slug).eq("published", true).eq("status", "open").maybeSingle();
    if (job.error) throw new Error("Unable to load this role. Please try again.");
    if (!job.data) return json({ error: "This role is not accepting applications." }, 404);
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    storagePath = `${job.data.organization_id}/${person.id}/${crypto.randomUUID()}-${fileName}`;
    const uploaded = await admin.storage.from("candidate-resumes").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
    if (uploaded.error) throw new Error("Your CV could not be saved. Please try again.");
    const result = await admin.rpc("submit_public_application", { slug, person, document: { storage_path: storagePath, file_name: fileName, size_bytes: file.size, pages } });
    if (result.error) {
      const message = result.error.message;
      throw new Error(message.includes("already received") || message.includes("not accepting") ? message : "Your application could not be saved. Please try again.");
    }
    storagePath = undefined;
    return json({ received: true, reference: result.data });
  } catch (error) {
    if (storagePath) await admin.storage.from("candidate-resumes").remove([storagePath]);
    return json({ error: error instanceof Error ? error.message : "Unable to submit. Please try again." }, 400);
  }
});
