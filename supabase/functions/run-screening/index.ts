import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Education level hierarchy for comparing education qualifications
const EDUCATION_LEVELS: Record<string, number> = {
  "certificate": 1, "diploma": 1, "adv diploma": 1, "advanced diploma": 1,
  "bachelor": 2, "bsc": 2, "ba": 2, "bsw": 2, "bba": 2, "bcom": 2, "btech": 2, "gnm": 2, "b.sc": 2,
  "master": 3, "msw": 3, "msc": 3, "mphil": 3, "m.phil": 3, "ma": 3, "mba": 3, "m.sc": 3, "m.a": 3, "pgdiploma": 3, "pg diploma": 3, "post graduate": 3, "postgraduate": 3,
  "doctorate": 4, "phd": 4, "ph.d": 4, "md": 4, "dм": 4, "dnb": 4,
};

function getEducationLevel(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  // Check from highest level to lowest so we get the best match
  const sorted = Object.entries(EDUCATION_LEVELS).sort((a, b) => b[1] - a[1]);
  for (const [key, level] of sorted) {
    if (lower.includes(key)) return level;
  }
  return 0;
}

// Array fields that need special contains handling
const ARRAY_FIELDS = new Set(["clinical_exposure", "languages_known", "skill_tags", "talent_pool_tags", "required_credentials"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidate_id, requisition_id, template_id } = await req.json();
    if (!candidate_id || !template_id) {
      return new Response(JSON.stringify({ error: "candidate_id and template_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get auth user from JWT
    const authHeader = req.headers.get("Authorization");
    let runBy: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      runBy = user?.id || null;
    }

    // Load candidate
    const { data: candidate, error: candErr } = await supabase.from("candidates").select("*").eq("id", candidate_id).single();
    if (candErr || !candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load template
    const { data: template, error: tmplErr } = await supabase.from("screening_templates").select("*").eq("id", template_id).single();
    if (tmplErr || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load rules
    const { data: rules = [] } = await supabase.from("screening_template_rules").select("*").eq("template_id", template_id);

    // Create screening run
    const { data: run, error: runErr } = await supabase.from("screening_runs").insert({
      candidate_id, requisition_id: requisition_id || null, template_id,
      status: "running", run_by: runBy,
    }).select().single();
    if (runErr) throw runErr;

    let totalScore = 0;
    let maxPossibleScore = 0;
    let knockoutFailed = false;
    const redFlags: string[] = [];
    const resultItems: any[] = [];

    for (const rule of rules!) {
      const fieldValue = (candidate as any)[rule.field_name];
      let passed = false;
      const threshold = rule.threshold_value;

      // Special handling for education field comparisons
      const isEducationField = rule.field_name === "education";
      const isArrayField = ARRAY_FIELDS.has(rule.field_name);

      // Evaluate rule
      switch (rule.operator) {
        case "gte":
          if (isEducationField) {
            const candidateLevel = getEducationLevel(String(fieldValue || ""));
            const thresholdLevel = getEducationLevel(String(threshold || ""));
            passed = candidateLevel >= thresholdLevel && candidateLevel > 0;
          } else {
            passed = fieldValue != null && Number(fieldValue) >= Number(threshold);
          }
          break;
        case "lte":
          if (isEducationField) {
            const candidateLevel = getEducationLevel(String(fieldValue || ""));
            const thresholdLevel = getEducationLevel(String(threshold || ""));
            passed = candidateLevel <= thresholdLevel && candidateLevel > 0;
          } else {
            passed = fieldValue != null && Number(fieldValue) <= Number(threshold);
          }
          break;
        case "eq":
          if (isEducationField) {
            const candidateLevel = getEducationLevel(String(fieldValue || ""));
            const thresholdLevel = getEducationLevel(String(threshold || ""));
            passed = candidateLevel === thresholdLevel && candidateLevel > 0;
          } else {
            passed = String(fieldValue) === String(threshold);
          }
          break;
        case "neq":
          passed = String(fieldValue) !== String(threshold);
          break;
        case "contains":
          if (isArrayField && Array.isArray(fieldValue)) {
            // Proper array element matching
            const thresholdLower = String(threshold).toLowerCase();
            passed = fieldValue.some((item: any) => 
              String(item).toLowerCase().includes(thresholdLower)
            );
          } else {
            passed = fieldValue != null && String(fieldValue).toLowerCase().includes(String(threshold).toLowerCase());
          }
          break;
        case "exists":
          passed = fieldValue != null && fieldValue !== "" && fieldValue !== false;
          if (Array.isArray(fieldValue)) {
            passed = fieldValue.length > 0;
          }
          break;
        default:
          passed = true;
      }

      if (rule.rule_type === "weighted") {
        maxPossibleScore += rule.weight;
      }

      const pointsAwarded = passed && rule.rule_type === "weighted" ? rule.weight : 0;
      if (passed && rule.rule_type === "weighted") totalScore += pointsAwarded;

      if (!passed && rule.rule_type === "knockout") {
        knockoutFailed = true;
      }

      if (!passed && rule.rule_type === "red_flag") {
        redFlags.push(rule.label || rule.field_name);
      }

      // Build descriptive notes for failures
      let notes: string | null = null;
      if (!passed) {
        if (isEducationField) {
          const candidateLevel = getEducationLevel(String(fieldValue || ""));
          const thresholdLevel = getEducationLevel(String(threshold || ""));
          notes = `${rule.label || rule.field_name}: candidate education level ${candidateLevel} (${fieldValue || 'not found'}), required ${rule.operator} level ${thresholdLevel} (${threshold})`;
        } else {
          notes = `${rule.label || rule.field_name}: expected ${rule.operator} ${threshold}, got ${fieldValue}`;
        }
      }

      resultItems.push({
        run_id: run.id, rule_id: rule.id,
        outcome: passed ? "pass" : "fail",
        points_awarded: pointsAwarded,
        notes,
      });
    }

    // Calculate percentage score
    const percentageScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;

    // Determine result band
    let resultBand = "recruiter_review";
    if (knockoutFailed) {
      resultBand = "reject";
    } else if (percentageScore >= template.pass_threshold) {
      resultBand = "auto_pass";
    } else if (percentageScore < template.reject_threshold) {
      resultBand = "reject";
    } else if (percentageScore < template.hold_threshold) {
      resultBand = "hold";
    }

    // Insert result items
    if (resultItems.length > 0) {
      await supabase.from("screening_result_items").insert(resultItems);
    }

    // Update run
    await supabase.from("screening_runs").update({
      total_score: percentageScore,
      result_band: resultBand,
      knockout_failed: knockoutFailed,
      red_flags: redFlags,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return new Response(JSON.stringify({
      run_id: run.id,
      total_score: percentageScore,
      result_band: resultBand,
      knockout_failed: knockoutFailed,
      red_flags: redFlags,
      items_evaluated: resultItems.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
