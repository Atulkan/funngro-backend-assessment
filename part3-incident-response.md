
# Part 3 - Production Incident Response

## Incident: Payout Latency and Missing Money

### First 0-5 Minutes: Stop the Bleeding

1. Declare a production incident.
2. Inform engineering, database and payment operations teams.
3. Check whether new payouts are creating financial inconsistencies.
4. If payout safety is uncertain, temporarily pause new payout requests using a feature flag.
5. Do not stop reconciliation or webhook processing.

Commands:

```bash
pm2 status
pm2 logs --lines 200
```

### 5-10 Minutes: Check Application Logs

Look for:
- Gateway timeout and HTTP 5xx errors.
- MongoDB connection pool timeouts.
- Slow database queries.
- Transaction failures and write conflicts.
- Duplicate idempotency requests.

Commands:

```bash
grep -iE "withdraw|payout|timeout|error" app.log | tail -200
```

### 10-15 Minutes: Check MongoDB Atlas

Inspect:
- CPU utilization.
- Memory pressure.
- Disk I/O and storage latency.
- Connection count and connection pool usage.
- Query execution time.
- Slow queries and lock/transaction conflicts.

Decision:
- High CPU and slow queries: investigate query plans and indexes.
- High connection usage: investigate connection leaks and pool saturation.
- High disk latency: investigate storage pressure and I/O operations.

### 15-20 Minutes: Check Razorpay Dashboard

Inspect:
- Payout success and failure rates.
- Gateway response latency.
- Pending payouts.
- Timeout errors.
- Webhook delivery failures.
- Duplicate payout references.

Do not assume that a timeout means the payout failed.

### 20-25 Minutes: Reconcile Money

First inspect unresolved withdrawals:

```js
db.withdrawals.find({
  status: { $in: ["PROCESSING", "UNKNOWN"] }
}).sort({ createdAt: -1 }).limit(100);
```

Count unresolved withdrawals:

```js
db.withdrawals.countDocuments({
  status: { $in: ["PROCESSING", "UNKNOWN"] }
});
```

Compare:
- Withdrawal records.
- Wallet reserved balances.
- Ledger entries.
- Razorpay payout status.

Actions:
- Confirmed SUCCESS: finalize withdrawal.
- Confirmed FAILED: release reserved balance.
- UNKNOWN: keep funds reserved and investigate gateway status.

Never manually credit or debit money without an auditable correction.

### 25-30 Minutes: Recovery and Monitoring

1. Restore new payouts gradually after confirming financial safety.
2. Monitor API p95 and p99 latency.
3. Monitor gateway success rate and timeout rate.
4. Monitor unresolved withdrawals.
5. Verify wallet and ledger consistency.
6. Inform customer support about affected transactions.
7. Document root cause and corrective actions.

## What I Would NOT Do

- Never blindly retry a timed-out payout with a new idempotency key.
- Never release reserved money for an UNKNOWN payout.
- Never manually change wallet balances without ledger records.
- Never assume that improved API latency means money issues are resolved.
- Never disable reconciliation to reduce system load.

## Final Priority

Financial correctness comes before API performance. First prevent duplicate payouts and incorrect balance changes, then restore system performance and reconcile every affected transaction.
