
const mongoose = require("mongoose");
const crypto = require("crypto");

const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Ledger = require("../models/Ledger");
const Outbox = require("../models/Outbox");

// Create withdrawal safely
async function createWithdrawal(userId, amountPaise, idempotencyKey) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("Invalid withdrawal amount");
  }

  if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new Error("Idempotency key is required");
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const existing = await Withdrawal.findOne({
        userId,
        idempotencyKey
      }).session(session);

      if (existing) {
        if (existing.amountPaise !== amountPaise) {
          throw new Error("Idempotency key reused with different amount");
        }

        result = existing;
        return;
      }

      // Atomically reserve wallet money
      const wallet = await Wallet.findOneAndUpdate(
        {
          userId,
          availableBalance: { $gte: amountPaise }
        },
        {
          $inc: {
            availableBalance: -amountPaise,
            reservedBalance: amountPaise
          }
        },
        { new: true, session }
      );

      if (!wallet) {
        throw new Error("Insufficient balance or wallet not found");
      }

      const [withdrawal] = await Withdrawal.create([{
        userId,
        amountPaise,
        idempotencyKey,
        gatewayIdempotencyKey: crypto.randomUUID(),
        status: "PENDING"
      }], { session });

      await Ledger.create([{
        userId,
        withdrawalId: withdrawal._id,
        amountPaise,
        type: "RESERVE",
        description: "Amount reserved for withdrawal"
      }], { session });

      // Save payout job in the same transaction
      await Outbox.create([{
        eventType: "PAYOUT_REQUESTED",
        aggregateId: withdrawal._id,
        status: "PENDING"
      }], { session });

      result = withdrawal;
    });

    return result;

  } catch (error) {
    if (error.code === 11000) {
      const existing = await Withdrawal.findOne({
        userId,
        idempotencyKey
      });

      if (existing) {
        if (existing.amountPaise !== amountPaise) {
          throw new Error("Idempotency key reused with different amount");
        }
        return existing;
      }
    }

    throw error;

  } finally {
    await session.endSession();
  }
}


// Update withdrawal after verified gateway result
async function updateWithdrawalStatus(withdrawalId, newStatus, gatewayReference = null) {
  const allowedStatuses = ["PROCESSING", "UNKNOWN", "SUCCESS", "FAILED"];

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error("Invalid withdrawal status");
  }

  if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
    throw new Error("Invalid withdrawal ID");
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const withdrawal = await Withdrawal.findById(withdrawalId)
        .session(session);

      if (!withdrawal) {
        throw new Error("Withdrawal not found");
      }

      if (withdrawal.status === newStatus) {
        result = withdrawal;
        return;
      }

      const pendingStatuses = ["PENDING", "PROCESSING", "UNKNOWN"];

      if (!pendingStatuses.includes(withdrawal.status)) {
        throw new Error("Withdrawal already finalized");
      }

      if (
        newStatus === "PROCESSING" &&
        withdrawal.status !== "PENDING"
      ) {
        throw new Error("Invalid status transition");
      }

      // Change status conditionally to prevent duplicate finalization
      const updated = await Withdrawal.findOneAndUpdate(
        {
          _id: withdrawalId,
          status: withdrawal.status
        },
        {
          $set: {
            status: newStatus,
            ...(gatewayReference ? { gatewayReference } : {})
          }
        },
        { new: true, session }
      );

      if (!updated) {
        throw new Error("Concurrent status update detected");
      }

      // Unknown means outcome is not confirmed; keep money reserved
      if (newStatus === "UNKNOWN" || newStatus === "PROCESSING") {
        result = updated;
        return;
      }

      const walletUpdate = newStatus === "SUCCESS"
        ? {
            $inc: {
              reservedBalance: -withdrawal.amountPaise
            }
          }
        : {
            $inc: {
              reservedBalance: -withdrawal.amountPaise,
              availableBalance: withdrawal.amountPaise
            }
          };

      const wallet = await Wallet.findOneAndUpdate(
        {
          userId: withdrawal.userId,
          reservedBalance: { $gte: withdrawal.amountPaise }
        },
        walletUpdate,
        { new: true, session }
      );

      if (!wallet) {
        throw new Error("Reserved balance not found");
      }

      await Ledger.create([{
        userId: withdrawal.userId,
        withdrawalId: withdrawal._id,
        amountPaise: withdrawal.amountPaise,
        type: newStatus === "SUCCESS" ? "PAYOUT" : "RELEASE",
        description: newStatus === "SUCCESS"
          ? "Withdrawal successfully paid"
          : "Confirmed failed withdrawal released"
      }], { session });

      result = updated;
    });

    return result;

  } finally {
    await session.endSession();
  }
}

module.exports = {
  createWithdrawal,
  updateWithdrawalStatus
};
