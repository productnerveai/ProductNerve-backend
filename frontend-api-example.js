// Add these new functions to your Phase1api.ts file

// ─────────────────────────────────────────────
// PROGRESSIVE INTAKE (10-Area Structure)
// ─────────────────────────────────────────────

/** POST /api/phase1/intake/:projectId/area/:areaName — submit data for specific area */
export async function submitIntakeArea(
  projectId: string,
  areaName: string,
  data: Record<string, string>
) {
  return apiFetch(`${BASE}/intake/${projectId}/area/${areaName}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** GET /api/phase1/intake/:projectId/progress — get intake progress and completion status */
export async function getIntakeProgress(projectId: string) {
  return apiFetch(`${BASE}/intake/${projectId}/progress`);
}

// ─────────────────────────────────────────────
// AREA MAPPING FOR FRONTEND
// ─────────────────────────────────────────────

export const INTAKE_AREA_MAPPING = {
  "Idea Definition": "idea_definition",
  "Target Segment": "target_segment", 
  "Problem & Urgency": "problem_urgency",
  "Existing Alternatives": "existing_alternatives",
  "Revenue Logic": "revenue_logic",
  "Market Context": "market_context",
  "Differentiation": "differentiation",
  "Founder Advantage": "founder_advantage",
  "Key Assumptions": "key_assumptions",
  "Validation Evidence": "validation_evidence",
};

export const AREA_FIELD_MAPPING = {
  idea_definition: {
    idea_description: "idea_description"
  },
  target_segment: {
    target_users: "target_users"
  },
  problem_urgency: {
    problem_statement: "problem_statement"
  },
  existing_alternatives: {
    existing_alternatives: "existing_alternatives"
  },
  revenue_logic: {
    monetization_model: "monetization_model"
  },
  market_context: {
    target_market: "target_market"
  },
  differentiation: {
    unique_value_proposition: "unique_value_proposition"
  },
  founder_advantage: {
    founder_background: "founder_background"
  },
  key_assumptions: {
    core_assumptions: "core_assumptions"
  },
  validation_evidence: {
    validation_evidence: "validation_evidence"
  }
};

// ─────────────────────────────────────────────
// EXAMPLE USAGE IN YOUR FRONTEND
// ─────────────────────────────────────────────

/*
// 1. Get current progress
const progress = await getIntakeProgress(projectId);
console.log('Completed areas:', progress.data.completed_areas);
console.log('Pending areas:', progress.data.pending_areas);

// 2. Submit data for a specific area
const areaName = INTAKE_AREA_MAPPING["Idea Definition"]; // "idea_definition"
const areaData = {
  idea_description: "Your venture idea description here"
};

const result = await submitIntakeArea(projectId, areaName, areaData);
if (result.success) {
  console.log('Area completed:', result.data.area_completed);
  console.log('Progress:', result.data.completion_progress + '%');
  console.log('All complete:', result.data.all_areas_complete);
}

// 3. Check if all areas are complete
if (result.data.all_areas_complete) {
  // Intake is complete - proceed to scoring
  await startScoring(projectId);
}
*/
