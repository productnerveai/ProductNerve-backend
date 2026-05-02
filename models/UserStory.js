const mongoose = require('mongoose');

const userStorySchema = new mongoose.Schema({
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
  // Step 0: Product Context
  product_context: {
    product_name: {
      type: String,
      trim: true,
      required: [true, 'Product name is required']
    },
    product_description: {
      type: String,
      trim: true,
      required: [true, 'Product description is required']
    },
    target_user: {
      type: String,
      trim: true,
      required: [true, 'Target user is required']
    },
    business_goal: {
      type: String,
      trim: true,
      required: [true, 'Business goal is required']
    },
    feature_name: {
      type: String,
      trim: true,
      required: [true, 'Feature name is required']
    },
    feature_description: {
      type: String,
      trim: true,
      required: [true, 'Feature description is required']
    }
  },
  // Step 1: Module Definition
  module_definition: {
    module_name: {
      type: String,
      trim: true,
      default: ''
    },
    module_description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 2: Epic Definition
  epic_definition: {
    epic_title: {
      type: String,
      trim: true,
      default: ''
    },
    epic_description: {
      type: String,
      trim: true,
      default: ''
    },
    epic_objective: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 3: Story Definition
  story_definition: {
    user_persona: {
      type: String,
      trim: true,
      default: ''
    },
    user_need: {
      type: String,
      trim: true,
      default: ''
    },
    user_goal: {
      type: String,
      trim: true,
      default: ''
    },
    business_value: {
      type: String,
      trim: true,
      default: ''
    },
    feature_trigger: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 4: User Flow
  user_flow: {
    entry_point: {
      type: String,
      trim: true,
      default: ''
    },
    user_actions: {
      type: String,
      trim: true,
      default: ''
    },
    system_responses: {
      type: String,
      trim: true,
      default: ''
    },
    exit_point: {
      type: String,
      trim: true,
      default: ''
    }
  },
  // Step 5: Preconditions
  preconditions: [{
    type: String,
    trim: true
  }],
  // Step 6: Post Conditions
  postconditions: [{
    type: String,
    trim: true
  }],
  // Step 7: Dependencies
  dependencies: [{
    type: String,
    trim: true
  }],
  // Step 8: Design Considerations
  design_considerations: [{
    type: String,
    trim: true
  }],
  // Step 9: Technical Considerations
  technical_considerations: [{
    type: String,
    trim: true
  }],
  // Step 10: Definition of Done
  definition_of_done: [{
    type: String,
    trim: true
  }],
  // AI Generated Report
  report: {
    summary: String,
    stories: [{
      module: String,
      epic: String,
      storyId: String,
      title: String,
      why: String,
      story: String,
      precondition: String,
      userFlow: String,
      postCondition: String,
      acceptanceCriteria: {
        happy: String,
        unhappy: String
      },
      dependencies: String,
      designConsideration: String,
      technicalConsiderations: String,
      definitionOfDone: String
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
userStorySchema.index({ user_id: 1, workspace_id: 1 });
userStorySchema.index({ project_id: 1 });
userStorySchema.index({ status: 1 });

module.exports = mongoose.model('UserStory', userStorySchema);
