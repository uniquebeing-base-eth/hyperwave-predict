import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current phase state
    const { data: phase, error: fetchError } = await supabase
      .from("phase_state")
      .select("*")
      .eq("id", 1)
      .single();

    if (fetchError || !phase) {
      throw new Error(`Failed to fetch phase state: ${fetchError?.message}`);
    }

    const phaseStart = new Date(phase.phase_started_at);
    const now = new Date();
    const elapsed = now.getTime() - phaseStart.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (elapsed < sevenDays) {
      return new Response(JSON.stringify({
        success: true,
        action: "none",
        message: `Phase ${phase.phase_number} still active. ${Math.ceil((sevenDays - elapsed) / (1000 * 60 * 60))}h remaining.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Advance phase
    const newPhaseNumber = phase.phase_number + 1;
    const { error: updateError } = await supabase
      .from("phase_state")
      .update({
        phase_number: newPhaseNumber,
        phase_started_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", 1);

    if (updateError) {
      throw new Error(`Failed to advance phase: ${updateError.message}`);
    }

    console.log(`Phase advanced: ${phase.phase_number} -> ${newPhaseNumber}`);

    return new Response(JSON.stringify({
      success: true,
      action: "advanced",
      previousPhase: phase.phase_number,
      newPhase: newPhaseNumber,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Phase advance error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
