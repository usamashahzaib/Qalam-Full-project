import { createClient } from "@supabase/supabase-js";

const PLAN_CONFIG = {
  free: { ai_drafts: 10, carousels: 2, hooks: 5, analyses: 5 },
  solo: { ai_drafts: 25, carousels: 5, hooks: 15, analyses: 15 },
  pro: { ai_drafts: 60, carousels: 15, hooks: 50, analyses: 50 },
  agency: { ai_drafts: 60, carousels: 50, hooks: 200, analyses: 200 },
};

export async function checkPlanLimit(
  userId: string,
  feature: "ai_drafts" | "carousels" | "hooks" | "analyses"
) {
  if (!userId) {
    return { allowed: false, current: 0, limit: 0, plan: "free" };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    const { data: usageData, error: usageError } = await supabase.rpc("get_or_create_plan_usage", {
      p_user_id: userId,
    });

    if (usageError || !usageData) {
      console.error("Plan usage error:", usageError);
      return { allowed: false, current: 0, limit: 0, plan: "free" };
    }

    const usage = usageData;
    const plan = usage.plan || "free";
    const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    const limit = config?.[feature as keyof typeof config] || 0;

    const { data: result, error: rpcError } = await supabase.rpc("increment_plan_usage", {
      p_user_id: userId,
      p_field: feature,
      p_max_allowed: limit,
    });

    if (rpcError) {
      console.error("Increment error:", rpcError);
      return { allowed: false, current: 0, limit, plan };
    }

    return {
      allowed: result?.allowed || false,
      current: result?.current || 0,
      limit,
      remaining: Math.max(0, limit - (result?.current || 0)),
      plan,
    };
  } catch (err) {
    console.error("checkPlanLimit error:", err);
    return { allowed: false, current: 0, limit: 0, plan: "free" };
  }
}

export async function getPlanStatus(userId: string) {
  if (!userId) {
    return {
      plan: "free",
      limits: PLAN_CONFIG.free,
      used: { ai_drafts: 0, carousels: 0, hooks: 0, analyses: 0 },
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    const { data, error } = await supabase.rpc("get_or_create_plan_usage", {
      p_user_id: userId,
    });

    if (error || !data) {
      console.error("Get plan status error:", error);
      return {
        plan: "free",
        limits: PLAN_CONFIG.free,
        used: { ai_drafts: 0, carousels: 0, hooks: 0, analyses: 0 },
      };
    }

    const plan = data.plan || "free";
    const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];

    return {
      plan,
      limits: config,
      used: {
        ai_drafts: data.ai_drafts_used || 0,
        carousels: data.carousels_used || 0,
        hooks: data.hooks_used || 0,
        analyses: data.analyses_used || 0,
      },
    };
  } catch (err) {
    console.error("getPlanStatus error:", err);
    return {
      plan: "free",
      limits: PLAN_CONFIG.free,
      used: { ai_drafts: 0, carousels: 0, hooks: 0, analyses: 0 },
    };
  }
}
