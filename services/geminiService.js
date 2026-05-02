const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    this.primaryModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
  }

  getCacheKey(type, data) {
    const messageCount = data.message_count || 0;
    const dataSlice = JSON.stringify(data).slice(0, 100);
    return `${type}_${messageCount}_${dataSlice}`;
  }

  getCachedResponse(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Using cached response for:', key);
      return cached.data;
    }
    return null;
  }

  cacheResponse(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ─────────────────────────────────────────────────────────────────
  // ICP REPORT
  // ─────────────────────────────────────────────────────────────────

  async generateICPReport(icpData) {
    const prompt = this.buildICPPrompt(icpData);
    let model = this.primaryModel;
    let modelName = 'gemini-2.5-flash';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Using ${modelName}...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const report = this.parseAIResponse(text);
        return { segments: report, generated_at: new Date(), ai_model: modelName };
      } catch (error) {
        console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
        if (attempt === 2) {
          throw new Error(`AI service temporarily unavailable. Please try again in a few minutes. Error: ${error.message}`);
        }
      }
    }
  }

  buildICPPrompt(icpData) {
    const { product_context, segments } = icpData;

    let prompt = `You are an expert strategic analyst and venture advisor. Analyze the following Ideal Customer Profile (ICP) data and provide strategic insights for each segment.

PRODUCT CONTEXT:
- Product: ${product_context.product}
- Core Problem: ${product_context.core_problem}
- Who Experiences: ${product_context.who_experiences}
- Industries Affected: ${product_context.industries_affected}

ICP SEGMENTS:
`;

    segments.forEach((segment, index) => {
      prompt += `
Segment ${index + 1}: ${segment.name}
- Job Role: ${segment.job_role}
- Industry: ${segment.industry}
- Company Size: ${segment.company_size}
- Geography: ${segment.geography}
- Income Level: ${segment.income_level}

Pain Profile:
- Top Problems: ${segment.pain_profile.top_problems.join(', ')}
- Current Workaround: ${segment.pain_profile.current_workaround}
- Cost of Problem: ${segment.pain_profile.cost_of_problem}
- Urgency Level: ${segment.pain_profile.urgency_level}
- Emotional Trigger: ${segment.pain_profile.emotional_trigger}

Buying Behavior:
- Decision Maker: ${segment.buying_behavior.decision_maker}
- Budget Authority: ${segment.buying_behavior.budget_authority}
- Buying Triggers: ${segment.buying_behavior.buying_triggers}
- Buying Frequency: ${segment.buying_behavior.buying_frequency}
- Price Sensitivity: ${segment.buying_behavior.price_sensitivity}

Channel Discovery:
- Communities: ${segment.channel_discovery.communities}
- Social Platforms: ${segment.channel_discovery.social_platforms}
- Search Behavior: ${segment.channel_discovery.search_behavior}
- Industry Events: ${segment.channel_discovery.industry_events}
- Referrals: ${segment.channel_discovery.referrals}
`;
    });

    prompt += `
Please provide a strategic analysis for each segment in the following JSON format.

Respond ONLY with valid JSON in this exact format:

{
  "segments": [
    {
      "name": "Segment Name",
      "pain_intensity_score": 85,
      "purchase_probability": 78,
      "revenue_potential": "High",
      "persona_summary": "Detailed persona summary...",
      "best_channels": ["Channel 1", "Channel 2", "Channel 3"],
      "strategic_insights": "A single paragraph of strategic recommendations as plain text. Do NOT use an array."
    }
  ]
}

Be specific, actionable, and provide realistic scores based on the data provided.`;

    return prompt;
  }

  parseAIResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.segments || !Array.isArray(parsed.segments)) throw new Error('Invalid response format');
      return parsed.segments.map(segment => ({
        ...segment,
        strategic_insights: Array.isArray(segment.strategic_insights)
          ? segment.strategic_insights.join('\n\n')
          : segment.strategic_insights || '',
        best_channels: Array.isArray(segment.best_channels)
          ? segment.best_channels
          : [segment.best_channels || 'LinkedIn'],
        pain_intensity_score: Number(segment.pain_intensity_score) || 50,
        purchase_probability: Number(segment.purchase_probability) || 50,
      }));
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [{
        name: "Analysis Error",
        pain_intensity_score: 50,
        purchase_probability: 50,
        revenue_potential: "Medium",
        persona_summary: "Unable to generate detailed analysis. Please try again.",
        best_channels: ["LinkedIn", "Twitter", "Industry Events"],
        strategic_insights: "AI analysis failed. Manual review recommended."
      }];
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // USER STORY
  // ─────────────────────────────────────────────────────────────────

  async generateUserStory(storyData) {
    try {
      const prompt = this.buildUserStoryPrompt(storyData);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for user story generation...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const report = this.parseUserStoryResponse(text);
          return { ...report, generated_at: new Date(), ai_model: modelName };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && error.message.includes('503')) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          if (attempt === 2) throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error generating user story:', error);
      throw new Error('Failed to generate user story');
    }
  }

  buildUserStoryPrompt(storyData) {
    const {
      product_context, module_definition, epic_definition, story_definition,
      user_flow, preconditions, postconditions, dependencies,
      design_considerations, technical_considerations, definition_of_done
    } = storyData;

    return `You are an expert product manager and technical writer. Generate comprehensive, engineering-ready user story artifacts based on the following detailed input.

PRODUCT CONTEXT:
- Product Name: ${product_context.product_name}
- Product Description: ${product_context.product_description}
- Target User: ${product_context.target_user}
- Business Goal: ${product_context.business_goal}
- Feature Name: ${product_context.feature_name}
- Feature Description: ${product_context.feature_description}

MODULE DEFINITION:
- Module Name: ${module_definition.module_name}
- Module Description: ${module_definition.module_description}

EPIC DEFINITION:
- Epic Title: ${epic_definition.epic_title}
- Epic Description: ${epic_definition.epic_description}
- Epic Objective: ${epic_definition.epic_objective}

STORY DEFINITION:
- User Persona: ${story_definition.user_persona}
- User Need: ${story_definition.user_need}
- User Goal: ${story_definition.user_goal}
- Business Value: ${story_definition.business_value}
- Feature Trigger: ${story_definition.feature_trigger}

USER FLOW:
- Entry Point: ${user_flow.entry_point}
- User Actions: ${user_flow.user_actions}
- System Responses: ${user_flow.system_responses}
- Exit Point: ${user_flow.exit_point}

PRECONDITIONS: ${preconditions.join(', ')}
POST CONDITIONS: ${postconditions.join(', ')}
DEPENDENCIES: ${dependencies.join(', ')}
DESIGN CONSIDERATIONS: ${design_considerations.join(', ')}
TECHNICAL CONSIDERATIONS: ${technical_considerations.join(', ')}
DEFINITION OF DONE: ${definition_of_done.join(', ')}

Please generate 1-3 comprehensive user story artifacts. Respond ONLY with valid JSON:

{
  "summary": "Brief summary of generated stories",
  "stories": [
    {
      "module": "Module Name",
      "epic": "Epic Title",
      "storyId": "STORY-001",
      "title": "User Story Title",
      "why": "As a [persona], I want to [action] so that I can [benefit]",
      "story": "As a [persona], I want to [action] so that I can [benefit]",
      "precondition": "System state before story execution",
      "userFlow": "Step-by-step user interaction flow",
      "postCondition": "System state after story execution",
      "acceptanceCriteria": {
        "happy": "Successful scenario description",
        "unhappy": "Error/edge case scenario description"
      },
      "dependencies": "Required dependencies",
      "designConsideration": "Design requirements and constraints",
      "technicalConsiderations": "Technical implementation considerations",
      "definitionOfDone": "Completion criteria"
    }
  ]
}`;
  }

  parseUserStoryResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.stories || !Array.isArray(parsed.stories)) throw new Error('Invalid response format');
      return {
        summary: parsed.summary || `Generated ${parsed.stories.length} user stories for development`,
        stories: parsed.stories.map(story => ({
          ...story,
          acceptanceCriteria: {
            happy: story.acceptanceCriteria?.happy || "User successfully completes the intended action",
            unhappy: story.acceptanceCriteria?.unhappy || "System handles errors gracefully and provides clear feedback"
          },
          storyId: story.storyId || `STORY-${Math.floor(Math.random() * 1000)}`,
          module: String(story.module || 'Unknown'),
          epic: String(story.epic || 'Unknown'),
          title: String(story.title || 'User Story'),
          why: String(story.why || 'User story description'),
          story: String(story.story || story.why || 'User story description'),
          precondition: String(story.precondition || 'System ready'),
          userFlow: String(story.userFlow || 'Standard user flow'),
          postCondition: String(story.postCondition || 'Task completed'),
          dependencies: String(story.dependencies || 'No dependencies'),
          designConsideration: String(story.designConsideration || 'Follow design system'),
          technicalConsiderations: String(story.technicalConsiderations || 'Standard implementation'),
          definitionOfDone: String(story.definitionOfDone || 'Tests pass and code reviewed')
        }))
      };
    } catch (error) {
      console.error('Error parsing user story response:', error);
      return {
        summary: "AI analysis failed. Manual review recommended.",
        stories: [{
          module: "Unknown", epic: "Unknown", storyId: "STORY-ERROR",
          title: "Analysis Error", why: "Unable to generate detailed user story",
          story: "Unable to generate detailed user story. Please try again.",
          precondition: "System ready", userFlow: "Standard flow", postCondition: "Task completed",
          acceptanceCriteria: { happy: "User successfully completes action", unhappy: "System handles errors gracefully" },
          dependencies: "No dependencies", designConsideration: "Follow design system",
          technicalConsiderations: "Standard implementation", definitionOfDone: "Tests pass and code reviewed"
        }]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PRD
  // ─────────────────────────────────────────────────────────────────

  async generatePRD(prdData) {
    try {
      const prompt = this.buildPRDPrompt(prdData);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for PRD generation...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const report = this.parsePRDResponse(text, prdData.prd_type);
          return { ...report, generated_at: new Date(), ai_model: modelName };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && error.message.includes('503')) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          if (attempt === 2) throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error generating PRD:', error);
      throw new Error('Failed to generate PRD');
    }
  }

  buildPRDPrompt(prdData) {
    const { prd_type, product_context, strategic_context, product_definition, execution_context } = prdData;

    let basePrompt = `You are an expert Product Manager and technical writer. Generate a comprehensive Product Requirements Document (PRD) based on the following information.

PRD TYPE: ${prd_type.toUpperCase()}

PRODUCT CONTEXT:
- Product Name: ${product_context.product_name || 'Not specified'}
- Product Description: ${product_context.product_description || 'Not specified'}
- Problem Solved: ${product_context.problem_solved || 'Not specified'}
- Target Users: ${product_context.target_users || 'Not specified'}
- Business Goal: ${product_context.business_goal || 'Not specified'}

STRATEGIC CONTEXT:
- Market Opportunity: ${strategic_context.market_opportunity || 'Not specified'}
- Key Assumptions: ${strategic_context.key_assumptions || 'Not specified'}
- Constraints: ${strategic_context.constraints || 'Not specified'}
- Risks: ${strategic_context.risks || 'Not specified'}

PRODUCT DEFINITION:
- Core Features: ${product_definition.core_features || 'Not specified'}
- User Flows: ${product_definition.user_flows || 'Not specified'}
- Value Proposition: ${product_definition.value_prop || 'Not specified'}

EXECUTION CONTEXT:
- Timeline: ${execution_context.timeline || 'Not specified'}
- Team Size: ${execution_context.team_size || 'Not specified'}
- Technical Complexity: ${execution_context.technical_complexity || 'Not specified'}

`;

    let specificPrompt = '';

    if (prd_type === 'simple') {
      specificPrompt = `Generate a Simple PRD. Respond ONLY with valid JSON:

{
  "productInformation": "...", "goalsAndObjectives": "...", "targetUsers": "...",
  "problemStatement": "...", "valueProposition": "...", "assumptions": "...",
  "constraints": "...", "backgroundAndStrategicFit": "...", "productRoadmap": "...",
  "scope": "...", "coreFeatures": "...", "releaseCriteria": "...",
  "successMetrics": "...", "dependencies": "...", "risks": "...",
  "exclusions": "...", "strategicNote": "..."
}`;
    } else if (prd_type === 'growth') {
      specificPrompt = `Generate a Growth PRD. Respond ONLY with valid JSON:

{
  "growthGoals": "...", "icpDefinition": "...", "acquisitionChannels": "...",
  "conversionStrategy": "...", "retentionStrategy": "...", "monetizationModel": "...",
  "growthAssumptions": "...", "growthConstraints": "...", "strategicGrowthFit": "...",
  "growthRoadmap": "...", "userLifecycleScope": "...", "growthFeatures": "...",
  "technicalGrowthRequirements": "...", "experimentationPlan": "...", "growthRisks": "..."
}`;
    } else if (prd_type === 'technical') {
      specificPrompt = `Generate a Technical PRD. Respond ONLY with valid JSON:

{
  "technicalObjectives": "...", "coreProductFeatures": "...", "technicalSpecifications": "...",
  "coreTechnicalComponents": "...", "apiArchitecture": "...", "dataArchitecture": "...",
  "featureLevelTechnicalConsiderations": "...", "systemArchitecturePrinciples": "...",
  "highLevelArchitecture": "...", "securityModel": "...", "performanceTargets": "...",
  "scalabilityStrategy": "...", "integrationRequirements": "..."
}`;
    }

    return basePrompt + specificPrompt + '\n\nGenerate comprehensive, professional content for each field. Respond ONLY with valid JSON.';
  }

  parsePRDResponse(text, prdType) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      const result = {};

      const sectionMap = {
        simple: ['productInformation','goalsAndObjectives','targetUsers','problemStatement','valueProposition','assumptions','constraints','backgroundAndStrategicFit','productRoadmap','scope','coreFeatures','releaseCriteria','successMetrics','dependencies','risks','exclusions','strategicNote'],
        growth: ['growthGoals','icpDefinition','acquisitionChannels','conversionStrategy','retentionStrategy','monetizationModel','growthAssumptions','growthConstraints','strategicGrowthFit','growthRoadmap','userLifecycleScope','growthFeatures','technicalGrowthRequirements','experimentationPlan','growthRisks'],
        technical: ['technicalObjectives','coreProductFeatures','technicalSpecifications','coreTechnicalComponents','apiArchitecture','dataArchitecture','featureLevelTechnicalConsiderations','systemArchitecturePrinciples','highLevelArchitecture','securityModel','performanceTargets','scalabilityStrategy','integrationRequirements']
      };

      (sectionMap[prdType] || []).forEach(section => {
        result[section] = parsed[section] || `Section ${section} content pending.`;
      });

      return result;
    } catch (error) {
      console.error('Error parsing PRD response:', error);
      return { productInformation: "AI analysis failed. Please try again." };
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 1 SCORING
  // ─────────────────────────────────────────────────────────────────

  async generatePhase1Score(intakeData) {
    try {
      const prompt = this.buildPhase1Prompt(intakeData);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for Phase 1 scoring...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const scoreData = this.parsePhase1Response(text);
          return { ...scoreData, generated_at: new Date(), ai_model: modelName };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          if (attempt === 2) throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error generating Phase 1 score:', error);
      throw new Error('Failed to generate venture score');
    }
  }

  buildPhase1Prompt(intakeData) {
    const {
      idea_definition, target_segment, problem_urgency, existing_alternatives,
      willingness_to_pay, market_context, differentiation, founder_advantage,
      key_assumptions, validation_evidence, follow_up_responses
    } = intakeData;

    return `You are a senior venture capital analyst performing a rigorous Phase 1 validation analysis.
Your ONLY inputs are the founder's answers below. Do NOT use generic examples or placeholder values.
Every score, label, and insight you produce must be directly justified by what the founder actually said.

════════════════════════════════════════
FOUNDER'S INTAKE RESPONSES
════════════════════════════════════════
Idea Definition       : ${idea_definition || 'Not provided'}
Target Segment        : ${target_segment || 'Not provided'}
Problem Urgency       : ${JSON.stringify(problem_urgency) || 'Not provided'}
Existing Alternatives : ${existing_alternatives || 'Not provided'}
Willingness to Pay    : ${JSON.stringify(willingness_to_pay) || 'Not provided'}
Market Context        : ${JSON.stringify(market_context) || 'Not provided'}
Differentiation       : ${differentiation || 'Not provided'}
Founder Advantage     : ${founder_advantage || 'Not provided'}
Key Assumptions       : ${JSON.stringify(key_assumptions) || 'Not provided'}
Validation Evidence   : ${JSON.stringify(validation_evidence) || 'Not provided'}
Follow-up Responses   : ${JSON.stringify(follow_up_responses || {})}

════════════════════════════════════════
8-STAGE REASONING PROCESS
════════════════════════════════════════
Work through ALL 8 stages before writing the JSON output.

STAGE 1 — IDEA DECOMPOSITION
Extract: core problem, primary user, buyer (if different), proposed solution,
revenue model, launch geography, differentiation claim, founder leverage.

STAGE 2 — PROBLEM STRENGTH
Rate pain intensity 1–10, frequency, urgency, current spending evidence.
Classify: Strong / Moderate / Weak

STAGE 3 — MARKET STRUCTURE
Assess segment clarity, purchasing power, infrastructure readiness, timing.
Classify: Structured / Fragile / Competitive Pressure

STAGE 4 — ECONOMIC VIABILITY
Evaluate who pays, pricing realism, CAC plausibility, margin potential, capital intensity.
Classify: Strong / Fragile / Weak

STAGE 5 — COMPETITIVE GRAVITY
Determine competitor strength, differentiation meaningfulness, switching friction, copy risk.
Classify: Low / Manageable / High

STAGE 6 — FOUNDER ADVANTAGE
Assess domain expertise, network access, distribution leverage, technical and capital access.
Classify: Strong / Moderate / Weak

STAGE 7 — ASSUMPTION RISK
Group assumptions (market / behavioral / economic / execution).
Tag each: Untested / Weak / Reasonable / Strong
Count high-risk assumptions and calculate risk density %.

STAGE 8 — VALIDATION MATURITY
Evaluate evidence: interviews, surveys, pilots, revenue.
Classify: Idea-stage / Early validation / Market-tested / Revenue-tested

════════════════════════════════════════
SCORING DECISION TREES
════════════════════════════════════════
PROBLEM SCORE: Strong→75–85 (+5–10 if spending evidence); Moderate→55–70; Weak→cap 45; Urgency<6→cap 70
MARKET SCORE: Narrow+ready→70–85; Broad+no wedge→cap 60; Regulatory friction→-10–15; Late+saturated→cap 65
BUSINESS MODEL: Clear payer+recurring+realistic→75–90; Buyer unclear→cap 55; CAC undefined→-10; Margin<30%→cap 60
SOLUTION FIT: High density+weak diff→cap 50; Clear niche→65–80; Strong defensibility→80+
FOUNDER: Strong domain+network→75–90; No distribution→cap 60; No domain→cap 55
OVERALL: Weak problem→cap 59; Weak economics→cap 65; High-risk assumptions>50%→-5–15; Revenue-tested→+5
CLASSIFICATION: ≥75 AND confidence≥70→"Strategic Opportunity"; 60–74→"Conditional Build"; 45–59+strong founder→"High Risk Pivot"; <45→"Kill"

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Respond ONLY with valid JSON. No markdown fences, no preamble.

{
  "executive_summary": {
    "viability_score": 0,
    "classification": "",
    "confidence_index": 0,
    "validation_maturity": "",
    "strategic_insight": ""
  },
  "problem_intensity": {
    "score": 0,
    "intensity_level": "",
    "spending_evidence": "",
    "coping_cost": "",
    "urgency_index": "",
    "analysis": ""
  },
  "market_opportunity": {
    "score": 0,
    "segment_definition": "",
    "market_size_tier": "",
    "purchasing_power": "",
    "infrastructure_ready": false,
    "timing_window": "",
    "insight": ""
  },
  "buyer_economics": {
    "score": 0,
    "who_pays": "",
    "revenue_model": "",
    "revenue_model_clarity": "",
    "unit_economics_tier": "",
    "capital_intensity": "",
    "cac_assumptions": "",
    "payback_assumptions": "",
    "interpretation": ""
  },
  "competitive_positioning": {
    "score": 0,
    "direct_competitors": "",
    "substitute_alternatives": "",
    "differentiation_clarity": "",
    "switching_friction": "",
    "platform_dependency": "",
    "insight": ""
  },
  "founder_advantage": {
    "score": 0,
    "domain_leverage": "",
    "distribution_access": "",
    "talent_access": "",
    "capital_access": "",
    "network_leverage": "",
    "assessment": ""
  },
  "assumption_map": {
    "market_assumptions": [{"assumption": "", "status": "", "validation": ""}],
    "behavioral_assumptions": [{"assumption": "", "status": "", "validation": ""}],
    "economic_assumptions": [{"assumption": "", "status": "", "validation": ""}],
    "execution_assumptions": [{"assumption": "", "status": "", "validation": ""}],
    "ai_generated_assumptions": [{"assumption": "", "status": "Untested", "validation": ""}]
  },
  "risk_clusters": {
    "market_risk": {"severity": "", "explanation": "", "mitigation": ""},
    "economic_risk": {"severity": "", "explanation": "", "mitigation": ""},
    "competitive_risk": {"severity": "", "explanation": "", "mitigation": ""},
    "execution_risk": {"severity": "", "explanation": "", "mitigation": ""}
  },
  "strategic_routes": {
    "recommended_route": {"route": "", "why_improves": "", "changes_required": ""},
    "alternative_routes": [
      {"route": "", "description": ""},
      {"route": "", "description": ""},
      {"route": "", "description": ""}
    ]
  },
  "validation_gaps": {
    "critical_questions": ["", "", ""],
    "missing_data": ["", "", ""],
    "required_experiments": ["", "", ""]
  },
  "build_readiness": {
    "signal": "",
    "confidence_score": 0,
    "next_steps": ["", "", ""]
  },
  "confidence_breakdown": {
    "evidence_strength": 0,
    "assumption_clarity": 0,
    "market_clarity": 0,
    "economic_clarity": 0,
    "competitive_realism": 0
  },
  "ai_reasoning_trace": {
    "stage2_problem_strength": {"tier": "", "reasoning": ""},
    "stage3_market_structure": {"tier": "", "reasoning": ""},
    "stage4_economic_viability": {"tier": "", "reasoning": ""},
    "stage5_competitive_gravity": {"tier": "", "reasoning": ""},
    "stage6_founder_leverage": {"tier": "", "reasoning": ""},
    "stage7_assumption_risk": {"high_risk_count": 0, "total_assumptions": 0, "assumption_risk_density": 0},
    "stage8_validation_maturity": {"maturity": "", "reasoning": ""}
  },
  "scoring_decisions": {
    "tier_modifiers_applied": "",
    "weighted_raw": 0,
    "viability_final": 0
  }
}`;
  }

  parsePhase1Response(text) {
    try {
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);

      const executiveSummary = parsed.executive_summary || {};
      const scoringLayers = {
        problem_validation: { score: Number(parsed.problem_intensity?.score) || 50, analysis: parsed.problem_intensity?.analysis || '', strengths: [], weaknesses: [], recommendations: [] },
        solution_fit: { score: Number(parsed.competitive_positioning?.score) || 50, analysis: parsed.competitive_positioning?.insight || '', strengths: [], weaknesses: [], recommendations: [] },
        market_opportunity: { score: Number(parsed.market_opportunity?.score) || 50, analysis: parsed.market_opportunity?.insight || '', strengths: [], weaknesses: [], recommendations: [] },
        founder_market_fit: { score: Number(parsed.founder_advantage?.score) || 50, analysis: parsed.founder_advantage?.assessment || '', strengths: [], weaknesses: [], recommendations: [] },
        business_model: { score: Number(parsed.buyer_economics?.score) || 50, analysis: parsed.buyer_economics?.interpretation || '', strengths: [], weaknesses: [], recommendations: [] }
      };

      const riskFlags = [];
      if (parsed.risk_clusters) {
        Object.entries(parsed.risk_clusters).forEach(([category, risk]) => {
          riskFlags.push({ flag: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), severity: risk.severity || 'Medium', description: risk.explanation || '', mitigation: risk.mitigation || '' });
        });
      }

      const alternativeRoutes = (parsed.strategic_routes?.alternative_routes || []).map(route => ({ route: route.route, description: route.description, rationale: 'Strategic alternative' }));
      const strategicInsights = { overall_assessment: executiveSummary.strategic_insight || '', key_strengths: [], critical_risks: [], next_steps: parsed.validation_gaps?.required_experiments || [], validation_priorities: parsed.validation_gaps?.critical_questions || [] };

      const routesForDashboard = [];
      if (parsed.strategic_routes?.recommended_route) {
        routesForDashboard.push({ route: parsed.strategic_routes.recommended_route.route, description: parsed.strategic_routes.recommended_route.why_improves });
      }
      alternativeRoutes.forEach(r => routesForDashboard.push({ route: r.route, description: r.description }));

      return {
        viability_score: Number(executiveSummary.viability_score) || 50,
        classification: executiveSummary.classification || 'Early Stage',
        confidence_index: Number(executiveSummary.confidence_index) || 50,
        validation_maturity: executiveSummary.validation_maturity || 'Idea-stage',
        scoring_layers: scoringLayers,
        risk_flags: riskFlags,
        alternative_routes: alternativeRoutes,
        strategic_insights: strategicInsights,
        phase1_analysis: {
          executive_summary: executiveSummary,
          problem_intensity: parsed.problem_intensity,
          market_opportunity: parsed.market_opportunity,
          buyer_economics: parsed.buyer_economics,
          competitive_positioning: parsed.competitive_positioning,
          founder_advantage: parsed.founder_advantage,
          assumption_map: parsed.assumption_map,
          risk_clusters: parsed.risk_clusters,
          strategic_routes: parsed.strategic_routes || { recommended_route: {}, alternative_routes: alternativeRoutes },
          validation_gaps: parsed.validation_gaps,
          build_readiness: parsed.build_readiness,
          confidence_breakdown: parsed.confidence_breakdown,
          ai_reasoning_trace: parsed.ai_reasoning_trace,
          scoring_decisions: parsed.scoring_decisions,
          alternative_routes: routesForDashboard
        }
      };
    } catch (error) {
      console.error('Error parsing Phase 1 response:', error);
      return this._fallbackScoreData();
    }
  }

  _fallbackScoreData() {
    const empty = { score: 0, analysis: 'Analysis failed — please retry.', strengths: [], weaknesses: [], recommendations: [] };
    return {
      viability_score: 0, classification: 'Early Stage', confidence_index: 0, validation_maturity: 'Idea-stage',
      scoring_layers: { problem_validation: empty, solution_fit: empty, market_opportunity: empty, founder_market_fit: empty, business_model: empty },
      risk_flags: [], alternative_routes: [],
      strategic_insights: { overall_assessment: 'AI analysis failed. Please retry.', key_strengths: [], critical_risks: [], next_steps: ['Retry the analysis'], validation_priorities: [] },
      phase1_analysis: {
        executive_summary: { strategic_insight: 'Analysis failed — please retry.' },
        problem_intensity: { analysis: 'Analysis failed' }, market_opportunity: { insight: 'Analysis failed' },
        buyer_economics: { interpretation: 'Analysis failed' }, competitive_positioning: { insight: 'Analysis failed' },
        founder_advantage: { assessment: 'Analysis failed' }, assumption_map: {}, risk_clusters: {},
        strategic_routes: { recommended_route: {}, alternative_routes: [] },
        validation_gaps: { critical_questions: [], missing_data: [], required_experiments: [] },
        build_readiness: { signal: 'Requires further validation', confidence_score: 0, next_steps: [] },
        confidence_breakdown: {}, ai_reasoning_trace: {}, scoring_decisions: {}, alternative_routes: []
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 1 INTAKE CHAT
  // ─────────────────────────────────────────────────────────────────

  async generateIntakeChat(chatData) {
    try {
      console.log('DEBUG: Message count for intake chat:', chatData.message_count);
      const prompt = this.buildIntakeChatPrompt(chatData);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          return { response: text.trim(), model: modelName };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          if (attempt === 2) {
            if (error.message.includes('quota') || error.message.includes('429')) return this.getFallbackIntakeResponse(chatData);
            throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating intake chat:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  buildIntakeChatPrompt(chatData) {
    const { conversation, message_count } = chatData;

    const completionMessage = `<INTAKE_COMPLETE>{
  "idea_definition": "",
  "target_segment": "",
  "problem_urgency": { "intensity": 0, "frequency": "", "urgency_level": "" },
  "existing_alternatives": "",
  "willingness_to_pay": { "model": "", "price_range": "", "payer": "" },
  "market_context": { "geography": "", "timing_reason": "", "infrastructure_ready": false },
  "differentiation": "",
  "founder_advantage": "",
  "key_assumptions": [],
  "validation_evidence": { "type": "", "details": "" },
  "follow_up_responses": {}
}</INTAKE_COMPLETE>`;

    return `You are a world-class venture strategist and active listener conducting a Phase 1 validation interview. Your job is NOT to run through a checklist — it is to deeply understand this specific venture idea through genuine conversation.

CONVERSATION SO FAR:
${conversation}

CURRENT MESSAGE COUNT (user messages sent): ${message_count}

════════════════════════════════════
YOUR CORE BEHAVIORAL RULES
════════════════════════════════════

1. READ BEFORE YOU RESPOND
   Before writing anything, re-read the founder's last message carefully.
   Identify: what did they actually say? What was unclear? What was interesting?
   Respond to WHAT THEY SAID, not to a script.

2. FOLLOW THE THREAD — BUT STAY IN THE CURRENT AREA
   If something in the founder's answer is vague or unclear, dig deeper — but ONLY
   if that follow-up belongs to the CURRENT intake area you are working on.

   Before asking any follow-up question, ask yourself:
   "Does this question belong to the area I am currently exploring?"
   - If YES → ask it.
   - If NO, but it belongs to a FUTURE area → DO NOT ask it now.
     Make a mental note and cover it when you reach that area naturally.
   - If NO, and it belongs to NO area → do not ask it at all.

   EXAMPLE OF WHAT NOT TO DO:
   You are on Area ① (Idea Definition). The founder mentions their pricing model in passing.
   Do NOT ask about pricing now — that belongs to Area ⑤ (Revenue Logic).
   Stay focused on understanding the idea: what it is, how it works, who it serves.

   EXAMPLE OF WHAT TO DO:
   You are on Area ① (Idea Definition). The founder's description is vague about
   HOW the product actually works mechanically.
   Ask: "You mentioned the platform coordinates deliveries — can you walk me through
   exactly what happens from the moment a hospital places a request?"
   This is a valid Area ① follow-up because it deepens idea clarity.

3. ONE QUESTION AT A TIME
   Never stack two questions. Pick the single most important unanswered thing
   within the CURRENT area.

4. USE THEIR WORDS BACK TO THEM
   Reference what they said: "You mentioned X — does that mean Y?"
   This shows you're listening, not just processing.

5. NEVER MOVE ON UNTIL THE CURRENT AREA IS CLEAR
   Do not transition to the next area until you have what you need from the current one.
   A vague answer does not count as coverage — push for specifics within the area.

6. EARN THE NEXT TOPIC
   Only move to a new area when the current one is genuinely understood.
   Transition naturally without announcing the area name.

═══════════════════════════════════
AREA SCOPE BOUNDARIES — HARD RULES
═══════════════════════════════════

These define what belongs to each area. Only ask questions that fit the
CURRENT area's scope. If a topic fits a FUTURE area, leave it there.

① IDEA DEFINITION scope:
   What the product is, how it works mechanically, who it serves,
   what problem it solves, delivery/interaction model.
   NOT in scope: pricing, competitors, founder background, market size,
   revenue model, geography specifics, assumptions.

② TARGET SEGMENT scope:
   Who exactly the user/customer is — role, demographics, firmographics,
   company size, geography, B2B vs B2C, who has budget authority.
   NOT in scope: why they have pain (that's Area ③), how to reach them
   (that's later), pricing (Area ⑤).

③ PROBLEM & URGENCY scope:
   Pain intensity (1–10), how often the problem occurs, urgency level,
   consequences of the problem going unsolved.
   NOT in scope: what alternatives exist (Area ④), revenue (Area ⑤).

④ EXISTING ALTERNATIVES scope:
   What users do TODAY to solve the problem — specific tools, workarounds,
   manual processes, competitors they use.
   NOT in scope: your differentiation over them (Area ⑦), pricing (Area ⑤).

⑤ REVENUE LOGIC scope:
   Pricing model, price range, who actually pays, payment timing.
   NOT in scope: market size (Area ⑥), differentiation (Area ⑦).

⑥ MARKET CONTEXT scope:
   Geography of launch, why now (timing), infrastructure readiness,
   regulatory environment.
   NOT in scope: competitors (Area ④), founder advantage (Area ⑧).

⑦ DIFFERENTIATION scope:
   Specific functional advantages over existing alternatives.
   NOT in scope: founder background (Area ⑧), assumptions (Area ⑨).

⑧ FOUNDER ADVANTAGE scope:
   Domain expertise, network access, distribution leverage, team, capital.
   NOT in scope: product assumptions (Area ⑨), validation evidence (Area ⑩).

⑨ KEY ASSUMPTIONS scope:
   What must be true for this to work — market, behavioral, economic,
   execution assumptions.
   NOT in scope: existing validation data (Area ⑩).

⑩ VALIDATION EVIDENCE scope:
   What has already been tested or validated — interviews, surveys,
   pilots, revenue, user feedback.
   NOT in scope: anything from previous areas already covered.

════════════════════════════════════
10 INTAKE AREAS — COVER ALL OF THEM
════════════════════════════════════

Work through these in natural conversational order. Do NOT announce or label them.

① IDEA DEFINITION
   Need: What it is, how it works, who it serves, what problem it solves, how it makes money.
   Red flags: Vague descriptions, no specific user, no clear mechanism.

② TARGET SEGMENT
   Need: Specific demographics/firmographics, geography, B2B vs B2C, decision-making authority.
   Red flags: "Everyone", broad industry without a wedge persona.

③ PROBLEM & URGENCY
   Need: Pain intensity (1–10), frequency (daily/weekly/etc), urgency level.
   Red flags: Low scores without explanation, theoretical pain vs experienced pain.

④ EXISTING ALTERNATIVES
   Need: What users do TODAY to solve the problem. Name specific workarounds or tools.
   Red flags: "Nothing exists", vague answers like "manual processes".

⑤ REVENUE LOGIC
   Need: Pricing model, price range estimate, who actually pays.
   Red flags: No pricing hypothesis, confused about who the buyer is.

⑥ MARKET CONTEXT
   Need: Geography of launch, why now (timing rationale), infrastructure readiness.
   Red flags: No geographic focus, no articulated timing reason.

⑦ DIFFERENTIATION
   Need: Specific functional advantage over existing solutions. Not just "better UX".
   Red flags: Generic claims, no structural defensibility.

⑧ FOUNDER ADVANTAGE
   Need: Domain expertise, network access, distribution leverage, technical/capital edge.
   Red flags: "I've always been passionate about this" with no concrete leverage.

⑨ KEY ASSUMPTIONS
   Need: 3–5 assumptions the idea depends on being true.
   Red flags: No awareness of dependencies, overconfidence.

⑩ VALIDATION EVIDENCE
   Need: Any interviews, surveys, pilots, or revenue already generated.
   Red flags: Zero validation with no plan to validate.

════════════════════════════════════
CONVERSATION STATE & COMPLETION
════════════════════════════════════

PROGRESS SO FAR: ${message_count} user messages sent.
- Messages 1–3: Deeply understand the idea and target user. Don't rush.
- Messages 4–7: Explore problem strength, alternatives, revenue logic. Follow threads.
- Messages 8–11: Cover market context, differentiation, founder advantage.
- Messages 12–14: Extract assumptions and validation evidence.
- Message 15+: If all 10 areas are genuinely covered, provide a 2–3 sentence synthesis then ask the founder to type "proceed".

${message_count >= 15 && conversation.toLowerCase().includes('proceed')
      ? `The founder has typed "proceed". Extract all information from the conversation and emit the completion signal with real data filled in:\n\n${completionMessage}`
      : ''}

${message_count >= 15 && !conversation.toLowerCase().includes('proceed')
      ? `You are near the end of the intake. Check coverage across all 10 areas. If any area is shallow, ask one more targeted question. If all areas are covered with depth, synthesize and ask them to type "proceed".`
      : ''}

════════════════════════════════════
TONE & STYLE
════════════════════════════════════

- Warm but rigorous. Like a thoughtful investor who wants you to succeed AND wants the truth.
- Never say "Great answer!" or "Thank you for sharing." Just respond to the substance.
- Use plain language. No buzzwords.
- When something doesn't add up, say so: "That doesn't quite make sense to me — help me understand..."
- Format questions on a new line for readability.

NOW: Read the conversation above. What does the founder most need to clarify or expand on? Ask that one thing.

════════════════════════════════════
AREA COMPLETION SIGNALS
════════════════════════════════════

When you are satisfied an intake area has been covered with sufficient depth and you are
transitioning to a new topic, you MUST emit a silent signal at the END of your response.

Format: <AREA_COMPLETE:N> where N is the area number (1–10).

Area mapping:
1 = Idea Definition, 2 = Target Segment, 3 = Problem & Urgency, 4 = Existing Alternatives,
5 = Revenue Logic, 6 = Market Context, 7 = Differentiation, 8 = Founder Advantage,
9 = Key Assumptions, 10 = Validation Evidence

Rules:
- Only emit when DONE with that area and moving to the next.
- Only emit ONE signal per response.
- Never emit it for the same area twice.
- The signal is invisible to the user — they will not see it.
- Do NOT emit based on message count. Emit because you got real clarity.`;
  }

  getFallbackIntakeResponse(chatData) {
    const { message_count } = chatData;
    const responses = [
      `Welcome to Product Nerve AI — your venture validation begins here.\n\n**Describe your idea as clearly and comprehensively as possible.**\n\nInclude:\n• What it is and how it works\n• Who it serves\n• What problem it solves\n• How it makes money (if you know)`,
      `Thank you. Now we need precise market definition.\n\n**Who exactly is your primary target user or customer?**\n\nInclude demographics, geography, B2B or B2C, and decision-making authority.`,
      `Excellent. Let's examine the problem dynamics.\n\n**What specific problem are you solving, and how frequently does it occur?**\n\nRate pain intensity (1–10), frequency, and urgency level.`
    ];
    return { response: responses[Math.min(message_count - 1, responses.length - 1)], model: 'fallback' };
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2 SCORING
  // ─────────────────────────────────────────────────────────────────

  async generatePhase2Score(intakeData, executionMode) {
    try {
      const prompt = this.buildPhase2Prompt(intakeData, executionMode);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for Phase 2 scoring...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const parsed = this.parsePhase2JsonResponse(text);
          return this.parsePhase2Response(parsed, intakeData, executionMode);
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          if (attempt === 2) throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error generating Phase 2 score:', error);
      throw new Error('Failed to generate execution score');
    }
  }

  parsePhase2JsonResponse(text) {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Phase 2 AI response');
    return JSON.parse(jsonMatch[0]);
  }

  buildPhase2Prompt(intakeData, executionMode) {
    return `You are a venture construction intelligence engine analyzing execution capacity for Phase 2.

EXECUTION CAPACITY ASSESSMENT:
- Execution Commitment: ${intakeData.execution_commitment}
- Capital Readiness: ${intakeData.capital_readiness}
- Team Access: ${intakeData.team_access?.join(', ') || 'None specified'}
- Technical Complexity: ${intakeData.technical_complexity}
- Speed/Stability Preference: ${intakeData.speed_stability_preference}
- Validation Objective: ${intakeData.validation_objective}
- Risk Appetite: ${intakeData.risk_appetite}
- Operational Capacity: ${intakeData.operational_capacity}
- Revenue Urgency: ${intakeData.revenue_urgency}
- Scalability Intent: ${intakeData.scalability_intent}

SELECTED EXECUTION MODE: ${executionMode}

EXECUTION MODE DEFINITIONS:
- ai_development: AI-powered development with minimal team, maximum automation
- lean_product: Small cross-functional team with structured MVP approach
- structured_startup: Full-stack startup build with early scalability focus
- venture_backed: Scalable infrastructure + compliance + GTM investment ready

Apply the Venture Construction Decision Tree Algorithm across 10 stages:
STAGE 1: Execution context reconstruction
STAGE 2: Build objective classification (Validation-first/Revenue-first/Investor-attraction/Long-term)
STAGE 3: Capacity vs Ambition gap — Severely Misaligned caps score at 59
STAGE 4: Capital structure (Self-sustained/Capital-constrained/Funding-dependent/High burn)
STAGE 5: Team feasibility — Missing critical role caps score at 60
STAGE 6: Scope compression — define MVES
STAGE 7: Architecture tier (Lightweight/Structured Lean/Modular Scalable/Infrastructure-Heavy)
STAGE 8: Timeline realism (Aggressive/Realistic/Optimistic/Unrealistic)
STAGE 9: Risk clustering (Scope/Talent/Capital/Timeline/Technical — Low/Moderate/High each)
STAGE 10: Execution maturity (Conceptually/Structurally/Operationally Ready or Premature)

SCORING:
- 5 pillars × 0–20 each = base
- Hard caps: Severely misaligned→59; Capital-constrained+high complexity→65; Idea-stage+high capital→70; Unrealistic timeline→68
- Risk adjustments: 2 high risks→-5; 3→-10; 4+→-15
- Maturity boost: Revenue-tested→+5; Pilot→+3; Interviews→+1
- Classification: 80–100 Execution Ready; 70–79 Structurally Sound but Resource Sensitive; 60–69 Fragile Execution; 50–59 High Execution Risk; <50 Premature to Build

CRITICAL: execution_risk_level and execution_confidence.overall must be exactly "low", "moderate", or "high".

Respond ONLY with valid JSON, no markdown fences:

{
  "executive_summary": {
    "execution_maturity_tier": "",
    "team_composition": "",
    "capital_efficiency": "",
    "speed_vs_stability": "",
    "primary_execution_constraint": "",
    "strategic_insight": "",
    "action_directive": "",
    "execution_risk_level": "",
    "action_summary": ""
  },
  "reasoning_trace": {
    "stage_2_team": { "classification": "", "reasoning": "" },
    "stage_3_capital": { "classification": "", "reasoning": "" },
    "stage_4_complexity": { "classification": "", "reasoning": "" },
    "stage_5_speed": { "classification": "", "reasoning": "" },
    "stage_6_validation": { "classification": "", "reasoning": "" },
    "stage_7_capacity": { "classification": "", "reasoning": "" },
    "stage_8_urgency": { "classification": "", "reasoning": "" },
    "stage_9_scale": { "classification": "", "reasoning": "" },
    "stage_10_commitment": { "classification": "", "reasoning": "" },
    "stage_11_risks": { "Technical Risk": "", "Market Risk": "", "Execution Risk": "" },
    "stage_11_constraint": ""
  },
  "scoring_audit": {
    "base_score": 0,
    "pillar_scores": {
      "team_composition": { "score": 0, "reasoning": "" },
      "capital_efficiency": { "score": 0, "reasoning": "" },
      "technical_complexity": { "score": 0, "reasoning": "" },
      "speed_vs_stability": { "score": 0, "reasoning": "" },
      "validation_approach": { "score": 0, "reasoning": "" },
      "operational_capacity": { "score": 0, "reasoning": "" },
      "execution_commitment": { "score": 0, "reasoning": "" }
    },
    "final_score": 0
  },
  "execution_confidence": {
    "overall": "",
    "team_clarity": 0,
    "capital_adequacy": 0,
    "technical_feasibility": 0,
    "speed_realism": 0,
    "validation_rigor": 0,
    "operational_readiness": 0,
    "commitment_level": 0,
    "reasoning": ""
  },
  "execution_architecture": {
    "team_structure": { "core_team": [], "key_hires": [], "team_gaps": [] },
    "capital_plan": {
      "current_funding": "",
      "runway": "",
      "burn_rate": "",
      "next_funding": "",
      "allocation": { "Product": "", "Marketing": "", "Operations": "", "G&A": "" }
    },
    "development_approach": {
      "methodology": "",
      "tech_stack": "",
      "deployment": "",
      "milestones": [
        { "title": "", "timeline": "", "resources": "" },
        { "title": "", "timeline": "", "resources": "" }
      ]
    },
    "risk_mitigation": {
      "primary_risks": [
        { "risk": "", "probability": "", "impact": "", "mitigation": "" },
        { "risk": "", "probability": "", "impact": "", "mitigation": "" }
      ],
      "contingency_plans": [
        { "scenario": "", "response": "" },
        { "scenario": "", "response": "" }
      ]
    }
  },
  "execution_roadmap": {
    "immediate_actions": [
      { "action": "", "priority": "", "timeline": "", "owner": "" },
      { "action": "", "priority": "", "timeline": "", "owner": "" }
    ],
    "critical_milestones": [
      { "milestone": "", "success_criteria": "", "deadline": "", "dependencies": [] },
      { "milestone": "", "success_criteria": "", "deadline": "", "dependencies": [] }
    ],
    "resource_allocation": {
      "team_allocation": { "Engineering": "", "Product": "", "Marketing": "", "Operations": "" },
      "capital_allocation": { "Salaries": "", "Infrastructure": "", "Marketing": "", "Operations": "" },
      "timeline_allocation": { "Development": "", "Testing": "", "Planning": "" }
    }
  }
}`;
  }

  parsePhase2Response(parsed, intakeData, executionMode) {
    const { executive_summary, reasoning_trace, scoring_audit, execution_confidence, execution_architecture, execution_roadmap } = parsed;
    const execution_score = scoring_audit?.final_score || 75;

    let execution_classification = "Premature to Build";
    if (execution_score >= 80) execution_classification = "Execution Ready";
    else if (execution_score >= 70) execution_classification = "Structurally Sound but Resource Sensitive";
    else if (execution_score >= 60) execution_classification = "Fragile Execution";
    else if (execution_score >= 50) execution_classification = "High Execution Risk";

    return {
      execution_score, execution_classification, execution_mode: executionMode, intake_data: intakeData,
      phase2_analysis: { executive_summary, reasoning_trace, scoring_audit, execution_confidence, execution_architecture, execution_roadmap }
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 2 INTAKE CHAT
  // ─────────────────────────────────────────────────────────────────

  async generatePhase2IntakeResponse(messages, projectId) {
    try {
      const prompt = this.buildPhase2IntakePrompt(messages);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for Phase 2 intake...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          return { response: text.trim(), model: modelName };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          if (attempt === 2) {
            if (error.message.includes('quota') || error.message.includes('429')) return this.getPhase2FallbackIntakeResponse(messages);
            throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating Phase 2 intake:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  buildPhase2IntakePrompt(messages) {
    const conversation = messages.map(m => `${m.role === 'user' ? 'FOUNDER' : 'ADVISOR'}: ${m.content}`).join('\n\n');
    const message_count = messages.filter(m => m.role === 'user').length;

    const completionMessage = `<INTAKE_COMPLETE>{
  "execution_commitment": "",
  "capital_readiness": "",
  "team_access": [],
  "technical_complexity": "",
  "speed_stability_preference": "",
  "validation_objective": "",
  "risk_appetite": "",
  "operational_capacity": "",
  "revenue_urgency": "",
  "scalability_intent": "",
  "follow_up_responses": { "recommended_execution_mode": "" }
}</INTAKE_COMPLETE>`;

    return `You are an expert venture execution strategist conducting a Phase 2 execution capacity interview. Your job is to deeply understand the founder's execution reality — not run through a checklist.

CONVERSATION SO FAR:
${conversation}

CURRENT MESSAGE COUNT (user messages sent): ${message_count}

════════════════════════════════════
YOUR CORE BEHAVIORAL RULES
════════════════════════════════════

1. READ BEFORE YOU RESPOND
   Re-read the founder's last message. What did they actually say? What's unclear?
   Respond to WHAT THEY SAID, not to a script.

2. FOLLOW THE THREAD — BUT STAY IN THE CURRENT AREA
   If something in the founder's answer is vague or unclear, dig deeper — but ONLY
   if that follow-up belongs to the CURRENT execution area you are working on.

   Before asking any follow-up question, ask yourself:
   "Does this question belong to the area I am currently exploring?"
   - If YES → ask it.
   - If NO, but it belongs to a FUTURE area → DO NOT ask it now.
     Make a mental note and cover it when you reach that area naturally.
   - If NO, and it belongs to NO area → do not ask it at all.

   EXAMPLE OF WHAT NOT TO DO:
   You are on Area ① (Execution Commitment). The founder mentions their team composition in passing.
   Do NOT ask about team now — that belongs to Area ③ (Team & Talent).
   Stay focused on understanding commitment: hours per week, full-time vs part-time.

   EXAMPLE OF WHAT TO DO:
   You are on Area ① (Execution Commitment). The founder says "I'm committed" vaguely.
   Ask: "You mentioned commitment — can you clarify if this is full-time, part-time with specific hours, or side project?"
   This is a valid Area ① follow-up because it deepens commitment clarity.

3. ONE QUESTION AT A TIME
   Never stack two questions. Pick the single most important unanswered thing
   within the CURRENT area.

4. NEVER MOVE ON UNTIL THE CURRENT AREA IS CLEAR
   Do not transition to the next area until you have what you need from the current one.
   A vague answer does not count as coverage — push for specifics within the area.

5. EARN THE NEXT TOPIC
   Only move to a new area when the current one is genuinely understood.
   Transition naturally without announcing the area name.

═══════════════════════════════════
AREA SCOPE BOUNDARIES — HARD RULES
═══════════════════════════════════

These define what belongs to each area. Only ask questions that fit the
CURRENT area's scope. If a topic fits a FUTURE area, leave it there.

① EXECUTION COMMITMENT scope:
   Time commitment level, hours per week, full-time vs side project.
   NOT in scope: how much money (Area ②), who is on team (Area ③).

② CAPITAL READINESS scope:
   Budget range, whether external funding expected, current runway.
   NOT in scope: team composition (Area ③), what you are building (Area ④).

③ TEAM & TALENT scope:
   Who is on the team, their roles, cofounder vs contractor, commitment level.
   NOT in scope: what tech you will use (Area ④), how fast (Area ⑤).

④ TECHNICAL COMPLEXITY scope:
   How complex the product is to build — workflow, integrations, backend, AI.
   NOT in scope: timeline preference (Area ⑤), validation goals (Area ⑥).

⑤ SPEED VS STABILITY scope:
   Whether speed to MVP or long-term scalability is the priority.
   NOT in scope: what the goal of the build is (Area ⑥).

⑥ VALIDATION OBJECTIVE scope:
   What success looks like for the first build — PMF, revenue, investor-ready.
   NOT in scope: risk tolerance (Area ⑦), ops experience (Area ⑧).

⑦ RISK APPETITE scope:
   How much execution risk they can absorb.
   NOT in scope: operational management experience (Area ⑧).

⑧ OPERATIONAL CAPACITY scope:
   Can they manage vendors, contractors, teams — experience level.
   NOT in scope: revenue timing (Area ⑨).

⑨ REVENUE URGENCY scope:
   How soon revenue must begin.
   NOT in scope: long-term scale intent (Area ⑩).

⑩ SCALABILITY INTENT scope:
   Lifestyle business vs moderate growth vs venture-scale.
   NOT in scope: anything already covered in previous areas.

════════════════════════════════════
10 EXECUTION CAPACITY AREAS
════════════════════════════════════

Work through these in conversational order. Do NOT announce or label them.

① EXECUTION COMMITMENT
   Need: Full-time / part-time / side project / testing only. Hours per week if part-time.
   Red flags: Vague "I'm committed" without time clarity.

② CAPITAL READINESS
   Need: Rough budget range, whether external funding expected, current runway.
   Red flags: No number at all, conflating revenue with capital.

③ TEAM & TALENT
   Need: Who is currently on the team, their roles, commitment level (cofounder vs contractor).
   Red flags: "I have people" without naming roles or commitment.

④ TECHNICAL COMPLEXITY
   Need: How complex the product is — simple workflow, integrations, heavy backend, AI/ML, infrastructure.
   Red flags: Underestimating complexity, no technical person for a complex build.

⑤ SPEED VS STABILITY
   Need: Is speed to MVP or long-term scalability the priority right now?
   Red flags: Wanting both without acknowledging the tradeoff.

⑥ VALIDATION OBJECTIVE
   Need: What does success look like for the first build — PMF test, revenue, investor-ready, long-term product?
   Red flags: Multiple conflicting objectives.

⑦ RISK APPETITE
   Need: How much execution risk they can absorb — very low / moderate / high for speed.
   Red flags: "Low risk" combined with "venture scale" ambitions.

⑧ OPERATIONAL CAPACITY
   Need: Can they manage vendors, contractors, or teams? Experience level.
   Red flags: Solo founder planning to hire and manage without ops experience.

⑨ REVENUE URGENCY
   Need: How soon must revenue begin — 3 months / 6 months / 12 months / no urgency.
   Red flags: "Within 3 months" combined with no distribution or zero capital.

⑩ SCALABILITY INTENT
   Need: Lifestyle / profitable small, moderate growth, venture-scale, or unsure.
   Red flags: Venture-scale intent with lifestyle-level capital and commitment.

════════════════════════════════════
CONVERSATION STATE & COMPLETION
════════════════════════════════════

PROGRESS SO FAR: ${message_count} user messages sent.
- Messages 1–3: Understand commitment, capital, and team. These are foundational — don't rush.
- Messages 4–7: Explore complexity, speed preference, validation objective.
- Messages 8–10: Cover risk appetite, operational capacity, revenue urgency, scalability.
- Message 11+: If all 10 areas are genuinely covered, provide a 2–3 sentence synthesis then ask them to type "proceed".

${message_count >= 11 && conversation.toLowerCase().includes('proceed')
      ? `The founder has typed "proceed". Extract all information from the conversation and emit the completion signal with real data filled in:\n\n${completionMessage}`
      : ''}

${message_count >= 11 && !conversation.toLowerCase().includes('proceed')
      ? `You are near the end of the intake. Check coverage across all 10 areas. If any area is shallow, ask one more targeted question. If all areas are covered with depth, synthesize and ask them to type "proceed".`
      : ''}

════════════════════════════════════
TONE & STYLE
════════════════════════════════════

- Direct and analytical. Like a sharp advisor who respects the founder's time.
- Don't validate vague answers. Push for numbers and specifics.
- Never say "Great!" or "Thanks for sharing." Respond to the substance.
- When something doesn't add up, name it: "A $5k budget with venture-scale ambitions is a tension worth addressing."

NOW: Read the conversation above. What does the founder most need to clarify about their execution capacity? Ask that one thing.

════════════════════════════════════
AREA COMPLETION SIGNALS
════════════════════════════════════

When you are satisfied an area has been covered with sufficient depth and are transitioning
to the next topic, emit a silent signal at the END of your response.

Format: <AREA_COMPLETE:N> where N is the area number (1–10).

Area mapping:
1 = Execution Commitment, 2 = Capital Readiness, 3 = Team & Talent, 4 = Technical Complexity,
5 = Speed vs Stability, 6 = Validation Objective, 7 = Risk Appetite, 8 = Operational Capacity,
9 = Revenue Urgency, 10 = Scalability Intent

Rules:
- Only emit when DONE with that area and moving to the next.
- Only emit ONE signal per response.
- Never emit for the same area twice.
- The signal is invisible to the user.
- Do NOT emit based on message count alone. Emit because you got real clarity.`;
  }

  getPhase2FallbackIntakeResponse(messages) {
    const userMsgCount = messages.filter(m => m.role === "user").length;
    const responses = [
      "Welcome to Phase 2 Execution Blueprint — your capacity assessment begins here.\n\n**What is your execution commitment level for this venture over the next 6–12 months?**\n\nAre you working on this full-time, part-time, as a side project, or just testing the idea? If part-time, roughly how many hours per week?",
      "Thanks for that context. Let's talk capital.\n\n**What level of capital are you realistically prepared to deploy for building and running this venture over the next 6–12 months?**\n\nGive me a rough range, and let me know if you're expecting external funding or working with what you have.",
      "Good. Now let's look at your team.\n\n**Who do you currently have access to — and at what level of commitment?**\n\nAre these co-founders, contractors, or people you'd need to hire? What roles are covered today?"
    ];
    return { response: responses[Math.min(userMsgCount - 1, responses.length - 1)], model: 'fallback' };
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 3 SCORING
  // ─────────────────────────────────────────────────────────────────

  async generatePhase3Score(intakeData, growthMode) {
    try {
      const prompt = this.buildPhase3Prompt(intakeData, growthMode);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for Phase 3 scoring...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const parsedResult = this.parsePhase3Response(text);
          return {
            intake_data: intakeData,
            growth_mode: growthMode,
            growth_score: parsedResult.growth_score,
            growth_classification: parsedResult.growth_classification,
            phase3_analysis: parsedResult.phase3_analysis
          };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in generatePhase3Score:', error);
      throw error;
    }
  }

  buildPhase3Prompt(intakeData, growthMode) {
    return `You are a GTM and growth strategy expert. Analyze the following GTM assessment data and provide a comprehensive growth evaluation.

GROWTH MODE: ${growthMode}

INTAKE DATA:
${JSON.stringify(intakeData, null, 2)}

Analyze all 15 GTM areas and respond ONLY with valid JSON:

{
  "executive_summary": {
    "growth_maturity_tier": "Structured Growth Engine|Early but Sound|Fragile Growth Structure|High GTM Risk",
    "action_directive": "Scale Aggressively|Scale Cautiously|Optimize Before Scaling|Pivot Strategy",
    "growth_risk_level": "Low|Moderate|High",
    "action_summary": ""
  },
  "reasoning_trace": {
    "stage_1_customer": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_2_trigger": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_3_discovery": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_4_distribution": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_5_revenue": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_6_pricing": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_7_sales": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_8_value": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_9_retention": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_10_competitive": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_11_channel": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_12_economics": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_13_growth": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_14_capital": { "classification": "Strong|Moderate|Weak", "reasoning": "" },
    "stage_15_scale": { "classification": "Strong|Moderate|Weak", "reasoning": "" }
  },
  "scoring_audit": {
    "base_score": 0,
    "pillar_scores": {
      "customer_clarity": { "score": 0, "reasoning": "" },
      "market_timing": { "score": 0, "reasoning": "" },
      "distribution_feasibility": { "score": 0, "reasoning": "" },
      "revenue_model": { "score": 0, "reasoning": "" },
      "pricing_strategy": { "score": 0, "reasoning": "" },
      "sales_efficiency": { "score": 0, "reasoning": "" },
      "retention_potential": { "score": 0, "reasoning": "" },
      "competitive_advantage": { "score": 0, "reasoning": "" }
    },
    "final_score": 0,
    "risk_penalty": 0,
    "maturity_boost": 0
  },
  "growth_confidence": {
    "overall": "low|moderate|high",
    "customer_clarity": 0,
    "market_timing": 0,
    "distribution_feasibility": 0,
    "revenue_model": 0,
    "pricing_strategy": 0,
    "sales_efficiency": 0,
    "retention_potential": 0,
    "competitive_advantage": 0
  }
}`;
  }

  // ─────────────────────────────────────────────────────────────────
  // PHASE 3 INTAKE CHAT
  // ─────────────────────────────────────────────────────────────────

  async generatePhase3IntakeResponse(messages, projectId) {
    try {
      const prompt = this.buildPhase3IntakePrompt(messages);
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for Phase 3 intake...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          return { response: text.trim(), model: modelName };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in generatePhase3IntakeResponse:', error);
      throw error;
    }
  }

  buildPhase3IntakePrompt(messages) {
    const conversation = messages.map(msg =>
      `${msg.role === 'user' ? 'FOUNDER' : 'ADVISOR'}: ${msg.content}`
    ).join('\n\n');
    const message_count = messages.filter(m => m.role === 'user').length;

    const completionMessage = `<INTAKE_COMPLETE>{"ideal_customer":"","buying_trigger":"","customer_discovery":"","distribution_access":"","revenue_model":"","pricing_hypothesis":"","sales_motion":"","time_to_value":"","retention_logic":"","competitive_edge":"","channel_strategy":"","cac_estimate":"","growth_target":"","gtm_capital":"","scale_intent":""}</INTAKE_COMPLETE>`;

    return `You are a Venture GTM & Growth Intelligence Engine conducting a Phase 3 growth strategy interview. Your job is to deeply understand how this venture will reach, convert, and retain its customers — not just collect answers to a list of questions.

CONVERSATION SO FAR:
${conversation}

CURRENT MESSAGE COUNT (user messages sent): ${message_count}

════════════════════════════════════
YOUR CORE BEHAVIORAL RULES
════════════════════════════════════

1. READ BEFORE YOU RESPOND
   Re-read the founder's last message. What did they actually say? What's inconsistent or underdeveloped?
   Respond to WHAT THEY SAID, not to a template.

2. FOLLOW THE THREAD — BUT STAY IN THE CURRENT AREA
   If something in the founder's answer is vague or unclear, dig deeper — but ONLY
   if that follow-up belongs to the CURRENT GTM area you are working on.

   Before asking any follow-up question, ask yourself:
   "Does this question belong to the area I am currently exploring?"
   - If YES → ask it.
   - If NO, but it belongs to a FUTURE area → DO NOT ask it now.
     Make a mental note and cover it when you reach that area naturally.
   - If NO, and it belongs to NO area → do not ask it at all.

   EXAMPLE OF WHAT NOT TO DO:
   You are on Area ① (Ideal Customer). The founder mentions their pricing model in passing.
   Do NOT ask about pricing now — that belongs to Area ⑤ (Revenue Model).
   Stay focused on understanding the customer: who they are, their characteristics.

   EXAMPLE OF WHAT TO DO:
   You are on Area ① (Ideal Customer). The founder says "we target businesses" vaguely.
   Ask: "You mentioned businesses — can you be more specific about what type of businesses
   and what roles within those businesses feel this pain most intensely?"
   This is a valid Area ① follow-up because it deepens customer clarity.

3. ONE QUESTION AT A TIME
   Never stack two questions. Pick the single most important unanswered thing
   within the CURRENT area.

4. MAX FOLLOW-UPS: 2 per area, 10 total across the conversation.

5. EARN THE NEXT TOPIC
   Only move on when the current area has genuine depth.

═══════════════════════════════════
AREA SCOPE BOUNDARIES — HARD RULES
═══════════════════════════════════

These define what belongs to each area. Only ask questions that fit the
CURRENT area's scope. If a topic fits a FUTURE area, leave it there.

① IDEAL CUSTOMER scope: Who they are — persona, industry, geography, size, income.
   NOT in scope: what triggers buying (Area ②), whether they've been interviewed (Area ③).

② BUYING TRIGGER scope: The specific event or condition that creates urgency.
   NOT in scope: whether interviews happened (Area ③), distribution access (Area ④).

③ CUSTOMER DISCOVERY scope: Interviews and pilots already conducted.
   NOT in scope: how to reach customers (Area ④), pricing (Area ⑥).

④ DISTRIBUTION ACCESS scope: Whether they have access to first 100 users today.
   NOT in scope: revenue model (Area ⑤), pricing (Area ⑥).

⑤ REVENUE MODEL scope: Subscription / transaction / marketplace / ads / one-time.
   NOT in scope: specific price point (Area ⑥), how customers buy (Area ⑦).

⑥ PRICING HYPOTHESIS scope: Expected price point and frequency.
   NOT in scope: sales process (Area ⑦), time-to-value (Area ⑧).

⑦ SALES MOTION scope: Self-serve / demo-led / enterprise / community / outbound.
   NOT in scope: how fast value is delivered (Area ⑧), retention (Area ⑨).

⑧ TIME-TO-VALUE scope: When after signup does a user experience meaningful value.
   NOT in scope: why they stay (Area ⑨), competitive advantage (Area ⑩).

⑨ RETENTION LOGIC scope: Why customers keep coming back beyond month 1.
   NOT in scope: competitive differentiation (Area ⑩), channels (Area ⑪).

⑩ COMPETITIVE EDGE scope: Specific advantage over alternatives.
   NOT in scope: which channels to use (Area ⑪), CAC estimates (Area ⑫).

⑪ CHANNEL STRATEGY scope: Top 2–3 channels ranked for early growth.
   NOT in scope: cost to acquire (Area ⑫), growth targets (Area ⑬).

⑫ CAC ESTIMATE scope: Expected cost to acquire one customer.
   NOT in scope: growth milestones (Area ⑬), GTM budget (Area ⑭).

⑬ GROWTH TARGET scope: The milestone that defines early growth success.
   NOT in scope: how much GTM budget exists (Area ⑭), scale intent (Area ⑮).

⑭ GTM CAPITAL scope: Budget available for marketing and growth.
   NOT in scope: long-term scale ambition (Area ⑮).

⑮ SCALE INTENT scope: Lifestyle / sustainable / venture-scale / acquisition exit.
   NOT in scope: anything already covered.

════════════════════════════════════
15 GTM AREAS — COVER ALL OF THEM
════════════════════════════════════

Work through these in natural conversational order. Do NOT announce or label them.

① IDEAL CUSTOMER
   Need: Role/persona, industry/niche, geography, company size (B2B) or income band (B2C).
   Red flags: "SMEs", "young people", "businesses" — too broad.

② BUYING TRIGGER
   Need: Specific event or condition that creates urgency to buy.
   Red flags: Emotional/social triggers without financial/operational cost attached.

③ CUSTOMER DISCOVERY
   Need: Number of customer interviews or pilots already conducted.
   Red flags: 0–5 interviews with no plan to validate remaining assumptions.

④ DISTRIBUTION ACCESS
   Need: Whether they already have access to first 100 users (owned audience / community / partnerships / none).
   Red flags: "I'll figure it out" with no distribution head start.

⑤ REVENUE MODEL
   Need: Subscription / transaction fee / marketplace / ads / one-time / hybrid.
   Red flags: "Multiple models" without understanding which one to prove first.

⑥ PRICING HYPOTHESIS
   Need: Expected price point — monthly / annual / per transaction.
   Red flags: No number, or a number without basis.

⑦ SALES MOTION
   Need: Self-serve / demo-led / enterprise sales / community conversion / outbound.
   Red flags: Enterprise sales with low capital or no sales experience.

⑧ TIME-TO-VALUE
   Need: When after signup does a user experience meaningful value — immediate / 1 day / 1 week / longer.
   Red flags: Long onboarding for a product claiming self-serve motion.

⑨ RETENTION LOGIC
   Need: Why customers keep coming back beyond month 1.
   Red flags: Generic answers — "it's useful", "it saves time" without a recurring trigger.

⑩ COMPETITIVE EDGE
   Need: Specific differentiation and structural advantage (price, speed, quality, network).
   Red flags: "Better UX" or "we're cheaper" without substance.

⑪ CHANNEL STRATEGY
   Need: Top 2–3 channels ranked for early growth.
   Red flags: Channels misaligned with ICP (e.g. enterprise B2B + TikTok organic).

⑫ CAC ESTIMATE
   Need: Expected cost to acquire one customer.
   Red flags: Unrealistically low CAC with no benchmark cited.

⑬ GROWTH TARGET
   Need: The milestone that defines early growth success (users / MRR / clients).
   Red flags: Vanity metrics without a revenue or retention tie-in.

⑭ GTM CAPITAL
   Need: Budget available for marketing and growth in the first 6 months.
   Red flags: Aggressive scale intent with <$5k GTM budget.

⑮ SCALE INTENT
   Need: Profitability-first / sustainable growth / venture-scale / acquisition exit.
   Red flags: Venture-scale intent with no network effects, distribution moat, or capital.

════════════════════════════════════
CONVERSATION STATE & COMPLETION
════════════════════════════════════

PROGRESS SO FAR: ${message_count} user messages sent.
- Messages 1–5: Nail the customer, trigger, discovery, distribution, and revenue model.
- Messages 6–10: Pricing, sales motion, time-to-value, retention, competitive edge.
- Messages 11–15: Channels, CAC, growth target, GTM capital, scale intent.
- Message 16+: If all 15 areas are covered with depth, provide a 2–3 sentence synthesis then ask them to type "proceed".

${message_count >= 16 && conversation.toLowerCase().includes('proceed')
      ? `The founder has typed "proceed". Extract all information from the conversation and emit the completion signal with real data filled in:\n\n${completionMessage}`
      : ''}

${message_count >= 16 && !conversation.toLowerCase().includes('proceed')
      ? `You are near the end of the intake. Check coverage across all 15 areas. If any area is shallow, ask one more targeted question. If all areas are covered with depth, synthesize and ask them to type "proceed".`
      : ''}

════════════════════════════════════
TONE & STYLE
════════════════════════════════════

- Analytical and growth-focused. Like a sharp GTM advisor who has seen many go-to-market failures.
- Challenge weak answers. "I'll use social media" is not a channel strategy.
- Never say "Great!" or "Thanks for sharing." Respond to the substance.
- When something doesn't hold up: "That CAC assumption is optimistic given the channel you're describing — what's your basis?"
- Format questions on a new line for readability.

NOW: Read the conversation above. What is the most important GTM assumption that still needs to be tested or clarified? Ask about that.

════════════════════════════════════
AREA COMPLETION SIGNALS
════════════════════════════════════

When you are satisfied an area has been covered with sufficient depth and are transitioning
to the next topic, emit a silent signal at the END of your response.

Format: <AREA_COMPLETE:N> where N is the area number (1–15).

Area mapping:
1 = Ideal Customer, 2 = Buying Trigger, 3 = Customer Discovery, 4 = Distribution Access,
5 = Revenue Model, 6 = Pricing Hypothesis, 7 = Sales Motion, 8 = Time-to-Value,
9 = Retention Logic, 10 = Competitive Edge, 11 = Channel Strategy, 12 = CAC Estimate,
13 = Growth Target, 14 = GTM Capital, 15 = Scale Intent

Rules:
- Only emit when DONE with that area and moving to the next.
- Only emit ONE signal per response.
- Never emit for the same area twice.
- The signal is invisible to the user.
- Do NOT emit based on message count alone. Emit because you got real clarity.`;
  }

  parsePhase3Response(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.scoring_audit.final_score && parsed.scoring_audit.base_score) {
        const pillarScores = Object.values(parsed.scoring_audit.pillar_scores);
        const avgScore = pillarScores.reduce((sum, p) => sum + p.score, 0) / pillarScores.length;
        const baseScore = parsed.scoring_audit.base_score || avgScore * 5;
        parsed.scoring_audit.final_score = Math.max(0, Math.min(100,
          baseScore - (parsed.scoring_audit.risk_penalty || 0) + (parsed.scoring_audit.maturity_boost || 0)
        ));
      }

      const finalScore = parsed.scoring_audit.final_score;
      let growth_classification = "High GTM Risk";
      if (finalScore >= 80) growth_classification = "Structured Growth Engine";
      else if (finalScore >= 70) growth_classification = "Early but Sound";
      else if (finalScore >= 60) growth_classification = "Fragile Growth Structure";

      return { growth_score: parsed.scoring_audit.final_score, growth_classification, phase3_analysis: parsed };
    } catch (error) {
      console.error('Error parsing Phase 3 response:', error);
      throw new Error('Failed to parse AI response');
    }
  }
}

module.exports = new GeminiService();