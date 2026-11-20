
const mongoose = require("mongoose");

const outboxSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ["PAYOUT_REQUESTED"],
    required: true
  },

  aggregateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Withdrawal",
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "PROCESSING", "COMPLETED"],
    default: "PENDING"
  },

  attempts: {
    type: Number,
    default: 0
  },

  nextRetryAt: {
    type: Date,
    default: Date.now
  },

  lastError: {
    type: String,
    default: null
  }

}, { timestamps: true });

outboxSchema.index({ status: 1, nextRetryAt: 1 });

outboxSchema.index(
  { eventType: 1, aggregateId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Outbox", outboxSchema);
