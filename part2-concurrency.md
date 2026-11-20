
# Part 2 - Preventing Concurrent Double Conversion

## Problem

Two simultaneous requests may try to convert the same reward points. Without concurrency protection, both requests could read the same balance and spend the same points.

## Solution: MongoDB Transaction and Atomic Update

```javascript
const session = await mongoose.startSession();

try {
  await session.withTransaction(async () => {
    const account = await PointAccount.findOneAndUpdate(
      {
        userId,
        availablePoints: { $gte: points }
      },
      {
        $inc: { availablePoints: -points }
      },
      {
        new: true,
        session
      }
    );

    if (!account) {
      throw new Error("Insufficient points");
    }

    // Consume PointLot records in expiry-first order.
    // Create Conversion record.
    // Insert immutable CONVERTED PointTransaction.
    // All operations use the same session.
  });
} finally {
  await session.endSession();
}
```

## Additional Protection

1. Use a unique index on `{ userId: 1, idempotencyKey: 1 }` in Conversion.
2. Consume PointLot records in expiry-first order.
3. Update PointAccount, PointLot, Conversion and PointTransaction in one transaction.
4. Store the conversion rate used at the time of conversion.
5. If any operation fails, abort the transaction.

## Result

Atomic conditional updates prevent spending more points than available. The unique idempotency index prevents duplicate conversion requests. MongoDB transactions keep account balances, point lots and audit records consistent.

**Production requirement:** MongoDB must run as a replica set or sharded cluster to support transactions.
