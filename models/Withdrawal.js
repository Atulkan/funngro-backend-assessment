
const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amountPaise: {
    type: Number,
    required: true,
    min: 1
  },

  idempotencyKey: {
    type: String,
    required: true
  },

  gatewayIdempotencyKey: {
    type: String,
    required: true,
    unique: true
  },

  status: {
    type: String,
    enum: [
      "PENDING",
      "PROCESSING",
      "SUCCESS",
      "FAILED",
      "UNKNOWN"
    ],
    default: "PENDING"
  },

  gatewayReference: {
    type: String,
    default: null
  }

}, { timestamps: true });

withdrawalSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
