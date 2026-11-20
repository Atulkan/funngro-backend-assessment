
# Part 1 - Background Payout Worker

## Why a Worker?

The API should not directly depend on the payment gateway response. It first reserves the wallet amount and saves a durable payout event in the Outbox collection.

A background worker processes the event separately.

## Worker Flow

1. Fetch a pending Outbox event.
2. Load the related Withdrawal.
3. Mark the withdrawal as PROCESSING.
4. Call the RazorpayX Payout API outside the MongoDB transaction.
5. Send the persisted gatewayIdempotencyKey with every retry.
6. If the gateway confirms success, mark withdrawal SUCCESS.
7. If the gateway confirms failure, mark withdrawal FAILED and release reserved balance.
8. If the request times out or the result is uncertain, mark withdrawal UNKNOWN.
9. Reconcile UNKNOWN withdrawals using the gateway's payout status API.

## Pseudocode

```js
async function processPayout(withdrawal, gateway) {
  try {
    const result = await gateway.createPayout({
      amount: withdrawal.amountPaise,
      idempotencyKey: withdrawal.gatewayIdempotencyKey
    });

    if (result.status === "SUCCESS") {
      await updateWithdrawalStatus(
        withdrawal._id,
        "SUCCESS",
        result.reference
      );
    } else if (result.status === "FAILED") {
      await updateWithdrawalStatus(
        withdrawal._id,
        "FAILED",
        result.reference
      );
    } else {
      await updateWithdrawalStatus(
        withdrawal._id,
        "UNKNOWN"
      );
    }
  } catch (error) {
    // A timeout does not prove payout failure.
    await updateWithdrawalStatus(
      withdrawal._id,
      "UNKNOWN"
    );
  }
}
```

## Important Safety Rule

Never release reserved money just because the gateway request timed out. First check the payout status with the gateway. Reuse the same idempotency key to prevent duplicate payouts.
```
