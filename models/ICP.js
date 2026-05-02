const mongoose = require('mongoose');

const icpSchema = new mongoose.Schema({
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
  product_context: {
    product: {
      type: String,
      trim: true,
      required: [true, 'Product description is required']
    },
    core_problem: {
      type: String,
      trim: true,
      required: [true, 'Core problem is required']
    },
    who_experiences: {
      type: String,
      trim: true,
      required: [true, 'Who experiences is required']
    },
    industries_affected: {
      type: String,
      trim: true,
      required: [true, 'Industries affected is required']
    }
  },
  segments: [{
    name: {
      type: String,
      trim: true,
      required: [true, 'Segment name is required']
    },
    job_role: {
      type: String,
      trim: true,
      required: [true, 'Job role is required']
    },
    industry: {
      type: String,
      trim: true,
      required: [true, 'Industry is required']
    },
    company_size: {
      type: String,
      trim: true,
      required: [true, 'Company size is required']
    },
    geography: {
      type: String,
      trim: true,
      required: [true, 'Geography is required']
    },
    income_level: {
      type: String,
      trim: true,
      required: [true, 'Income level is required']
    },
    pain_profile: {
      top_problems: [{
        type: String,
        trim: true,
        required: true
      }],
      current_workaround: {
        type: String,
        trim: true,
        required: [true, 'Current workaround is required']
      },
      cost_of_problem: {
        type: String,
        trim: true,
        required: [true, 'Cost of problem is required']
      },
      urgency_level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      emotional_trigger: {
        type: String,
        trim: true,
        required: [true, 'Emotional trigger is required']
      }
    },
    buying_behavior: {
      decision_maker: {
        type: String,
        trim: true,
        required: [true, 'Decision maker is required']
      },
      budget_authority: {
        type: String,
        trim: true,
        required: [true, 'Budget authority is required']
      },
      buying_triggers: {
        type: String,
        trim: true,
        required: [true, 'Buying triggers is required']
      },
      buying_frequency: {
        type: String,
        trim: true,
        required: [true, 'Buying frequency is required']
      },
      price_sensitivity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    },
    channel_discovery: {
      communities: {
        type: String,
        trim: true,
        required: [true, 'Communities is required']
      },
      social_platforms: {
        type: String,
        trim: true,
        required: [true, 'Social platforms is required']
      },
      search_behavior: {
        type: String,
        trim: true,
        required: [true, 'Search behavior is required']
      },
      industry_events: {
        type: String,
        default: ''
      },
      referrals: {
        type: String,
        default: ''
      }
    }
  }],
  report: {
    segments: [{
      name: String,
      pain_intensity_score: Number,
      purchase_probability: Number,
      revenue_potential: String,
      persona_summary: String,
      best_channels: [String],
      strategic_insights: String
    }],
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
icpSchema.index({ user_id: 1, workspace_id: 1 });
icpSchema.index({ project_id: 1 });
icpSchema.index({ status: 1 });

module.exports = mongoose.model('ICP', icpSchema);
