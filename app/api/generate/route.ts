import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/clerk-client";
import { getCurrentWorkspace } from "@/lib/server/workspace";
import { generatePost, scoreContent, rewriteWithFeedback } from "@/lib/server/content-generator";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
<<<<<<< HEAD
import { checkPlanLimit, getPlanStatus } from "@/lib/server/plan-limits";
=======
import { checkPlanLimit } from "@/lib/server/plan-limits";
>>>>>>> 6fcbed7ec6dee89513f4d174f4fde5ca132ee368
import { createServiceClient } from "@/lib/server/supabase-rest";

type GenerateBody = {
  topic?: string
  role?: string
  tone?: string
  format?: "short" | "medium" | "long"
  goal?: string
  qualityCheck?: boolean
}

<<<<<<< HEAD
// Simple cache - same topic dobara generate nahi hoga 5 minute tak
const generationCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(userId: string, topic: string, role: string, format: string): string {
  return `${userId}:${topic.trim().toLowerCase()}:${role}:${format}`;
=======
type ScoreResult = {
  total_score: number
  hook_score: number
  authenticity_score: number
  specificity_score: number
  engagement_score: number
  formatting_score: number
  feedback: string
  is_good_enough: boolean
>>>>>>> 6fcbed7ec6dee89513f4d174f4fde5ca132ee368
}

export async function GET() {
  try {
<<<<<<< HEAD
    const userId = await requireAuth();
    const status = await getPlanStatus(userId);
    return NextResponse.json({ 
      usage: { 
        allowed: true, 
        current: status.used.ai_drafts, 
        limit: status.limits.ai_drafts,
        plan: status.plan
      } 
    });
=======
    const userId = await requireAuth()
    const { allowed, current, limit } = await checkPlanLimit(userId, "ai_drafts")
    return NextResponse.json({ usage: { allowed, current, limit } })
>>>>>>> 6fcbed7ec6dee89513f4d174f4fde5ca132ee368
  } catch (error) {
    const message = (error as Error).message || "Failed to load usage";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    
    // 1. Pehle plan check karo (read-only, database increment nahi hoga abhi)
    const planStatus = await getPlanStatus(userId);
    
    // 2. Rate limit check karo - ASLI PLAN ke hisaab se
    // YEH CRITICAL FIX HAI: Pehle "Free" hardcoded tha, ab asli plan ja raha hai
    const rate = await checkRateLimit(userId, planStatus.plan, getClientIp(req));
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." }, 
        { status: 429 }
      );
    }

    const body = (await req.json()) as GenerateBody;
    const topic = String(body.topic || "").trim();
    const role = body.role || "founder";
    const format = body.format || "medium";
    const qualityCheck = body.qualityCheck !== false;

    if (topic.length < 3) {
      return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 });
    }

    // 3. Ab plan limit check aur increment karo (atomic operation)
    const planLimit = await checkPlanLimit(userId, "ai_drafts");
    if (!planLimit.allowed) {
      return NextResponse.json(
        { error: "Plan limit reached", current: planLimit.current, limit: planLimit.limit, upgrade_url: "/pricing" }, 
        { status: 403 }
      );
    }

    // Cache check - same cheez dobara generate nahi hogi
    const cacheKey = getCacheKey(userId, topic, role, format);
    const cached = generationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        cached: true,
        usage: { allowed: true, current: planLimit.current, limit: planLimit.limit },
        post: JSON.parse(cached.content),
      });
    }

    const supabase = createServiceClient();
    const { workspaceId } = await getCurrentWorkspace();
    const { data: voiceProfile } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

<<<<<<< HEAD
    const post = await generatePost({ topic, role, tone: body.tone, voiceProfile, goal: body.goal, format });
    let finalContent = post.full_text;
    let finalScore = null;
=======
    const post = await generatePost({ topic, role, tone: body.tone, voiceProfile, goal: body.goal, format })
    let finalContent = post.full_text
    let finalScore: ScoreResult | null = null
>>>>>>> 6fcbed7ec6dee89513f4d174f4fde5ca132ee368

    // Free users ke liye quality check skip karo - API cost bachao
    // Paid users ke liye bhi sirf agar score 60 se kam ho toh rewrite karo
    if (qualityCheck && planStatus.plan !== "free") {
      try {
        const score = await scoreContent(finalContent, role);
        finalScore = score;

        if (score.total_score < 60 && score.feedback) {
          const rewritten = await rewriteWithFeedback(finalContent, score.feedback, role);
          const newScore = await scoreContent(rewritten, role);
          if (newScore.total_score > score.total_score) {
            finalContent = rewritten;
            finalScore = newScore;
          }
        }
      } catch (scoreError) {
        console.error("Quality check failed, using original:", scoreError);
      }
    }

    const metadata = {
      generation_params: { topic, role, format, goal: body.goal || null },
      quality_score: finalScore,
      hashtags: post.suggested_hashtags,
      engagement_prediction: post.engagement_prediction,
    };
    
    const { data: savedPostId, error: saveError } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_title: topic,
      p_content: finalContent,
      p_hook: post.hook,
      p_cta: post.cta,
      p_role_profile: role,
      p_topic: topic,
      p_engagement_score: finalScore?.total_score || null,
      p_metadata: metadata,
      p_status: "draft",
    });

    if (saveError) console.error("Failed to save post:", saveError);

    const responsePayload = {
      success: true,
<<<<<<< HEAD
      usage: { allowed: true, current: planLimit.current, limit: planLimit.limit },
=======
      usage: { allowed: plan.allowed, current: plan.current, limit: plan.limit },
>>>>>>> 6fcbed7ec6dee89513f4d174f4fde5ca132ee368
      post: {
        id: savedPostId || undefined,
        content: finalContent,
        hook: post.hook,
        body: post.body,
        cta: post.cta,
        hashtags: post.suggested_hashtags,
        score: finalScore,
        role,
        saved: Boolean(savedPostId),
      },
    };

    generationCache.set(cacheKey, { content: JSON.stringify(responsePayload.post), timestamp: Date.now() });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Generate error:", error);
    const message = (error as Error).message || "Failed to generate post";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = (await req.json()) as { id?: string; content?: string; confirmOnly?: boolean };
    if (!body.id) return NextResponse.json({ error: "Post id required" }, { status: 400 });

    const supabase = createServiceClient();
    if (body.confirmOnly) {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", body.id)
        .eq("user_id", userId)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, post: data });
    }

    const { data, error } = await supabase
      .from("posts")
      .update({ content: String(body.content || ""), updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    const message = (error as Error).message || "Failed to update post";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}