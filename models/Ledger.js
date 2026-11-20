
const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },

  withdrawalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Withdrawal",
    required: true
  },

  amountPaise: {
    type: Number,
    required: true,
    min: 1
  },

  type: {
    type: String,
    enum: ["RESERVE", "RELEASE", "PAYOUT"],
    required: true
  },

  description: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Fast user transaction history
ledgerSchema.index({
  userId: 1,
  createdAt: -1,
  _id: -1
});

// Prevent duplicate ledger entries for same withdrawal and event
ledgerSchema.index(
  { withdrawalId: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model("Ledger", ledgerSchema);
