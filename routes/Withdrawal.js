
const express = require("express");
const router = express.Router();

const { createWithdrawal } = require("../services/payoutServices");

// Production route
// Assumption: authentication middleware sets req.user
router.post("/withdraw", async (req, res) => {
  try {
    const userId = req.user.id;
    const { amountPaise } = req.body;
    const idempotencyKey = req.get("Idempotency-Key");

    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({
        error: "Invalid amountPaise"
      });
    }

    if (!idempotencyKey || !idempotencyKey.trim()) {
      return res.status(400).json({
        error: "Idempotency-Key header is required"
      });
    }

    const withdrawal = await createWithdrawal(
      userId,
      amountPaise,
      idempotencyKey
    );

    return res.status(202).json({
      message: "Withdrawal request accepted",
      withdrawal
    });

  } catch (error) {
    if (error.message === "Insufficient balance or wallet not found") {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === "Idempotency key reused with different amount") {
      return res.status(409).json({ error: error.message });
    }

    console.error("Withdrawal error:", error);

    return res.status(500).json({
      error: "Unable to process withdrawal"
    });
  }
});

module.exports = router;
