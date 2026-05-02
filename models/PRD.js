const mongoose = require('mongoose');

const prdSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspace_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  prd_type: {
    type: String,
    enum: ['simple', 'growth', 'technical'],
    default: 'simple'
  },
  // Step 1: Product Context
  product_context: {
    product_name: {
      type: String,
      trim: true,
      default: ''
    },
    product_description: {
      type: String,
      trim: true,
      default: ''
    },
    problem_solved: {
      type: String,
      trim: true,
      default: ''
    },
    target_users: {
      type: String,
      trim: true,
      default: ''
    },
    business_goal: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 2: Strategic Context
  strategic_context: {
    market_opportunity: {
      type: String,
      trim: true,
      default: ''
    },
    key_assumptions: {
      type: String,
      trim: true,
      default: ''
    },
    constraints: {
      type: String,
      trim: true,
      default: ''
    },
    risks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 3: Product Definition
  product_definition: {
    core_features: {
      type: String,
      trim: true,
      default: ''
    },
    user_flows: {
      type: String,
      trim: true,
      default: ''
    },
    value_prop: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 4: Execution Context
  execution_context: {
    timeline: {
      type: String,
      trim: true,
      default: ''
    },
    team_size: {
      type: String,
      trim: true,
      default: ''
    },
    technical_complexity: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // AI Generated Report
  report: {
    // Simple PRD sections
    productInformation: String,
    goalsAndObjectives: String,
    targetUsers: String,
    problemStatement: String,
    valueProposition: String,
    assumptions: String,
    constraints: String,
    backgroundAndStrategicFit: String,
    productRoadmap: String,
    scope: String,
    coreFeatures: String,
    releaseCriteria: String,
    successMetrics: String,
    dependencies: String,
    risks: String,
    exclusions: String,
    strategicNote: String,
    
    // Growth PRD sections
    growthGoals: String,
    icpDefinition: String,
    acquisitionChannels: String,
    conversionStrategy: String,
    retentionStrategy: String,
    monetizationModel: String,
    growthAssumptions: String,
    growthConstraints: String,
    strategicGrowthFit: String,
    growthRoadmap: String,
    userLifecycleScope: String,
    growthFeatures: String,
    technicalGrowthRequirements: String,
    experimentationPlan: String,
    growthRisks: String,
    
    // Technical PRD sections
    technicalObjectives: String,
    coreProductFeatures: String,
    technicalSpecifications: String,
    coreTechnicalComponents: String,
    apiArchitecture: String,
    dataArchitecture: String,
    featureLevelTechnicalConsiderations: String,
    systemArchitecturePrinciples: String,
    highLevelArchitecture: String,
    securityModel: String,
    performanceTargets: String,
    scalabilityStrategy: String,
    integrationRequirements: String,
    
    // Common fields
    generated_at: Date,
    ai_model: String
  },
  status: {
    type: String,
    enum: ['draft', 'complete'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Index for efficient queries
prdSchema.index({ user_id: 1, workspace_id: 1 });
prdSchema.index({ project_id: 1 });
prdSchema.index({ status: 1 });
prdSchema.index({ prd_type: 1 });

module.exports = mongoose.model('PRD', prdSchema);
