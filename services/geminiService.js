const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    this.primaryModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    // Simple cache to reduce API calls during development
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cache key for requests
   * @param {string} type - Type of request
   * @param {Object} data - Request data
   * @returns {string} - Cache key
   */
  getCacheKey(type, data) {
    // Include message_count in cache key to ensure different questions aren't cached together
    const messageCount = data.message_count || 0;
    const dataSlice = JSON.stringify(data).slice(0, 100);
    return `${type}_${messageCount}_${dataSlice}`;
  }

  /**
   * Get cached response
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached response or null
   */
  getCachedResponse(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Using cached response for:', key);
      return cached.data;
    }
    return null;
  }

  /**
   * Cache response
   * @param {string} key - Cache key
   * @param {Object} data - Response data
   */
  cacheResponse(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Generate ICP strategic report using AI
   * @param {Object} icpData - The ICP data including product context and segments
   * @returns {Promise<Object>} - Generated report with strategic insights
   */
  async generateICPReport(icpData) {
    const prompt = this.buildICPPrompt(icpData);
    let model = this.primaryModel;
    let modelName = 'gemini-2.5-flash';

    // Try primary model first, then fallback if needed
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Using ${modelName}...`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse AI response into structured data
        const report = this.parseAIResponse(text);

        return {
          segments: report,
          generated_at: new Date(),
          ai_model: modelName
        };
      } catch (error) {
        console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);

        // If this is the second attempt, throw the error
        if (attempt === 2) {
          console.error('All attempts failed:', error);
          throw new Error(`AI service temporarily unavailable. Please try again in a few minutes. Error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Build the prompt for ICP analysis
   * @param {Object} icpData - ICP data
   * @returns {string} - Complete prompt for AI
   */
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

Please provide a strategic analysis for each segment in the following JSON format. For each segment, provide:

1. Pain Intensity Score (0-100): How severe are their problems?
2. Purchase Probability (0-100%): How likely are they to buy?
3. Revenue Potential (Low/Medium/High): What's the revenue potential?
4. Persona Summary: A detailed persona summary based on the analysis
5. Best Channels: Top 3-5 channels to reach this segment
6. Strategic Insights: Key strategic recommendations for targeting this segment

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

  /**
   * Parse AI response into structured data
   * @param {string} text - AI response text
   * @returns {Array} - Parsed segments data
   */
  parseAIResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.segments || !Array.isArray(parsed.segments)) {
        throw new Error('Invalid response format');
      }

      // Sanitize each segment to ensure field types match the schema
      return parsed.segments.map(segment => ({
        ...segment,
        // If AI returns array, join into a single string
        strategic_insights: Array.isArray(segment.strategic_insights)
          ? segment.strategic_insights.join('\n\n')
          : segment.strategic_insights || '',
        // Ensure best_channels is always an array
        best_channels: Array.isArray(segment.best_channels)
          ? segment.best_channels
          : [segment.best_channels || 'LinkedIn'],
        // Ensure scores are numbers
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

  /**
   * Generate User Story artifacts using AI
   * @param {Object} storyData - The user story data including all steps
   * @returns {Promise<Object>} - Generated user story artifacts
   */
  async generateUserStory(storyData) {
    try {
      const prompt = this.buildUserStoryPrompt(storyData);
      
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';
      
      // Try primary model first, then fallback if needed
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for user story generation...`);
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Parse AI response into structured data
          const report = this.parseUserStoryResponse(text);
          
          return {
            ...report,
            generated_at: new Date(),
            ai_model: modelName
          };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          
          // If primary model fails and this is first attempt, try fallback
          if (attempt === 1 && error.message.includes('503')) {
            console.log('Primary model unavailable, switching to fallback model...');
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            // Add a small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          // If this is the second attempt, throw the error
          if (attempt === 2) {
            console.error('All attempts failed:', error);
            throw new Error(`AI service temporarily unavailable. Please try again in a few minutes. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating user story:', error);
      throw new Error('Failed to generate user story');
    }
  }

  /**
   * Build the prompt for user story generation
   * @param {Object} storyData - User story data
   * @returns {string} - Complete prompt for AI
   */
  buildUserStoryPrompt(storyData) {
    const {
      product_context,
      module_definition,
      epic_definition,
      story_definition,
      user_flow,
      preconditions,
      postconditions,
      dependencies,
      design_considerations,
      technical_considerations,
      definition_of_done
    } = storyData;

    let prompt = `You are an expert product manager and technical writer. Generate comprehensive, engineering-ready user story artifacts based on the following detailed input.

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

Please generate 1-3 comprehensive user story artifacts in the following JSON format. Each story should be engineering-ready with complete acceptance criteria.

Respond ONLY with valid JSON in this exact format:

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
}

Make the stories actionable, specific, and ready for development teams. Include realistic acceptance criteria that cover both happy and unhappy paths.`;

    return prompt;
  }

  /**
   * Parse AI user story response into structured data
   * @param {string} text - AI response text
   * @returns {Object} - Parsed user story data
   */
  parseUserStoryResponse(text) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.stories || !Array.isArray(parsed.stories)) {
        throw new Error('Invalid response format');
      }

      // Sanitize each story to ensure field types match the schema
      return {
        summary: parsed.summary || `Generated ${parsed.stories.length} user stories for development`,
        stories: parsed.stories.map(story => ({
          ...story,
          // Ensure acceptance criteria has both happy and unhappy paths
          acceptanceCriteria: {
            happy: story.acceptanceCriteria?.happy || "User successfully completes the intended action",
            unhappy: story.acceptanceCriteria?.unhappy || "System handles errors gracefully and provides clear feedback"
          },
          // Ensure storyId format
          storyId: story.storyId || `STORY-${Math.floor(Math.random() * 1000)}`,
          // Ensure all fields are strings
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
      
      // Fallback: return basic structure if parsing fails
      return {
        summary: "AI analysis failed. Manual review recommended.",
        stories: [{
          module: "Unknown",
          epic: "Unknown",
          storyId: "STORY-ERROR",
          title: "Analysis Error",
          why: "Unable to generate detailed user story",
          story: "Unable to generate detailed user story. Please try again.",
          precondition: "System ready",
          userFlow: "Standard flow",
          postCondition: "Task completed",
          acceptanceCriteria: {
            happy: "User successfully completes action",
            unhappy: "System handles errors gracefully"
          },
          dependencies: "No dependencies",
          designConsideration: "Follow design system",
          technicalConsiderations: "Standard implementation",
          definitionOfDone: "Tests pass and code reviewed"
        }]
      };
    }
  }

  /**
   * Generate PRD artifacts using AI
   * @param {Object} prdData - The PRD data including all steps
   * @returns {Promise<Object>} - Generated PRD artifacts
   */
  async generatePRD(prdData) {
    try {
      const prompt = this.buildPRDPrompt(prdData);
      
      let model = this.primaryModel;
      let modelName = 'gemini-2.5-flash';
      
      // Try primary model first, then fallback if needed
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Using ${modelName} for PRD generation...`);
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          // Parse AI response into structured data
          const report = this.parsePRDResponse(text, prdData.prd_type);
          
          return {
            ...report,
            generated_at: new Date(),
            ai_model: modelName
          };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
          
          // If primary model fails and this is first attempt, try fallback
          if (attempt === 1 && error.message.includes('503')) {
            console.log('Primary model unavailable, switching to fallback model...');
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            // Add a small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          // If this is the second attempt, throw the error
          if (attempt === 2) {
            console.error('All attempts failed:', error);
            throw new Error(`AI service temporarily unavailable. Please try again in a few minutes. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating PRD:', error);
      throw new Error('Failed to generate PRD');
    }
  }

  /**
   * Build the prompt for PRD generation
   * @param {Object} prdData - PRD data
   * @returns {string} - Complete prompt for AI
   */
  buildPRDPrompt(prdData) {
    const {
      prd_type,
      product_context,
      strategic_context,
      product_definition,
      execution_context
    } = prdData;

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
      specificPrompt = `Generate a Simple PRD with the following sections. Each section should be comprehensive and actionable.

Please generate the PRD in this exact JSON format:

{
  "productInformation": "Detailed product information and overview",
  "goalsAndObjectives": "Clear goals and measurable objectives",
  "targetUsers": "Detailed target user profiles and personas",
  "problemStatement": "Clear problem statement with user pain points",
  "valueProposition": "Strong value proposition and competitive advantages",
  "assumptions": "Key assumptions and validation requirements",
  "constraints": "Technical, business, and timeline constraints",
  "backgroundAndStrategicFit": "Market context and strategic alignment",
  "productRoadmap": "High-level product roadmap and milestones",
  "scope": "Clear scope definition and boundaries",
  "coreFeatures": "Detailed core feature specifications",
  "releaseCriteria": "Clear release and success criteria",
  "successMetrics": "Measurable success metrics and KPIs",
  "dependencies": "Key dependencies and integration requirements",
  "risks": "Risk assessment and mitigation strategies",
  "exclusions": "Explicitly excluded features and scope",
  "strategicNote": "Strategic considerations and next steps"
}

Focus on product clarity, internal alignment, and early-stage definition. Make it actionable for the development team.`;
    } else if (prd_type === 'growth') {
      specificPrompt = `Generate a Growth PRD focused on acquisition, engagement, and monetization. Each section should be data-driven and actionable.

Please generate the PRD in this exact JSON format:

{
  "growthGoals": "Specific growth objectives and targets",
  "icpDefinition": "Ideal customer profile and target segments",
  "acquisitionChannels": "Primary acquisition channels and strategies",
  "conversionStrategy": "User conversion funnel and optimization",
  "retentionStrategy": "User retention and engagement tactics",
  "monetizationModel": "Revenue model and pricing strategy",
  "growthAssumptions": "Key growth assumptions and hypotheses",
  "growthConstraints": "Growth limitations and challenges",
  "strategicGrowthFit": "How growth aligns with business strategy",
  "growthRoadmap": "Growth-focused product roadmap",
  "userLifecycleScope": "User lifecycle stages and touchpoints",
  "growthFeatures": "Features specifically for growth",
  "technicalGrowthRequirements": "Technical infrastructure for growth",
  "experimentationPlan": "A/B testing and experimentation framework",
  "growthRisks": "Growth-specific risks and mitigation"
}

Focus on acquisition strategy, engagement design, and monetization planning. Include specific metrics and actionable growth tactics.`;
    } else if (prd_type === 'technical') {
      specificPrompt = `Generate a Technical PRD focused on engineering planning and architecture. Each section should be technically detailed and implementation-focused.

Please generate the PRD in this exact JSON format:

{
  "technicalObjectives": "Specific technical goals and requirements",
  "coreProductFeatures": "Technical specifications of core features",
  "technicalSpecifications": "Detailed technical specifications",
  "coreTechnicalComponents": "Core system components and architecture",
  "apiArchitecture": "API design and integration specifications",
  "dataArchitecture": "Data models, storage, and flow specifications",
  "featureLevelTechnicalConsiderations": "Technical considerations for each feature",
  "systemArchitecturePrinciples": "System design principles and patterns",
  "highLevelArchitecture": "High-level system architecture overview",
  "securityModel": "Security requirements and implementation",
  "performanceTargets": "Performance requirements and benchmarks",
  "scalabilityStrategy": "Scalability requirements and approach",
  "integrationRequirements": "External system integrations and APIs"
}

Focus on engineering planning, system architecture, and infrastructure design. Include specific technical requirements and implementation details.`;
    }

    return basePrompt + specificPrompt + `

Generate a comprehensive, professional PRD that can be immediately used by the product and engineering teams. Ensure all sections are well-written, actionable, and specific to the provided context. Respond ONLY with valid JSON.`;
  }

  /**
   * Parse AI PRD response into structured data
   * @param {string} text - AI response text
   * @param {string} prdType - Type of PRD (simple, growth, technical)
   * @returns {Object} - Parsed PRD data
   */
  parsePRDResponse(text, prdType) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure all required sections exist based on PRD type
      const result = {};

      if (prdType === 'simple') {
        const simpleSections = [
          'productInformation', 'goalsAndObjectives', 'targetUsers', 'problemStatement',
          'valueProposition', 'assumptions', 'constraints', 'backgroundAndStrategicFit',
          'productRoadmap', 'scope', 'coreFeatures', 'releaseCriteria', 'successMetrics',
          'dependencies', 'risks', 'exclusions', 'strategicNote'
        ];
        simpleSections.forEach(section => {
          result[section] = parsed[section] || `Section ${section} content will be generated based on provided information.`;
        });
      } else if (prdType === 'growth') {
        const growthSections = [
          'growthGoals', 'icpDefinition', 'acquisitionChannels', 'conversionStrategy',
          'retentionStrategy', 'monetizationModel', 'growthAssumptions', 'growthConstraints',
          'strategicGrowthFit', 'growthRoadmap', 'userLifecycleScope', 'growthFeatures',
          'technicalGrowthRequirements', 'experimentationPlan', 'growthRisks'
        ];
        growthSections.forEach(section => {
          result[section] = parsed[section] || `Section ${section} content will be generated based on provided information.`;
        });
      } else if (prdType === 'technical') {
        const technicalSections = [
          'technicalObjectives', 'coreProductFeatures', 'technicalSpecifications',
          'coreTechnicalComponents', 'apiArchitecture', 'dataArchitecture',
          'featureLevelTechnicalConsiderations', 'systemArchitecturePrinciples',
          'highLevelArchitecture', 'securityModel', 'performanceTargets',
          'scalabilityStrategy', 'integrationRequirements'
        ];
        technicalSections.forEach(section => {
          result[section] = parsed[section] || `Section ${section} content will be generated based on provided information.`;
        });
      }

      return result;
    } catch (error) {
      console.error('Error parsing PRD response:', error);
      
      // Fallback: return basic structure if parsing fails
      return {
        productInformation: "AI analysis failed. Please try again.",
        goalsAndObjectives: "Unable to generate detailed objectives.",
        targetUsers: "Unable to generate detailed user profiles.",
        problemStatement: "Unable to generate detailed problem statement.",
        valueProposition: "Unable to generate detailed value proposition.",
        assumptions: "Unable to generate detailed assumptions.",
        constraints: "Unable to generate detailed constraints.",
        backgroundAndStrategicFit: "Unable to generate detailed strategic context.",
        productRoadmap: "Unable to generate detailed roadmap.",
        scope: "Unable to generate detailed scope.",
        coreFeatures: "Unable to generate detailed features.",
        releaseCriteria: "Unable to generate detailed release criteria.",
        successMetrics: "Unable to generate detailed success metrics.",
        dependencies: "Unable to generate detailed dependencies.",
        risks: "Unable to generate detailed risk assessment.",
        exclusions: "Unable to generate detailed exclusions.",
        strategicNote: "Unable to generate detailed strategic notes."
      };
    }
  }

  /**
   * Generate Phase 1 venture scoring and validation
   * @param {Object} intakeData - The intake data from Phase 1
   * @returns {Promise<Object>} - Venture scoring results
   */
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
 
          return {
            ...scoreData,
            generated_at: new Date(),
            ai_model: modelName
          };
        } catch (error) {
          console.error(`Attempt ${attempt} failed with ${modelName}:`, error.message);
 
          if (attempt === 1 && (error.message.includes('503') || error.message.includes('429') || error.message.includes('quota'))) {
            console.log('Switching to fallback model...');
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
 
          if (attempt === 2) {
            throw new Error(`AI service temporarily unavailable. Please try again. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating Phase 1 score:', error);
      throw new Error('Failed to generate venture score');
    }
  }
 
  /**
   * Build the Phase 1 scoring prompt.
   *
   * KEY FIX: The JSON schema below contains NO pre-filled values.
   * Every field is described with a comment so the AI understands
   * what to compute — not what to copy.
   */
  buildPhase1Prompt(intakeData) {
    const {
      idea_definition,
      target_segment,
      problem_urgency,
      existing_alternatives,
      willingness_to_pay,
      market_context,
      differentiation,
      founder_advantage,
      key_assumptions,
      validation_evidence,
      follow_up_responses
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
Apply these AFTER completing all 8 stages.
 
PROBLEM SCORE (Reality Pressure):
  Strong problem                 → base 75–85
  Strong + spending evidence     → add 5–10
  Moderate problem               → base 55–70
  Weak problem                   → cap 45
  Urgency < 6/10                 → cap 70
 
MARKET SCORE (Market Physics):
  Narrow segment + infra ready   → base 70–85
  Broad segment + no wedge       → cap 60
  Regulatory friction            → deduct 10–15
  Late + saturated               → cap 65
 
BUSINESS MODEL SCORE (Buyer Economics):
  Clear payer + recurring + realistic price → base 75–90
  Buyer unclear                  → cap 55
  CAC undefined                  → deduct 10
  Margin < 30%                   → cap 60
 
SOLUTION FIT SCORE (Competitive Gravity):
  High density + weak diff       → cap 50
  Clear niche wedge              → 65–80
  Strong defensibility           → 80+
 
FOUNDER SCORE (Founder Leverage):
  Strong domain + network        → 75–90
  No distribution leverage       → cap 60
  No domain familiarity          → cap 55
 
OVERALL VIABILITY:
  Weak problem                   → overall cap 59
  Weak economics                 → overall cap 65
  High-risk assumptions > 50%    → deduct 5–15
  Revenue-tested validation      → add +5 confidence
 
CLASSIFICATION:
  Viability ≥ 75 AND Confidence ≥ 70  → "Strategic Opportunity"
  Viability 60–74 OR Confidence 50–69 → "Conditional Build"
  Viability 45–59 AND strong founder  → "High Risk Pivot"
  Viability < 45                       → "Kill"
 
════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Respond ONLY with valid JSON. No markdown fences, no preamble.
Fill EVERY field with real analysis derived from the founder's answers above.
Do NOT copy the field descriptions into the values — replace them with actual content.
 
{
  "executive_summary": {
    "viability_score": <integer 0–100 derived from decision trees>,
    "classification": "<Strategic Opportunity | Conditional Build | High Risk Pivot | Kill>",
    "confidence_index": <integer 0–100 based on evidence strength>,
    "validation_maturity": "<Idea-stage | Early validation | Market-tested | Revenue-tested>",
    "strategic_insight": "<2–3 sentence investor-grade synthesis of this specific venture's opportunity and risks>"
  },
  "problem_intensity": {
    "score": <integer 0–100>,
    "intensity_level": "<Low | Moderate | High | Critical>",
    "spending_evidence": "<None | Implied | Present | Strong>",
    "coping_cost": "<Low | Medium | High>",
    "urgency_index": "<Optional | Important | Critical>",
    "analysis": "<specific analysis of this founder's problem, citing their actual words>"
  },
  "market_opportunity": {
    "score": <integer 0–100>,
    "segment_definition": "<how precisely the founder defined their segment>",
    "market_size_tier": "<Niche | Mid-market | Mass market>",
    "purchasing_power": "<Low | Moderate | High>",
    "infrastructure_ready": <true | false>,
    "timing_window": "<Too Early | Early | Timely | Late>",
    "insight": "<specific market analysis based on the geography and context the founder described>"
  },
  "buyer_economics": {
    "score": <integer 0–100>,
    "who_pays": "<who actually pays, derived from willingness_to_pay>",
    "revenue_model": "<model the founder described>",
    "revenue_model_clarity": "<Clear | Vague | Undefined>",
    "unit_economics_tier": "<Viable | Marginal | Unviable>",
    "capital_intensity": "<Low | Medium | High>",
    "cac_assumptions": "<Defined | Reasonable | Undefined>",
    "payback_assumptions": "<estimated payback period or 'Unknown'>",
    "interpretation": "<specific interpretation of this founder's economics>"
  },
  "competitive_positioning": {
    "score": <integer 0–100>,
    "direct_competitors": "<what the founder said about competitors, or inferred from alternatives>",
    "substitute_alternatives": "<how users currently solve this problem per the founder>",
    "differentiation_clarity": "<Strong | Moderate | Weak | None>",
    "switching_friction": "<Low | Medium | High>",
    "platform_dependency": "<Low | Medium | High>",
    "insight": "<specific competitive analysis based on what differentiation the founder described>"
  },
  "founder_advantage": {
    "score": <integer 0–100>,
    "domain_leverage": "<Strong | Moderate | Weak | None>",
    "distribution_access": "<Strong | Moderate | Limited | None>",
    "talent_access": "<Strong | Moderate | Limited>",
    "capital_access": "<Strong | Moderate | Limited | Unknown>",
    "network_leverage": "<Strong | Moderate | Limited | None>",
    "assessment": "<specific assessment of this founder's unique positioning>"
  },
  "assumption_map": {
    "market_assumptions": [
      {"assumption": "<actual assumption from their answers>", "status": "<Untested | Weak | Reasonable | Strong>", "validation": "<how to validate this>"}
    ],
    "behavioral_assumptions": [
      {"assumption": "<actual assumption>", "status": "<Untested | Weak | Reasonable | Strong>", "validation": "<validation method>"}
    ],
    "economic_assumptions": [
      {"assumption": "<actual assumption>", "status": "<Untested | Weak | Reasonable | Strong>", "validation": "<validation method>"}
    ],
    "execution_assumptions": [
      {"assumption": "<actual assumption>", "status": "<Untested | Weak | Reasonable | Strong>", "validation": "<validation method>"}
    ],
    "ai_generated_assumptions": [
      {"assumption": "<an important assumption the founder did NOT mention but that materially affects the venture>", "status": "Untested", "validation": "<how to validate>"}
    ]
  },
  "risk_clusters": {
    "market_risk": {"severity": "<Low | Moderate | High>", "explanation": "<specific risk explanation>", "mitigation": "<concrete mitigation step>"},
    "economic_risk": {"severity": "<Low | Moderate | High>", "explanation": "<specific risk explanation>", "mitigation": "<concrete mitigation step>"},
    "competitive_risk": {"severity": "<Low | Moderate | High>", "explanation": "<specific risk explanation>", "mitigation": "<concrete mitigation step>"},
    "execution_risk": {"severity": "<Low | Moderate | High>", "explanation": "<specific risk explanation>", "mitigation": "<concrete mitigation step>"}
  },
  "strategic_routes": {
    "recommended_route": {
      "route": "<name of best strategic path for THIS venture>",
      "why_improves": "<why this route improves the viability score>",
      "changes_required": "<concrete changes the founder must make>"
    },
    "alternative_routes": [
      {"route": "<alternative 1 name>", "description": "<what this route involves and why it could work>"},
      {"route": "<alternative 2 name>", "description": "<what this route involves and why it could work>"},
      {"route": "<alternative 3 name>", "description": "<what this route involves and why it could work>"}
    ]
  },
  "validation_gaps": {
    "critical_questions": [
      "<most important unanswered question about this specific venture>",
      "<second most important unanswered question>",
      "<third most important unanswered question>"
    ],
    "missing_data": [
      "<specific data point missing from this founder's intake>",
      "<second missing data point>",
      "<third missing data point>"
    ],
    "required_experiments": [
      "<concrete experiment #1 to validate the riskiest assumption>",
      "<concrete experiment #2>",
      "<concrete experiment #3>"
    ]
  },
  "build_readiness": {
    "signal": "<Ready to Build | Validate First | Requires Pivot | Kill>",
    "confidence_score": <integer 0–100>,
    "next_steps": [
      "<immediate next step #1>",
      "<immediate next step #2>",
      "<immediate next step #3>"
    ]
  },
  "confidence_breakdown": {
    "evidence_strength": <integer 0–100>,
    "assumption_clarity": <integer 0–100>,
    "market_clarity": <integer 0–100>,
    "economic_clarity": <integer 0–100>,
    "competitive_realism": <integer 0–100>
  },
  "ai_reasoning_trace": {
    "stage2_problem_strength": {"tier": "<Strong | Moderate | Weak>", "reasoning": "<one sentence explaining why>"},
    "stage3_market_structure": {"tier": "<Structured | Fragile | Competitive Pressure>", "reasoning": "<one sentence explaining why>"},
    "stage4_economic_viability": {"tier": "<Strong | Fragile | Weak>", "reasoning": "<one sentence explaining why>"},
    "stage5_competitive_gravity": {"tier": "<Low | Manageable | High>", "reasoning": "<one sentence explaining why>"},
    "stage6_founder_leverage": {"tier": "<Strong | Moderate | Weak>", "reasoning": "<one sentence explaining why>"},
    "stage7_assumption_risk": {
      "high_risk_count": <integer>,
      "total_assumptions": <integer>,
      "assumption_risk_density": <integer 0–100>
    },
    "stage8_validation_maturity": {"maturity": "<Idea-stage | Early validation | Market-tested | Revenue-tested>", "reasoning": "<one sentence explaining why>"}
  },
  "scoring_decisions": {
    "tier_modifiers_applied": "<explain which caps or bonuses were applied and why, e.g. 'Moderate problem capped problem score at 70; no distribution leverage capped founder score at 60'>",
    "weighted_raw": <integer — the score before modifiers>,
    "viability_final": <integer — the final viability score after all modifiers>
  }
}`;
  }
 
  /**
   * Parse AI Phase 1 response into structured data
   */
  parsePhase1Response(text) {
    try {
      // Strip markdown fences if present
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
 
      const parsed = JSON.parse(jsonMatch[0]);
 
      const executiveSummary = parsed.executive_summary || {};
      const scoringLayers = {
        problem_validation: {
          score: Number(parsed.problem_intensity?.score) || 50,
          analysis: parsed.problem_intensity?.analysis || '',
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        solution_fit: {
          score: Number(parsed.competitive_positioning?.score) || 50,
          analysis: parsed.competitive_positioning?.insight || '',
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        market_opportunity: {
          score: Number(parsed.market_opportunity?.score) || 50,
          analysis: parsed.market_opportunity?.insight || '',
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        founder_market_fit: {
          score: Number(parsed.founder_advantage?.score) || 50,
          analysis: parsed.founder_advantage?.assessment || '',
          strengths: [],
          weaknesses: [],
          recommendations: []
        },
        business_model: {
          score: Number(parsed.buyer_economics?.score) || 50,
          analysis: parsed.buyer_economics?.interpretation || '',
          strengths: [],
          weaknesses: [],
          recommendations: []
        }
      };
 
      // Convert risk clusters to risk flags
      const riskFlags = [];
      if (parsed.risk_clusters) {
        Object.entries(parsed.risk_clusters).forEach(([category, risk]) => {
          riskFlags.push({
            flag: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            severity: risk.severity || 'Medium',
            description: risk.explanation || '',
            mitigation: risk.mitigation || ''
          });
        });
      }
 
      // Alternative routes
      const alternativeRoutes = (parsed.strategic_routes?.alternative_routes || []).map(route => ({
        route: route.route,
        description: route.description,
        rationale: 'Strategic alternative'
      }));
 
      const strategicInsights = {
        overall_assessment: executiveSummary.strategic_insight || '',
        key_strengths: [],
        critical_risks: [],
        next_steps: parsed.validation_gaps?.required_experiments || [],
        validation_priorities: parsed.validation_gaps?.critical_questions || []
      };
 
      // Build routes for dashboard
      const routesForDashboard = [];
      if (parsed.strategic_routes?.recommended_route) {
        routesForDashboard.push({
          route: parsed.strategic_routes.recommended_route.route,
          description: parsed.strategic_routes.recommended_route.why_improves
        });
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
          strategic_routes: parsed.strategic_routes || {
            recommended_route: {},
            alternative_routes: alternativeRoutes
          },
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
      viability_score: 0,
      classification: 'Early Stage',
      confidence_index: 0,
      validation_maturity: 'Idea-stage',
      scoring_layers: {
        problem_validation: empty,
        solution_fit: empty,
        market_opportunity: empty,
        founder_market_fit: empty,
        business_model: empty
      },
      risk_flags: [],
      alternative_routes: [],
      strategic_insights: {
        overall_assessment: 'AI analysis failed. Please retry.',
        key_strengths: [],
        critical_risks: [],
        next_steps: ['Retry the analysis'],
        validation_priorities: []
      },
      phase1_analysis: {
        executive_summary: { strategic_insight: 'Analysis failed — please retry.' },
        problem_intensity: { analysis: 'Analysis failed' },
        market_opportunity: { insight: 'Analysis failed' },
        buyer_economics: { interpretation: 'Analysis failed' },
        competitive_positioning: { insight: 'Analysis failed' },
        founder_advantage: { assessment: 'Analysis failed' },
        assumption_map: {},
        risk_clusters: {},
        strategic_routes: { recommended_route: {}, alternative_routes: [] },
        validation_gaps: { critical_questions: [], missing_data: [], required_experiments: [] },
        build_readiness: { signal: 'Requires further validation', confidence_score: 0, next_steps: [] },
        confidence_breakdown: {},
        ai_reasoning_trace: {},
        scoring_decisions: {},
        alternative_routes: []
      }
    };
  }
 
  // ─────────────────────────────────────────────────────────────────
  // INTAKE CHAT  (unchanged logic, keeping your existing questions)
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
            if (error.message.includes('quota') || error.message.includes('429')) {
              return this.getFallbackIntakeResponse(chatData);
            }
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
 
    return `You are an expert venture strategist conducting a structured Phase 1 validation interview.
Your goal is to gather comprehensive founder data across 10 critical areas.
 
CURRENT MESSAGE COUNT: ${message_count}
 
IMPORTANT: Select your response based on the EXACT message count shown above.
 
${message_count === 1 ? `QUESTION 1:
Welcome to Product Nerve AI — your venture validation begins here.
 
To build a rigorous, investor-grade validation report, I need to understand your idea deeply. Let's start:
 
**Describe your idea as clearly and comprehensively as possible.**
 
Include:
• What it is and how it works
• Who it serves (specific user or customer)
• What problem it solves
• How it makes money (if you know)
 
The more detail you provide upfront, the more accurate and strategic our analysis will be.` : ''}
 
${message_count === 2 ? `QUESTION 2:
Thank you for the overview. Now we need precise market definition.
 
**Who exactly is your primary target user or customer?**
 
Please specify:
• Demographics or firmographics
• Geographic location
• Behavioral characteristics
• B2B or B2C designation
• Decision-making authority
 
Clear segment definition is critical for accurate market analysis.` : ''}
 
${message_count === 3 ? `QUESTION 3:
Excellent market clarity. Let's examine the problem dynamics.
 
**What specific problem are you solving, and how frequently does it occur?**
 
Please rate:
• Pain intensity (1–10 scale)
• Frequency (Daily / Weekly / Monthly / Rare)
• Urgency level (Optional / Important / Critical)
 
Understanding problem intensity drives our validation scoring.` : ''}
 
${message_count === 4 ? `QUESTION 4:
Good problem context. Now let's map the current solution landscape.
 
**How are users currently solving this problem?**
 
Select the best description:
• Manual workaround
• Competitor tools
• Outsourcing services
• Ignoring the problem
• No current solution exists
 
This reveals market readiness and competitive positioning.` : ''}
 
${message_count === 5 ? `QUESTION 5:
Valuable insight on alternatives. Let's examine revenue logic.
 
**Why would users pay for your solution, and how do you plan to monetize?**
 
Specify:
• Pricing model (subscription, one-time, commission, etc.)
• Estimated price range
• Who actually pays (end-user vs. decision-maker)
• Payment timing (upfront vs. after value)
 
Revenue clarity determines economic viability.` : ''}
 
${message_count === 6 ? `QUESTION 6:
Clear revenue model. Now let's assess market timing and infrastructure.
 
**What region or market are you launching in, and why now?**
 
Include:
• Geographic scope
• Infrastructure readiness
• Regulatory considerations
• Timing rationale
 
Market context affects opportunity viability and risk assessment.` : ''}
 
${message_count === 7 ? `QUESTION 7:
Good market context. Let's analyze competitive positioning.
 
**What makes your solution meaningfully different from existing alternatives?**
 
Focus on:
• Functional differentiation
• Speed or cost advantages
• Access or distribution benefits
• Technology superiority
 
Differentiation strength determines competitive defensibility.` : ''}
 
${message_count === 8 ? `QUESTION 8:
Important differentiation insights. Now let's evaluate team-market fit.
 
**Why are you (or your team) uniquely positioned to build this?**
 
Detail your:
• Domain expertise
• Network access
• Distribution advantages
• Technical capabilities
• Capital resources
 
Founder leverage significantly impacts execution probability.` : ''}
 
${message_count === 9 ? `QUESTION 9:
Valuable founder insights. Let's identify critical success factors.
 
**List the 3–5 biggest assumptions this idea depends on being true.**
 
Focus on:
• Market assumptions
• Behavioral assumptions
• Economic assumptions
• Execution assumptions
 
Assumption clarity determines validation confidence.` : ''}
 
${message_count === 10 ? `QUESTION 10:
Critical assumptions identified. Finally, let's assess existing validation.
 
**Have you validated any part of this idea already?**
 
Share any:
• Customer interviews conducted
• Survey responses received
• Pilot user feedback
• Revenue generated
• Other validation data
 
Evidence strength increases confidence in our analysis.` : ''}
 
${message_count === 11 && !conversation.toLowerCase().includes('proceed') ? `You have reached the end of the 10 core questions.
 
Provide a brief, appreciative 2–3 sentence summary of what the founder has shared, then ask them to type "proceed" to move to the scoring engine. Do NOT output any completion data yet.` : ''}
 
${message_count >= 12 && conversation.toLowerCase().includes('proceed') ? `The founder has confirmed. Extract all answers from the conversation history and output the completion message with real data filled in:
 
${completionMessage}` : ''}
 
${message_count >= 12 && !conversation.toLowerCase().includes('proceed') ? `Still waiting for the founder to type "proceed". Politely remind them.` : ''}
 
CONVERSATION HISTORY:
${conversation}
 
COMMUNICATION STYLE:
• Professional and concise
• One question at a time — never stack questions
• Never repeat a question already answered
• Use proper grammar and paragraph breaks`;
  }
 
  getFallbackIntakeResponse(chatData) {
    const { message_count } = chatData;
    const responses = [
      `Welcome to Product Nerve AI — your venture validation begins here.\n\n**Describe your idea as clearly and comprehensively as possible.**\n\nInclude:\n• What it is and how it works\n• Who it serves\n• What problem it solves\n• How it makes money (if you know)`,
      `Thank you. Now we need precise market definition.\n\n**Who exactly is your primary target user or customer?**\n\nInclude demographics, geography, B2B or B2C, and decision-making authority.`,
      `Excellent. Let's examine the problem dynamics.\n\n**What specific problem are you solving, and how frequently does it occur?**\n\nRate pain intensity (1–10), frequency, and urgency level.`
    ];
    return {
      response: responses[Math.min(message_count - 1, responses.length - 1)],
      model: 'fallback'
    };
  }

  /**
   * Generate Phase 2 execution score and analysis
   * @param {Object} intakeData - Execution capacity intake data
   * @param {string} executionMode - Selected execution mode
   * @returns {Object} - Phase 2 scoring results
   */
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
            console.log('Switching to fallback model...');
            model = this.fallbackModel;
            modelName = 'gemini-1.5-flash';
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          if (attempt === 2) {
            throw new Error(`AI service temporarily unavailable. Please try again. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating Phase 2 score:', error);
      throw new Error('Failed to generate execution score');
    }
  }

  /**
   * Parse Phase 2 JSON response from AI
   * @param {string} text - AI response text
   * @returns {Object} - Parsed JSON data
   */
  parsePhase2JsonResponse(text) {
    // Strip markdown fences if present (same as Phase 1's parsePhase1Response)
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Phase 2 AI response');
    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Build Phase 2 analysis prompt
   * @param {Object} intakeData - Execution capacity intake data
   * @param {string} executionMode - Selected execution mode
   * @returns {string} - Complete prompt for AI
   */
  buildPhase2Prompt(intakeData, executionMode) {
    return `You are a venture construction intelligence engine analyzing execution capacity for Phase 2.

EXECUTION CAPACITY ASSESSMENT:
- Execution Commitment: ${intakeData.execution_commitment}
- Capital Readiness: ${intakeData.capital_readiness}
- Team Access: ${intakeData.team_access?.join(', ') || 'None specified'}
- Technical Complexity: ${intakeData.technical_complexity}
- Speed/ Stability Preference: ${intakeData.speed_stability_preference}
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

CRITICAL: Apply the Venture Construction Decision Tree Algorithm:

STAGE 1: EXECUTION CONTEXT RECONSTRUCTION
- Rebuild venture in execution terms based on intake answers
- Extract core value loop, primary user, revenue trigger, validation maturity

STAGE 2: BUILD OBJECTIVE CLASSIFICATION  
- Classify primary goal: Validation-first, Revenue-first, Investor-attraction, or Long-term foundation
- This controls scope compression and feature prioritization

STAGE 3: CAPACITY vs AMBITION GAP ANALYSIS
- Check for severe mismatch between ambition (scale intent, revenue urgency, speed) and capacity (capital, team, commitment)
- Classify as Aligned, Mildly Misaligned, or Severely Misaligned
- If severely misaligned → auto-compress scope and cap execution score at 59

STAGE 4: CAPITAL STRUCTURE REASONING
- Evaluate build capital, runway realism, buffer margin, funding dependency
- Classify: Self-sustained, Capital-constrained, Funding-dependent, High burn exposure
- Ceiling Rule: Funding-dependent + no investor goal → reduce scalability tier

STAGE 5: TEAM STRUCTURE FEASIBILITY
- Evaluate talent access, skill gaps, operational leadership, founder leverage  
- Classify: Self-executable, Contractor-dependent, Team-build required, High fragility
- If critical role missing (Tech in tech product) → Global Score Cap = 60

STAGE 6: SCOPE COMPRESSION LOGIC
- Define Minimum Viable Execution Scope (MVES) - smallest build validating primary objective
- If complexity > resources → auto-stage features into V1, V2, V3

STAGE 7: ARCHITECTURE TIER CLASSIFICATION
- Determine: Lightweight, Structured Lean, Modular Scalable, Infrastructure-Heavy
- Ceiling Rules: Low capital + AI mode → Cap at Lightweight; Venture-scale + adequate capital → Allow Modular Scalable

STAGE 8: TIMELINE REALISM ANALYSIS
- Check commitment level, team size, complexity, revenue urgency
- Classify: Aggressive, Realistic, Optimistic, Unrealistic
- If unrealistic → extend timeline and increase risk cluster

STAGE 9: EXECUTION RISK CLUSTERING
- Cluster risks: Scope Risk, Talent Risk, Capital Risk, Timeline Risk, Technical Risk
- Score each as Low/Moderate/High

STAGE 10: EXECUTION MATURITY LEVEL
- Determine execution readiness tier: Conceptually Ready, Structurally Ready, Operationally Ready, Premature

DECISION TREE SCORING ALGORITHM:
Step 1: Base Structural Score (0-20 each pillar):
- Objective Clarity: Goal clearly defined? Validation realistic? No conflicting goals?
- Capacity Alignment: Ambition aligned with capital, team, time? Severe mismatch caps at 8
- Scope Discipline: MVES compressed to core value loop? Feature overload caps at 12
- Capital Sufficiency: Runway ≥6 months? <3 months caps at 10
- Team Feasibility: Core roles covered? Critical gaps cap at 8

Step 2: Hard Caps:
- Capacity vs Ambition Severely Misaligned → Max 59
- Capital-Constrained + High Complexity → Max 65
- Validation Maturity = Idea-stage + High Build Capital → Max 70
- Timeline Unrealistic → Max 68

Step 3: Risk Adjustments:
- 0-1 High Risk: No penalty
- 2 High Risks: -5
- 3 High Risks: -10  
- 4+ High Risks: -15

Step 4: Maturity Boost:
- Revenue-tested: +5
- Pilot users with retention: +3
- Interview-validated only: +1
- Idea-stage: 0

Step 5: Final Classification:
- 80-100: Execution Ready
- 70-79: Structurally Sound but Resource Sensitive
- 60-69: Fragile Execution  
- 50-59: High Execution Risk
- <50: Premature to Build

CRITICAL ENUM CONSTRAINTS:
- execution_risk_level must be exactly: "low", "moderate", or "high" (NOT "Extremely High Risk", "Very High", etc.)
- execution_confidence.overall must be exactly: "low", "moderate", or "high" (NOT "Low", "Medium", "High" with different casing)

Respond ONLY with valid JSON. No markdown fences, no preamble. Every field must be uniquely generated based on the decision tree analysis:

{
  "executive_summary": {
    "execution_maturity_tier": "[AI GENERATED - Based on capacity assessment]",
    "team_composition": "[AI GENERATED - Based on team capabilities]",
    "capital_efficiency": "[AI GENERATED - Based on capital range and funding]",
    "speed_vs_stability": "[AI GENERATED - Based on speed vs stability preference]",
    "primary_execution_constraint": "[AI GENERATED - Main limiting factor]",
    "strategic_insight": "[AI GENERATED - Strategic analysis of execution capacity]",
    "action_directive": "[AI GENERATED - Recommended action approach]",
    "execution_risk_level": "[AI GENERATED - Must be exactly: low, moderate, or high]",
    "action_summary": "[AI GENERATED - Summary of execution readiness]"
  },
  "reasoning_trace": {
    "stage_2_team": {
      "classification": "[AI GENERATED - Team capability assessment]",
      "reasoning": "[AI GENERATED - Analysis of team composition and skills]"
    },
    "stage_3_capital": {
      "classification": "[AI GENERATED - Capital readiness assessment]",
      "reasoning": "[AI GENERATED - Analysis of funding situation and runway]"
    },
    "stage_4_complexity": {
      "classification": "[AI GENERATED - Technical complexity evaluation]",
      "reasoning": "[AI GENERATED - Analysis of technical requirements and challenges]"
    },
    "stage_5_speed": {
      "classification": "[AI GENERATED - Speed vs stability balance]",
      "reasoning": "[AI GENERATED - Analysis of development approach preference]"
    },
    "stage_6_validation": {
      "classification": "[AI GENERATED - Validation approach assessment]",
      "reasoning": "[AI GENERATED - Analysis of validation objectives and methods]"
    },
    "stage_7_capacity": {
      "classification": "[AI GENERATED - Operational capacity evaluation]",
      "reasoning": "[AI GENERATED - Analysis of operational bandwidth and processes]"
    },
    "stage_8_urgency": {
      "classification": "[AI GENERATED - Revenue urgency assessment]",
      "reasoning": "[AI GENERATED - Analysis of monetization timeline and pressure]"
    },
    "stage_9_scale": {
      "classification": "[AI GENERATED - Scalability intent evaluation]",
      "reasoning": "[AI GENERATED - Analysis of growth ambitions and plans]"
    },
    "stage_10_commitment": {
      "classification": "[AI GENERATED - Commitment level assessment]",
      "reasoning": "[AI GENERATED - Analysis of team dedication and runway]"
    },
    "stage_11_risks": {
      "Technical Risk": "[AI GENERATED - Technical risk level]",
      "Market Risk": "[AI GENERATED - Market risk level]",
      "Execution Risk": "[AI GENERATED - Execution risk level]"
    },
    "stage_11_constraint": "[AI GENERATED - Primary constraint identification]"
  },
  "scoring_audit": {
    "base_score": [AI GENERATED - Calculated base score from capacity assessment],
    "pillar_scores": {
      "team_composition": {
        "score": [AI GENERATED - 0-20 based on team capabilities],
        "reasoning": "[AI GENERATED - Team composition scoring rationale]"
      },
      "capital_efficiency": {
        "score": [AI GENERATED - 0-20 based on capital situation],
        "reasoning": "[AI GENERATED - Capital efficiency scoring rationale]"
      },
      "technical_complexity": {
        "score": [AI GENERATED - 0-20 based on technical assessment],
        "reasoning": "[AI GENERATED - Technical complexity scoring rationale]"
      },
      "speed_vs_stability": {
        "score": [AI GENERATED - 0-20 based on speed/stability preference],
        "reasoning": "[AI GENERATED - Speed vs stability scoring rationale]"
      },
      "validation_approach": {
        "score": [AI GENERATED - 0-20 based on validation objectives],
        "reasoning": "[AI GENERATED - Validation approach scoring rationale]"
      },
      "operational_capacity": {
        "score": [AI GENERATED - 0-20 based on operational assessment],
        "reasoning": "[AI GENERATED - Operational capacity scoring rationale]"
      },
      "execution_commitment": {
        "score": [AI GENERATED - 0-20 based on commitment level],
        "reasoning": "[AI GENERATED - Commitment scoring rationale]"
      }
    },
    "final_score": [AI GENERATED - Total calculated score 0-100]
  },
  "execution_confidence": {
    "overall": "[AI GENERATED - Must be exactly: low, moderate, or high]",
    "team_clarity": [AI GENERATED - 1-10 team capability confidence],
    "capital_adequacy": [AI GENERATED - 1-10 capital sufficiency confidence],
    "technical_feasibility": [AI GENERATED - 1-10 technical feasibility confidence],
    "speed_realism": [AI GENERATED - 1-10 timeline realism confidence],
    "validation_rigor": [AI GENERATED - 1-10 validation approach confidence],
    "operational_readiness": [AI GENERATED - 1-10 operational capability confidence],
    "commitment_level": [AI GENERATED - 1-10 commitment level confidence],
    "reasoning": "[AI GENERATED - Overall confidence assessment rationale]"
  },
  "execution_architecture": {
    "team_structure": {
      "core_team": [AI GENERATED - Core team members based on capabilities],
      "key_hires": [AI GENERATED - Critical hires needed],
      "team_gaps": [AI GENERATED - Identified team gaps]
    },
    "capital_plan": {
      "current_funding": [AI GENERATED - Based on capital range],
      "runway": [AI GENERATED - Calculated based on burn rate and funding],
      "burn_rate": [AI GENERATED - Estimated based on team size and mode],
      "next_funding": [AI GENERATED - Funding needs and timeline],
      "allocation": {
        "Product": [AI GENERATED - Percentage allocation],
        "Marketing": [AI GENERATED - Percentage allocation],
        "Operations": [AI GENERATED - Percentage allocation],
        "G&A": [AI GENERATED - Percentage allocation]
      }
    },
    "development_approach": {
      "methodology": [AI GENERATED - Based on complexity and speed preference],
      "tech_stack": [AI GENERATED - Recommended technology stack],
      "deployment": [AI GENERATED - Deployment strategy based on mode],
      "milestones": [
        {
          "title": [AI GENERATED - First milestone],
          "timeline": [AI GENERATED - Timeline based on mode],
          "resources": [AI GENERATED - Required resources]
        },
        {
          "title": [AI GENERATED - Second milestone],
          "timeline": [AI GENERATED - Timeline],
          "resources": [AI GENERATED - Required resources]
        }
      ]
    },
    "risk_mitigation": {
      "primary_risks": [
        {
          "risk": [AI GENERATED - Primary technical risk],
          "probability": [AI GENERATED - Risk probability],
          "impact": [AI GENERATED - Risk impact],
          "mitigation": [AI GENERATED - Mitigation strategy]
        },
        {
          "risk": [AI GENERATED - Primary market risk],
          "probability": [AI GENERATED - Risk probability],
          "impact": [AI GENERATED - Risk impact],
          "mitigation": [AI GENERATED - Mitigation strategy]
        }
      ],
      "contingency_plans": [
        {
          "scenario": [AI GENERATED - Key risk scenario],
          "response": [AI GENERATED - Contingency response]
        },
        {
          "scenario": [AI GENERATED - Secondary risk scenario],
          "response": [AI GENERATED - Contingency response]
        }
      ]
    }
  },
  "execution_roadmap": {
    "immediate_actions": [
      {
        "action": [AI GENERATED - Critical first action],
        "priority": [AI GENERATED - Action priority],
        "timeline": [AI GENERATED - Action timeline],
        "owner": [AI GENERATED - Action owner]
      },
      {
        "action": [AI GENERATED - Critical second action],
        "priority": [AI GENERATED - Action priority],
        "timeline": [AI GENERATED - Action timeline],
        "owner": [AI GENERATED - Action owner]
      }
    ],
    "critical_milestones": [
      {
        "milestone": [AI GENERATED - Key milestone 1],
        "success_criteria": [AI GENERATED - Success criteria],
        "deadline": [AI GENERATED - Deadline],
        "dependencies": [AI GENERATED - Key dependencies]
      },
      {
        "milestone": [AI GENERATED - Key milestone 2],
        "success_criteria": [AI GENERATED - Success criteria],
        "deadline": [AI GENERATED - Deadline],
        "dependencies": [AI GENERATED - Key dependencies]
      }
    ],
    "resource_allocation": {
      "team_allocation": {
        "Engineering": [AI GENERATED - Team percentage allocation],
        "Product": [AI GENERATED - Team percentage allocation],
        "Marketing": [AI GENERATED - Team percentage allocation],
        "Operations": [AI GENERATED - Team percentage allocation]
      },
      "capital_allocation": {
        "Salaries": [AI GENERATED - Capital percentage allocation],
        "Infrastructure": [AI GENERATED - Capital percentage allocation],
        "Marketing": [AI GENERATED - Capital percentage allocation],
        "Operations": [AI GENERATED - Capital percentage allocation]
      },
      "timeline_allocation": {
        "Development": [AI GENERATED - Timeline percentage allocation],
        "Testing": [AI GENERATED - Timeline percentage allocation],
        "Planning": [AI GENERATED - Timeline percentage allocation]
      }
    }
  }
}

Generate completely unique analysis based on the specific execution capacity assessment and selected mode. No field should contain generic or placeholder text - all content must be derived from the actual intake data and execution mode analysis.`;
  }

  /**
   * Parse Phase 2 AI response and format for database
   * @param {Object} parsed - Parsed AI response
   * @param {Object} intakeData - Original intake data
   * @param {string} executionMode - Selected execution mode
   * @returns {Object} - Formatted Phase 2 results
   */
  parsePhase2Response(parsed, intakeData, executionMode) {
    // Use ONLY AI-generated analysis from parsed response
    const executive_summary = parsed.executive_summary;
    const reasoning_trace = parsed.reasoning_trace;
    const scoring_audit = parsed.scoring_audit;
    const execution_confidence = parsed.execution_confidence;
    const execution_architecture = parsed.execution_architecture;
    const execution_roadmap = parsed.execution_roadmap;

    // Calculate final execution score from scoring audit
    const execution_score = scoring_audit?.final_score || 75;
    
    // Determine execution classification based on decision tree bands
    let execution_classification = "Premature to Build";
    if (execution_score >= 80) execution_classification = "Execution Ready";
    else if (execution_score >= 70) execution_classification = "Structurally Sound but Resource Sensitive";
    else if (execution_score >= 60) execution_classification = "Fragile Execution";
    else if (execution_score >= 50) execution_classification = "High Execution Risk";

    return {
      execution_score,
      execution_classification,
      execution_mode: executionMode,
      intake_data: intakeData,
      phase2_analysis: {
        executive_summary,
        reasoning_trace,
        scoring_audit,
        execution_confidence,
        execution_architecture,
        execution_roadmap
      }
    };
  }

  /**
   * Generate Phase 2 intake chat response
   * @param {Array} messages - Chat messages
   * @param {string} projectId - Project ID
   * @returns {Object} - AI response
   */
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
            if (error.message.includes('quota') || error.message.includes('429')) {
              return this.getPhase2FallbackIntakeResponse(messages);
            }
            throw new Error(`AI service temporarily unavailable. Error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error generating Phase 2 intake:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  getPhase2FallbackIntakeResponse(messages) {
    const message_count = messages.filter(m => m.role === 'user').length;
    const responses = [
      "Welcome to Phase 2 Execution Blueprint — your capacity assessment begins here.\n\n**What is your execution commitment level for this venture over the next 6–12 months?**\n\nOptions:\n• Full-time founder\n• Part-time founder\n• Side project\n• Testing idea only\n\nThis feeds timeline realism, risk tolerance, and build pace modeling.",
      "Thank you for commitment details. Now we need capital readiness assessment.\n\n**What level of capital are you realistically prepared to deploy for building and running this venture (next 6–12 months)?**\n\nRequire:\n• Rough budget range\n• Whether external funding expected\n\nThis feeds execution mode feasibility, capital architecture, and runway modeling.",
      "Good capital clarity. Let's examine team and talent access.\n\n**What capabilities do you currently have access to?**\n\nMulti-select:\n• Technical builder (engineering)\n• No-code builder\n• Designer\n• Growth marketer\n• Operations lead\n• None (solo founder)\n\nThis feeds team structure model, AI mode feasibility, and hiring recommendations.",
      "Valuable team insights. Now let's assess technical complexity.\n\n**How technically complex do you believe this product is?**\n\nOptions:\n• Simple web/mobile workflow\n• Moderate integrations\n• Heavy backend logic\n• AI/ML intensive\n• Infrastructure-heavy\n\nThis feeds architecture tier, overengineering risk, and tool stack logic.",
      "Technical context noted. Let's analyze speed vs stability preference.\n\n**Which is more important at this stage?**\n\nOptions:\n• Speed to MVP\n• Balanced approach\n• Long-term scalable foundation\n\nThis feeds execution mode recommendation, scope discipline, and technical stack choice.",
      "Important balance insights. Now let's define validation objective.\n\n**What is your primary goal for the first build?**\n\nOptions:\n• Test problem-market fit\n• Generate revenue quickly\n• Attract investors\n• Build long-term product\n• Validate unit economics\n\nThis feeds feature prioritization logic, MVP boundary clarity, and timeline milestone design.",
      "Clear validation goals. Let's assess risk appetite.\n\n**How much execution risk are you comfortable with?**\n\nOptions:\n• Very low risk\n• Moderate risk\n• High risk for speed\n\nThis feeds capital buffer recommendation, scope compression logic, and team sizing.",
      "Risk profile understood. Now let's evaluate operational capacity.\n\n**Do you have operational capacity to manage vendors, contractors, or teams?**\n\nOptions:\n• Yes, experienced\n• Limited experience\n• No experience\n\nThis feeds AI mode feasibility, outsourcing logic, and ops role necessity.",
      "Operational clarity gained. Let's examine revenue urgency.\n\n**How soon must this venture begin generating revenue?**\n\nOptions:\n• Within 3 months\n• Within 6 months\n• Within 12 months\n• No urgency\n\nThis feeds feature prioritization, monetization-first logic, and build sequence.",
      "Revenue context complete. Finally, let's understand scalability intent.\n\n**Are you building this to remain small and profitable or to scale aggressively?**\n\nOptions:\n• Lifestyle / profitable small\n• Moderate growth\n• Venture-scale\n• Unsure\n\nThis feeds architecture tier, capital modeling, and team scaling plan.",
      "You have reached the end of 10 core execution capacity questions.\n\nProvide a brief, appreciative 2-3 sentence summary of what the founder has shared, then ask them to type \"proceed\" to move to execution mode selection. Do NOT output any completion data yet."
    ];
    
    const userMsgCount = messages.filter(m => m.role === "user").length;
    return {
      response: responses[Math.min(userMsgCount - 1, responses.length - 1)],
      model: 'fallback'
    };
  }

  /**
   * Build Phase 2 intake prompt
   * @param {Array} messages - Chat messages
   * @returns {string} - Complete prompt for AI
   */
  buildPhase2IntakePrompt(messages) {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');
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
  "follow_up_responses": {
    "recommended_execution_mode": ""
  }
}</INTAKE_COMPLETE>`;

    return `You are an expert venture execution strategist conducting a structured Phase 2 execution capacity interview.

CURRENT MESSAGE COUNT: ${message_count}

IMPORTANT: Select your response based on the EXACT message count shown above.

${message_count === 1 ? `QUESTION 1:
Welcome to Phase 2 Execution Blueprint — your capacity assessment begins here.

**What is your execution commitment level for this venture over the next 6–12 months?**

Options:
• Full-time founder
• Part-time founder  
• Side project
• Testing idea only

This feeds timeline realism, risk tolerance, and build pace modeling.` : ''}

${message_count === 2 ? `QUESTION 2:
Thank you for commitment details. Now we need capital readiness assessment.

**What level of capital are you realistically prepared to deploy for building and running this venture (next 6–12 months)?**

Require:
• Rough budget range
• Whether external funding expected

This feeds execution mode feasibility, capital architecture, and runway modeling.` : ''}

${message_count === 3 ? `QUESTION 3:
Good capital clarity. Let's examine team and talent access.

**What capabilities do you currently have access to?**

Multi-select:
• Technical builder (engineering)
• No-code builder
• Designer
• Growth marketer
• Operations lead
• None (solo founder)

This feeds team structure model, AI mode feasibility, and hiring recommendations.` : ''}

${message_count === 4 ? `QUESTION 4:
Valuable team insights. Now let's assess technical complexity.

**How technically complex do you believe this product is?**

Options:
• Simple web/mobile workflow
• Moderate integrations
• Heavy backend logic
• AI/ML intensive
• Infrastructure-heavy

This feeds architecture tier, overengineering risk, and tool stack logic.` : ''}

${message_count === 5 ? `QUESTION 5:
Technical context noted. Let's analyze speed vs stability preference.

**Which is more important at this stage?**

Options:
• Speed to MVP
• Balanced approach
• Long-term scalable foundation

This feeds execution mode recommendation, scope discipline, and technical stack choice.` : ''}

${message_count === 6 ? `QUESTION 6:
Important balance insights. Now let's define validation objective.

**What is your primary goal for the first build?**

Options:
• Test problem-market fit
• Generate revenue quickly
• Attract investors
• Build long-term product
• Validate unit economics

This feeds feature prioritization logic, MVP boundary clarity, and timeline milestone design.` : ''}

${message_count === 7 ? `QUESTION 7:
Clear validation goals. Let's assess risk appetite.

**How much execution risk are you comfortable with?**

Options:
• Very low risk
• Moderate risk
• High risk for speed

This feeds capital buffer recommendation, scope compression logic, and team sizing.` : ''}

${message_count === 8 ? `QUESTION 8:
Risk profile understood. Now let's evaluate operational capacity.

**Do you have operational capacity to manage vendors, contractors, or teams?**

Options:
• Yes, experienced
• Limited experience
• No experience

This feeds AI mode feasibility, outsourcing logic, and ops role necessity.` : ''}

${message_count === 9 ? `QUESTION 9:
Operational clarity gained. Let's examine revenue urgency.

**How soon must this venture begin generating revenue?**

Options:
• Within 3 months
• Within 6 months
• Within 12 months
• No urgency

This feeds feature prioritization, monetization-first logic, and build sequence.` : ''}

${message_count === 10 ? `QUESTION 10:
Revenue context complete. Finally, let's understand scalability intent.

**Are you building this to remain small and profitable or to scale aggressively?**

Options:
• Lifestyle / profitable small
• Moderate growth
• Venture-scale
• Unsure

This feeds architecture tier, capital modeling, and team scaling plan.` : ''}

${message_count === 11 && !conversation.toLowerCase().includes('proceed') ? `You have reached the end of 10 core execution capacity questions.

Provide a brief, appreciative 2-3 sentence summary of what the founder has shared, then ask them to type "proceed" to move to execution mode selection. Do NOT output any completion data yet.` : ''}

${message_count >= 12 && conversation.toLowerCase().includes('proceed') ? `The founder has confirmed. Extract all answers from the conversation history and output completion message with real data filled in:

${completionMessage}` : ''}

${message_count >= 12 && !conversation.toLowerCase().includes('proceed') ? `Still waiting for founder to type "proceed". Politely remind them.` : ''}

CONVERSATION HISTORY:
${conversation}

COMMUNICATION STYLE:
• Professional and strategic
• One question at a time — never stack questions
• Never repeat a question already answered
• Use proper grammar and paragraph breaks
• Focus on execution capacity assessment`;
  }

  /**
   * Generate Phase 3 growth score
   * @param {Object} intakeData - Phase 3 intake data
   * @param {string} growthMode - Selected growth mode
   * @returns {Object} - Phase 3 scoring results
   */
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

  /**
   * Generate Phase 3 intake response
   * @param {Array} messages - Chat messages
   * @param {string} projectId - Project ID
   * @returns {Object} - AI response
   */
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

  /**
   * Build Phase 3 scoring prompt
   * @param {Object} intakeData - Phase 3 intake data
   * @param {string} growthMode - Selected growth mode
   * @returns {string} - Complete prompt for AI
   */
  buildPhase3Prompt(intakeData, growthMode) {
    return `You are a GTM (Go-To-Market) and growth strategy expert. Analyze the following GTM assessment data and provide a comprehensive growth evaluation.

GROWTH MODE: ${growthMode}

INTAKE DATA:
${JSON.stringify(intakeData, null, 2)}

Your analysis must cover these 15 GTM areas:
1. Ideal Customer Profile
2. Buying Trigger Analysis
3. Customer Discovery Process
4. Distribution Access
5. Revenue Model
6. Pricing Hypothesis
7. Sales Motion
8. Time-to-Value
9. Retention Logic
10. Competitive Edge
11. Channel Strategy
12. CAC Estimate
13. Growth Target
14. GTM Capital
15. Scale Intent

Provide analysis in this exact JSON format:

{
  "executive_summary": {
    "growth_maturity_tier": "Structured Growth Engine|Early but Sound|Fragile Growth Structure|High GTM Risk",
    "action_directive": "Scale Aggressively|Scale Cautiously|Optimize Before Scaling|Pivot Strategy",
    "growth_risk_level": "Low|Moderate|High",
    "action_summary": "Brief strategic summary"
  },
  "reasoning_trace": {
    "stage_1_customer": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_2_trigger": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_3_discovery": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_4_distribution": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_5_revenue": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_6_pricing": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_7_sales": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_8_value": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_9_retention": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_10_competitive": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_11_channel": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_12_economics": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_13_growth": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_14_capital": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    },
    "stage_15_scale": {
      "classification": "Strong|Moderate|Weak",
      "reasoning": "Detailed analysis"
    }
  },
  "scoring_audit": {
    "base_score": 0-100,
    "pillar_scores": {
      "customer_clarity": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "market_timing": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "distribution_feasibility": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "revenue_model": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "pricing_strategy": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "sales_efficiency": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "retention_potential": {
        "score": 0-20,
        "reasoning": "Analysis"
      },
      "competitive_advantage": {
        "score": 0-20,
        "reasoning": "Analysis"
      }
    },
    "final_score": 0-100,
    "risk_penalty": 0-20,
    "maturity_boost": 0-10
  },
  "growth_confidence": {
    "overall": "low|moderate|high",
    "customer_clarity": 0-100,
    "market_timing": 0-100,
    "distribution_feasibility": 0-100,
    "revenue_model": 0-100,
    "pricing_strategy": 0-100,
    "sales_efficiency": 0-100,
    "retention_potential": 0-100,
    "competitive_advantage": 0-100
  }
}

SCORING LOGIC:
- Base score: Average of all pillar scores (0-20 each)
- Final score: Base score - risk_penalty + maturity_boost
- Each pillar: Evaluate strength and viability
- Risk penalty: Major red flags (0-20 points)
- Maturity boost: Strong fundamentals (0-10 points)
- Growth confidence: Overall assessment confidence

Return ONLY the JSON response, no explanations.`;
  }

  /**
   * Build Phase 3 intake prompt
   * @param {Array} messages - Chat messages
   * @returns {string} - Complete prompt for AI
   */
  buildPhase3IntakePrompt(messages) {
    const conversation = messages.map(msg => 
      `${msg.role === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.content}`
    ).join('\n\n');

    return `You are a Venture GTM & Growth Intelligence Engine conducting a structured assessment across 15 critical areas. Your goal is to collect comprehensive information to design a realistic growth blueprint. Follow the exact question structure and adaptive follow-up rules provided.

CONVERSATION HISTORY:
${conversation}

PHASE 3 — CORE GTM & GROWTH INTAKE QUESTIONS
(Required Before Designing Growth Blueprint)

1️⃣ Ideal Customer Definition
Q1: Who exactly is your primary customer for the first 6–12 months?
Require:
Role / persona
Industry / niche
Geography
Company size (if B2B)
Income band (if B2C)

2️⃣ Buying Trigger
Q2: What specific event or condition makes this customer urgently need your solution?
Examples:
Revenue loss
Regulatory change
Operational bottleneck
Social pressure

3️⃣ Customer Discovery Status
Q3: Have you directly spoken to potential customers about this problem?
Options:
No
1–5 interviews
5–20 interviews
20+ interviews
Pilot users

4️⃣ Distribution Advantage
Q4: Do you already have access to your first 100 potential users?
Options:
Yes, owned audience
Yes, community/network
Yes, partnerships
No direct access

5️⃣ Revenue Model Clarity
Q5: What is your initial monetization model?
Options:
Subscription
Transaction fee
Marketplace take rate
Ads
One-time purchase
Hybrid

6️⃣ Pricing Hypothesis
Q6: What is your expected price point or revenue per customer?
Require:
Approximate value
Monthly / annual / per transaction

7️⃣ Expected Sales Motion
Q7: How do you expect customers to buy?
Options:
Self-serve
Demo-led
Enterprise sales
Community conversion
Outbound prospecting

8️⃣ Time-to-Value Expectation
Q8: How long after signup should a user experience meaningful value?
Options:
Immediate
Within 1 day
Within 1 week
Longer onboarding

9️⃣ Retention Assumption
Q9: Why will customers continue using this product beyond the first month?
Open text required.

🔟 Competitive Differentiation
Q10: Why would a customer choose you over existing alternatives?
Require:
Specific differentiation
Structural advantage (price, speed, quality, network, etc.)

1️⃣1️⃣ Channel Hypothesis
Q11: Which 2–3 channels do you believe will drive early growth?
Require ranked list.

1️⃣2️⃣ CAC Expectation
Q12: What do you believe it will cost to acquire one customer?
Optional estimate.

1️⃣3️⃣ Growth Target Ambition
Q13: What milestone defines early growth success?
Examples:
1,000 users
$10k MRR
10 enterprise clients
Market dominance in niche

1️⃣4️⃣ Capital Available for GTM
Q14: How much capital are you willing to deploy for marketing and growth in the first 6 months?
Require:
Budget range

1️⃣5️⃣ Scale Intent
Q15: Are you optimizing for:
Profitability first
Sustainable growth
Aggressive venture scale
Acquisition exit

PHASE 3 — ADAPTIVE FOLLOW-UP RULES
Venture GTM Intelligence Engine
Triggers based on:
Weak ICP clarity
Unrealistic CAC/LTV assumptions
Channel overconfidence
Fragile retention logic
Capital vs scale mismatch
Revenue ambition vs funnel mismatch

Max total follow-ups: 10
Max per section: 2

1️⃣ ICP CLARITY RULES
🔴 Trigger: ICP Too Broad
If user defines segment vaguely (e.g., "SMEs", "young people", "businesses")
Follow-Up: "What specific subgroup within this segment feels the pain most intensely?"

🔴 Trigger: No Buying Authority Clarity (B2B)
Follow-Up: "Who signs off on budget for this solution?"

2️⃣ BUYING TRIGGER RULES
🔴 Trigger: Trigger is Emotional but Not Financial
Follow-Up: "What financial or operational loss occurs if this problem is not solved?"

3️⃣ CUSTOMER DISCOVERY RULES
🔴 Trigger: 0–5 interviews
Follow-Up: "What assumption about your customer remains untested?"

4️⃣ DISTRIBUTION ADVANTAGE RULES
🔴 Trigger: No Distribution Access
Follow-Up: "What is your fastest path to your first 10 users?"

5️⃣ PRICING & REVENUE RULES
🔴 Trigger: Price Undefined
Follow-Up: "What would solving this problem be worth to your customer annually?"

🔴 Trigger: Low Price + High Acquisition Cost Channel
Follow-Up: "How many months must a customer stay for CAC to be recovered?"

6️⃣ SALES MOTION RULES
🔴 Trigger: Self-Serve + Complex Product
Follow-Up: "Can your product deliver value without guided onboarding?"

🔴 Trigger: Enterprise Sales + Low Capital
Follow-Up: "Do you have capacity for long sales cycles?"

7️⃣ RETENTION LOGIC RULES
🔴 Trigger: Weak Retention Explanation
If answer generic ("It's useful", "It saves time")
Follow-Up: "What recurring event forces customers to return?"

8️⃣ CHANNEL HYPOTHESIS RULES
🔴 Trigger: Channel Choice Misaligned with ICP
Example: Enterprise B2B + TikTok organic
Follow-Up: "Where does your ICP actively search for solutions?"

🔴 Trigger: All Channels Paid + Low Capital
Follow-Up: "What organic or partnership channels can reduce CAC?"

9️⃣ CAC EXPECTATION RULES
🔴 Trigger: Unrealistically Low CAC
Follow-Up: "What benchmark are you using for this CAC estimate?"

🟢 SCALE AMBITION RULES
🔴 Trigger: Aggressive Scale + No Retention Evidence
Follow-Up: "What retention metric will validate scale readiness?"

🧠 FOLLOW-UP LIMIT CONTROL
System Rules:
Stop once clarity threshold achieved
Max 2 per section
Max 10 total
Do not repeat theme

COMPLETION SIGNAL:
When you've gathered sufficient information across all 15 areas and any necessary follow-ups, end your response with:
<INTAKE_COMPLETE>{"ideal_customer":"...","buying_trigger":"...","customer_discovery":"...","distribution_access":"...","revenue_model":"...","pricing_hypothesis":"...","sales_motion":"...","time_to_value":"...","retention_logic":"...","competitive_edge":"...","channel_strategy":"...","cac_estimate":"...","growth_target":"...","gtm_capital":"...","scale_intent":"..."}</INTAKE_COMPLETE>

FORMATTING EXAMPLE:
Instead of: "Great, let's get started on laying the foundation for a robust go-to-market strategy. We'll begin by defining your core customer. Who exactly is your ideal customer? Please describe them in detail, including their industry, company size (revenue/employees), typical role/title, and any key demographics or psychographics."

Use: "Great, let's get started on laying the foundation for a robust go-to-market strategy. We'll begin by defining your core customer.

Who exactly is your ideal customer? 

Please describe them in detail, including their industry, company size (revenue/employees), typical role/title, and any key demographics or psychographics."

COMMUNICATION STYLE:
• Venture GTM Intelligence Engine - analytical and strategic
• Growth-focused and data-driven
• One question at a time with adaptive follow-ups
• Never repeat questions
• Use proper grammar and paragraph breaks for readability
• Focus on GTM and growth strategy assessment with rigor
• Format questions with clear line breaks between context and the actual question
• Apply adaptive follow-up rules based on response quality
• Challenge weak assumptions and unrealistic projections
• Maintain portfolio growth advisor tone - analytical but supportive

COMPLETION SIGNAL:
When you've gathered sufficient information across all 15 areas, end your response with:
<INTAKE_COMPLETE>{"ideal_customer":"...","buying_trigger":"...","customer_discovery":"...","distribution_access":"...","revenue_model":"...","pricing_hypothesis":"...","sales_motion":"...","time_to_value":"...","retention_logic":"...","competitive_edge":"...","channel_strategy":"...","cac_estimate":"...","growth_target":"...","gtm_capital":"...","scale_intent":"..."}</INTAKE_COMPLETE>`;
  }

  /**
   * Parse Phase 3 AI response
   * @param {string} response - AI response text
   * @returns {Object} - Parsed response data
   */
  parsePhase3Response(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Calculate final score if not provided
      if (!parsed.scoring_audit.final_score && parsed.scoring_audit.base_score) {
        const pillarScores = Object.values(parsed.scoring_audit.pillar_scores);
        const avgScore = pillarScores.reduce((sum, p) => sum + p.score, 0) / pillarScores.length;
        const baseScore = parsed.scoring_audit.base_score || avgScore * 5;
        const riskPenalty = parsed.scoring_audit.risk_penalty || 0;
        const maturityBoost = parsed.scoring_audit.maturity_boost || 0;
        
        parsed.scoring_audit.final_score = Math.max(0, Math.min(100, baseScore - riskPenalty + maturityBoost));
      }

      // Determine classification based on final score
      const finalScore = parsed.scoring_audit.final_score;
      if (finalScore >= 80) {
        parsed.growth_classification = "Structured Growth Engine";
      } else if (finalScore >= 70) {
        parsed.growth_classification = "Early but Sound";
      } else if (finalScore >= 60) {
        parsed.growth_classification = "Fragile Growth Structure";
      } else {
        parsed.growth_classification = "High GTM Risk";
      }

      return {
        growth_score: parsed.scoring_audit.final_score,
        growth_classification: parsed.growth_classification,
        phase3_analysis: parsed
      };
    } catch (error) {
      console.error('Error parsing Phase 3 response:', error);
      throw new Error('Failed to parse AI response');
    }
  }
}
 
module.exports = new GeminiService();
