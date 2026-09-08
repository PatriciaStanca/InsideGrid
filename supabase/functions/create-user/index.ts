import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization") ?? "";
    const caller = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "Authentication required." }, 401);
    const { data: profile } = await admin.from("profiles").select("platform_role").eq("id", user.id).single();
    if (profile?.platform_role !== "platform_admin") return json({ error: "Platform administrator access required." }, 403);

    const body = await request.json();
    const { email, password, fullName, role, organizationId, organizationName, workspaceMode = "recruitment" } = body;
    if (!email || !password || !fullName || !["customer", "platform_admin"].includes(role)) return json({ error: "Email, password, name, and a valid role are required." }, 400);
    if (password.length < 10) return json({ error: "The temporary password must contain at least 10 characters." }, 400);

    let organization = null;
    if (role === "customer") {
      if (organizationId) {
        const result = await admin.from("organizations").select("id, name, workspace_mode").eq("id", organizationId).single();
        if (result.error) return json({ error: "Organization not found." }, 400);
        organization = result.data;
      } else {
        if (!organizationName) return json({ error: "An organization is required for a customer." }, 400);
        const result = await admin.from("organizations").insert({ name: organizationName, workspace_mode: workspaceMode, created_by: user.id }).select("id, name, workspace_mode").single();
        if (result.error) throw result.error;
        organization = result.data;
      }
    }

    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (created.error || !created.data.user) throw created.error ?? new Error("User creation failed.");
    const userId = created.data.user.id;
    try {
      const profileUpdate = await admin.from("profiles").update({ full_name: fullName, email, platform_role: role }).eq("id", userId);
      if (profileUpdate.error) throw profileUpdate.error;
      if (organization) {
        const membership = await admin.from("organization_members").insert({ organization_id: organization.id, user_id: userId, role: "owner" });
        if (membership.error) throw membership.error;
      }
    } catch (error) {
      await admin.auth.admin.deleteUser(userId);
      throw error;
    }
    return json({ user: { id: userId, email, fullName, role }, organization }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected account creation error." }, 500);
  }
});
