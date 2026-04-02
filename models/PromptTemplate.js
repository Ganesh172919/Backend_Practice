/**
 * File Overview: Schema for overridable AI prompt templates.
 * WHY: Enables runtime prompt management without code deployments.
 * WHAT: Stores prompt key, versioning info, content, and activation flag.
 * HOW: Prompt catalog resolves defaults and database overrides by template key.
 */
const mongoose = require('mongoose');

const promptTemplateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  version: {
    type: String,
    required: true,
    default: 'v1',
  },
  description: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
