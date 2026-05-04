const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  workspace_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a project name'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['paused', 'active', 'killed', 'scaled'],
    default: 'active'
  },
  stage: {
    type: String,
    enum: ['planning', 'ideation', 'validation', 'execution', 'growth'],
    default: 'planning'
  },
  overall_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Phase 1: Product Context
  phase1_data: {
    product: {
      type: String,
      trim: true
    },
    core_problem: {
      type: String,
      trim: true
    },
    who_experiences: {
      type: String,
      trim: true
    },
    industries_affected: [{
      type: String,
      trim: true
    }]
  },
  phase1_status: {
    type: String,
    enum: ['not_started', 'in_progress', 'complete', 'locked'],
    default: 'not_started'
  },
  phase1_score: {
    type: Number,
    min: 0,
    max: 100
  },
  phase1_classification: {
    type: String,
    enum: ['Strategic Opportunity', 'Conditional Build', 'High Risk Pivot', 'Kill', 'High Potential', 'Moderate Potential', 'Early Stage', 'Needs Refinement']
  },
  phase1_analysis: {
    scoring_layers: {
      problem_validation: {
        score: Number,
        analysis: String,
        strengths: [String],
        weaknesses: [String],
        recommendations: [String]
      },
      solution_fit: {
        score: Number,
        analysis: String,
        strengths: [String],
        weaknesses: [String],
        recommendations: [String]
      },
      market_opportunity: {
        score: Number,
        analysis: String,
        strengths: [String],
        weaknesses: [String],
        recommendations: [String]
      },
      founder_market_fit: {
        score: Number,
        analysis: String,
        strengths: [String],
        weaknesses: [String],
        recommendations: [String]
      },
      business_model: {
        score: Number,
        analysis: String,
        strengths: [String],
        weaknesses: [String],
        recommendations: [String]
      }
    },
    risk_flags: [{
      flag: String,
      severity: String,
      description: String,
      mitigation: String
    }],
    alternative_routes: [{
      route: String,
      description: String,
      rationale: String
    }],
    strategic_insights: {
      overall_assessment: String,
      key_strengths: [String],
      critical_risks: [String],
      next_steps: [String],
      validation_priorities: [String]
    },
    // Detailed analysis sections for dashboard
    executive_summary: {
      viability_score: Number,
      classification: String,
      confidence_index: Number,
      validation_maturity: String,
      strategic_insight: String
    },
    problem_intensity: {
      score: Number,
      intensity_level: String,
      spending_evidence: String,
      coping_cost: String,
      urgency_index: String,
      analysis: String
    },
    market_opportunity: {
      score: Number,
      segment_definition: String,
      market_size_tier: String,
      purchasing_power: String,
      infrastructure_ready: Boolean,
      timing_window: String,
      insight: String
    },
    buyer_economics: {
      score: Number,
      revenue_model_clarity: String,
      unit_economics_tier: String,
      capital_intensity: String,
      cac_assumptions: String,
      payback_assumptions: String,
      interpretation: String
    },
    competitive_positioning: {
      score: Number,
      direct_competitors: String,
      substitute_alternatives: String,
      differentiation_clarity: String,
      switching_friction: String,
      platform_dependency: String,
      insight: String
    },
    founder_advantage: {
      score: Number,
      domain_leverage: String,
      distribution_access: String,
      talent_access: String,
      capital_access: String,
      network_leverage: String,
      assessment: String
    },
    assumption_map: {
      market_assumptions: [{
        assumption: String,
        status: String,
        validation: String
      }],
      behavioral_assumptions: [{
        assumption: String,
        status: String,
        validation: String
      }],
      economic_assumptions: [{
        assumption: String,
        status: String,
        validation: String
      }],
      execution_assumptions: [{
        assumption: String,
        status: String,
        validation: String
      }]
    },
    risk_clusters: {
      market_risk: {
        severity: String,
        explanation: String,
        mitigation: String
      },
      economic_risk: {
        severity: String,
        explanation: String,
        mitigation: String
      },
      competitive_risk: {
        severity: String,
        explanation: String,
        mitigation: String
      },
      execution_risk: {
        severity: String,
        explanation: String,
        mitigation: String
      }
    },
    strategic_routes: {
      recommended_route: {
        route: String,
        why_improves: String,
        changes_required: String
      },
      alternative_routes: [{
        route: String,
        description: String
      }]
    },
    validation_gaps: {
      critical_questions: [String],
      missing_data: [String],
      required_experiments: [String]
    },
    build_readiness: {
      signal: String,
      confidence_score: Number,
      next_steps: [String]
    },
    confidence_breakdown: {
      evidence_strength: Number,
      assumption_clarity: Number,
      market_clarity: Number,
      economic_clarity: Number,
      competitive_realism: Number
    },
    ai_reasoning_trace: {
      stage2_problem_strength: {
        tier: String
      },
      stage3_market_structure: {
        tier: String
      },
      stage4_economic_viability: {
        tier: String
      },
      stage5_competitive_gravity: {
        tier: String
      },
      stage6_founder_leverage: {
        tier: String
      },
      stage7_assumption_risk: {
        assumption_risk_density: Number,
        high_risk_count: Number,
        total_assumptions: Number
      },
      stage8_validation_maturity: {
        maturity: String
      }
    },
    scoring_decisions: {
      tier_modifiers_applied: String,
      weighted_raw: Number,
      viability_final: Number
    },
    generated_at: Date,
    ai_model: String
  },
  // Phase 2: Segment Identification
  phase2_data: {
    segment_name: {
      type: String,
      trim: true
    },
    job_role: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    company_size: {
      type: String,
      trim: true
    },
    geography: {
      type: String,
      trim: true
    },
    income_level: {
      type: String,
      trim: true
    },
    pain_profile: {
      top_problems: [{
        type: String,
        trim: true
      }],
      current_workaround: {
        type: String,
        trim: true
      },
      cost_of_problem: {
        type: String,
        trim: true
      },
      urgency_level: {
        type: String,
        trim: true
      },
      emotional_trigger: {
        type: String,
        trim: true
      }
    },
    buying_behavior: {
      decision_maker: {
        type: String,
        trim: true
      },
      budget_authority: {
        type: String,
        trim: true
      },
      buying_triggers: {
        type: String,
        trim: true
      },
      buying_frequency: {
        type: String,
        trim: true
      },
      price_sensitivity: {
        type: String,
        trim: true
      }
    },
    channel_discovery: {
      communities: [{
        type: String,
        trim: true
      }],
      social_platforms: [{
        type: String,
        trim: true
      }],
      search_behavior: {
        type: String,
        trim: true
      },
      industry_events: [{
        type: String,
        trim: true
      }],
      referrals: [{
        type: String,
        trim: true
      }]
    }
  },
  phase2_status: {
    type: String,
    enum: ['not_started', 'in_progress', 'complete', 'locked'],
    default: 'not_started'
  },
  // Phase 2: Execution Capacity Analysis
  phase2_execution_data: {
    intake_data: {
      execution_commitment: {
        type: String,
        trim: true
      },
      capital_readiness: {
        type: String,
        trim: true
      },
      team_access: [{
        type: String,
        trim: true
      }],
      technical_complexity: {
        type: String,
        trim: true
      },
      speed_stability_preference: {
        type: String,
        trim: true
      },
      validation_objective: {
        type: String,
        trim: true
      },
      risk_appetite: {
        type: String,
        trim: true
      },
      operational_capacity: {
        type: String,
        trim: true
      },
      revenue_urgency: {
        type: String,
        trim: true
      },
      scalability_intent: {
        type: String,
        trim: true
      },
      follow_up_responses: {
        recommended_execution_mode: {
          type: String,
          trim: true
        }
      }
    },
    execution_mode: {
      type: String,
      enum: ['ai_development', 'lean_product', 'structured_startup', 'venture_backed'],
      trim: true
    },
    execution_score: {
      type: Number,
      min: 0,
      max: 100
    },
    execution_classification: {
      type: String,
      trim: true
    },
    phase2_analysis: {
      executive_summary: {
        execution_maturity_tier: {
          type: String,
          trim: true
        },
        team_composition: {
          type: String,
          trim: true
        },
        capital_efficiency: {
          type: String,
          trim: true
        },
        speed_vs_stability: {
          type: String,
          trim: true
        },
        primary_execution_constraint: {
          type: String,
          trim: true
        },
        strategic_insight: {
          type: String,
          trim: true
        },
        action_directive: {
          type: String,
          trim: true
        },
        execution_risk_level: {
          type: String,
          enum: ['low', 'moderate', 'high'],
          trim: true
        },
        action_summary: {
          type: String,
          trim: true
        }
      },
      reasoning_trace: {
        stage_2_team: {
          classification: String,
          reasoning: String
        },
        stage_3_capital: {
          classification: String,
          reasoning: String
        },
        stage_4_complexity: {
          classification: String,
          reasoning: String
        },
        stage_5_speed: {
          classification: String,
          reasoning: String
        },
        stage_6_validation: {
          classification: String,
          reasoning: String
        },
        stage_7_capacity: {
          classification: String,
          reasoning: String
        },
        stage_8_urgency: {
          classification: String,
          reasoning: String
        },
        stage_9_scale: {
          classification: String,
          reasoning: String
        },
        stage_10_commitment: {
          classification: String,
          reasoning: String
        },
        stage_11_risks: {
          type: Map,
          of: String
        },
        stage_11_constraint: {
          type: String,
          trim: true
        }
      },
      scoring_audit: {
        base_score: Number,
        pillar_scores: {
          team_composition: {
            score: Number,
            reasoning: String
          },
          capital_efficiency: {
            score: Number,
            reasoning: String
          },
          technical_complexity: {
            score: Number,
            reasoning: String
          },
          speed_vs_stability: {
            score: Number,
            reasoning: String
          },
          validation_approach: {
            score: Number,
            reasoning: String
          },
          operational_capacity: {
            score: Number,
            reasoning: String
          },
          execution_commitment: {
            score: Number,
            reasoning: String
          }
        },
        final_score: Number
      },
      execution_confidence: {
        overall: {
          type: String,
          enum: ['low', 'moderate', 'high'],
          trim: true
        },
        team_clarity: {
          type: Number,
          min: 1,
          max: 10
        },
        capital_adequacy: {
          type: Number,
          min: 1,
          max: 10
        },
        technical_feasibility: {
          type: Number,
          min: 1,
          max: 10
        },
        speed_realism: {
          type: Number,
          min: 1,
          max: 10
        },
        validation_rigor: {
          type: Number,
          min: 1,
          max: 10
        },
        operational_readiness: {
          type: Number,
          min: 1,
          max: 10
        },
        commitment_level: {
          type: Number,
          min: 1,
          max: 10
        },
        reasoning: {
          type: String,
          trim: true
        }
      },
      execution_architecture: {
        team_structure: {
          core_team: [String],
          key_hires: [String],
          team_gaps: [String]
        },
        capital_plan: {
          current_funding: String,
          runway: String,
          burn_rate: String,
          next_funding: String,
          allocation: {
            type: Map,
            of: String
          }
        },
        development_approach: {
          methodology: String,
          tech_stack: String,
          deployment: String,
          milestones: [{
            title: String,
            timeline: String,
            resources: String
          }]
        },
        risk_mitigation: {
          primary_risks: [{
            risk: String,
            probability: String,
            impact: String,
            mitigation: String
          }],
          contingency_plans: [{
            scenario: String,
            response: String
          }]
        }
      },
      execution_roadmap: {
        immediate_actions: [{
          action: String,
          priority: String,
          timeline: String,
          owner: String
        }],
        critical_milestones: [{
          milestone: String,
          success_criteria: String,
          deadline: String,
          dependencies: [String]
        }],
        resource_allocation: {
          team_allocation: {
            type: Map,
            of: String
          },
          capital_allocation: {
            type: Map,
            of: String
          },
          timeline_allocation: {
            type: Map,
            of: String
          }
        }
      }
    }
  },
  // Phase 3: Pain Profile
  phase3_data: {
    pain_points: [{
      problem: {
        type: String,
        trim: true
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      frequency: {
        type: String,
        trim: true
      },
      impact: {
        type: String,
        trim: true
      }
    }],
    solution_gaps: [{
      current_solution: {
        type: String,
        trim: true
      },
      gap_description: {
        type: String,
        trim: true
      },
      opportunity_score: {
        type: Number,
        min: 0,
        max: 10
      }
    }],
    market_insights: {
      market_size: {
        type: String,
        trim: true
      },
      growth_rate: {
        type: String,
        trim: true
      },
      competition_level: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }
  },
  phase3_status: {
    type: String,
    enum: ['not_started', 'in_progress', 'complete', 'locked'],
    default: 'not_started'
  },
  // Phase 3: GTM & Growth Analysis
  phase3_growth_data: {
    intake_data: {
      ideal_customer: {
        type: String,
        trim: true
      },
      buying_trigger: {
        type: String,
        trim: true
      },
      customer_discovery: {
        type: String,
        trim: true
      },
      distribution_access: {
        type: String,
        trim: true
      },
      revenue_model: {
        type: String,
        trim: true
      },
      pricing_hypothesis: {
        type: String,
        trim: true
      },
      sales_motion: {
        type: String,
        trim: true
      },
      time_to_value: {
        type: String,
        trim: true
      },
      retention_logic: {
        type: String,
        trim: true
      },
      competitive_edge: {
        type: String,
        trim: true
      },
      channel_strategy: {
        type: String,
        trim: true
      },
      cac_estimate: {
        type: String,
        trim: true
      },
      growth_target: {
        type: String,
        trim: true
      },
      gtm_capital: {
        type: String,
        trim: true
      },
      scale_intent: {
        type: String,
        trim: true
      }
    },
    growth_mode: {
      type: String,
      trim: true
    },
    phase3_analysis: {
      executive_summary: {
        growth_maturity_tier: {
          type: String,
          trim: true
        },
        action_directive: {
          type: String,
          trim: true
        },
        growth_risk_level: {
          type: String,
          trim: true
        },
        action_summary: {
          type: String,
          trim: true
        }
      },
      reasoning_trace: {
        stage_1_customer: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_2_trigger: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_3_discovery: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_4_distribution: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_5_revenue: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_6_pricing: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_7_sales: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_8_value: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_9_retention: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_10_competitive: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_11_channel: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_12_economics: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_13_growth: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_14_capital: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        },
        stage_15_scale: {
          classification: {
            type: String,
            trim: true
          },
          reasoning: {
            type: String,
            trim: true
          }
        }
      },
      scoring_audit: {
        base_score: {
          type: Number
        },
        pillar_scores: {
          customer_clarity: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          market_timing: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          distribution_feasibility: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          revenue_model: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          pricing_strategy: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          sales_efficiency: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          retention_potential: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          },
          competitive_advantage: {
            score: {
              type: Number
            },
            reasoning: {
              type: String,
              trim: true
            }
          }
        },
        final_score: {
          type: Number
        },
        risk_penalty: {
          type: Number
        },
        maturity_boost: {
          type: Number
        }
      },
      growth_confidence: {
        overall: {
          type: String,
          enum: ['low', 'moderate', 'high']
        },
        customer_clarity: {
          type: Number
        },
        market_timing: {
          type: Number
        },
        distribution_feasibility: {
          type: Number
        },
        revenue_model: {
          type: Number
        },
        pricing_strategy: {
          type: Number
        },
        sales_efficiency: {
          type: Number
        },
        retention_potential: {
          type: Number
        },
        competitive_advantage: {
          type: Number
        }
      }
    }
  },
  // Phase 3 top-level fields
  growth_score: {
    type: Number
  },
  growth_classification: {
    type: String,
    trim: true
  },
  // RAG Folder for project knowledge base
  rag_folder: {
    files: [{
      filename: {
        type: String,
        required: true
      },
      original_name: {
        type: String,
        required: true
      },
      file_size: {
        type: Number,
        required: true
      },
      file_type: {
        type: String,
        required: true
      },
      upload_date: {
        type: Date,
        default: Date.now
      },
      file_url: {
        type: String,
        required: true
      },
      content_summary: {
        type: String,
        trim: true
      }
    }],
    total_size: {
      type: Number,
      default: 0
    },
    max_size_limit: {
      type: Number,
      default: 52428800 // 50MB in bytes
    },
    last_updated: {
      type: Date,
      default: Date.now
    }
  },
  // Project access control
  project_locked: {
    type: Boolean,
    default: false
  },
  project_unlocked_at: {
    type: Date
  },
  unlock_type: {
    type: String,
    enum: ['payment', 'subscription'],
    default: 'subscription'
  }
}, {
  timestamps: true
});

// Index for efficient queries
projectSchema.index({ workspace_id: 1, status: 1 });
projectSchema.index({ user_id: 1 });

module.exports = mongoose.model('Project', projectSchema);
