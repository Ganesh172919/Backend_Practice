/**
 * File Overview: Schema for refresh token persistence.
 * WHY: Supports secure token rotation, session continuity, and logout revocation.
 * WHAT: Stores refresh token value, owner, and expiration metadata.
 * HOW: Auth routes issue and validate these records during refresh workflows.
 */
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// TTL index — MongoDB auto-deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
