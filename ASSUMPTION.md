
# Assumptions and Open Questions

## Assumptions

1. MongoDB production deployment supports transactions through a replica set or sharded cluster.
2. All monetary amounts are stored as integer paise.
3. Each user has one wallet.
4. A withdrawal request must have a unique client idempotency key per user.
5. Gateway payout requests support idempotency.
6. Gateway timeouts are treated as UNKNOWN, not FAILED.
7. The ledger is append-only and used for financial auditing.
8. User bank account details are verified before payout processing.
9. RazorpayX is considered the example payout provider.

## Open Questions

1. Does the payout gateway guarantee idempotency when the same key is reused?
2. Can payout status be queried reliably after a timeout?
3. What are the payout limits, fees and applicable compliance requirements?
4. What is the expected ledger retention period?
5. What is the expected monthly reporting timezone?
