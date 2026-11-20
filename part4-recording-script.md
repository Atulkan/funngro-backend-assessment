# Funngro Backend Engineering Assessment — Recording Script

## 1. Introduction (30 seconds)

Hello, in this assessment I worked on a safe withdrawal system using Node.js and MongoDB. My main focus was preventing duplicate payouts, protecting wallet balances and maintaining an accurate transaction ledger.

## 2. Two Most Dangerous Bugs (1.5 minutes)

The first dangerous bug is the race condition.

Suppose a user has ₹1,000 and sends two withdrawal requests of ₹800 at the same time. Both requests can read the same balance and both may proceed. This can cause double spending.

I solved this using an atomic conditional wallet update with `$gte` and `$inc`, along with a MongoDB transaction.

The second dangerous bug is the gateway handling.

The original code does not await the payout request and silently catches errors. This means the wallet can be debited even when the payout fails.

I introduced withdrawal states, a durable outbox and a background worker. If the gateway response is uncertain, the withdrawal becomes UNKNOWN and is reconciled before funds are released.

## 3. Database and Scaling (1 minute)

For scaling, I added indexes for wallet lookups, idempotency and ledger history.

I also used pagination instead of loading the complete ledger history.

For reward points, I designed separate collections for point accounts, point transactions, point lots, conversions and conversion rates.

Monthly reports use MongoDB aggregation.

## 4. Production Incident (1 minute)

If payout latency increases from 300 milliseconds to 11 seconds, and users report missing payouts, my first priority is financial safety.

I would check application logs, MongoDB Atlas metrics and the Razorpay payout dashboard.

I would reconcile UNKNOWN transactions and never blindly retry a payout or release reserved funds without confirmation.

## 5. One Uncertain Decision and Question (1 minute)

One decision that depends on the payment provider is how to handle a payout request when the gateway accepts it but our application times out before receiving the response.

I would ask:

Does the gateway support idempotency for payout creation, and can we reliably query the payout status using the same idempotency key or reference?

I would also confirm webhook delivery guarantees and the recommended reconciliation process.

## 6. Closing (15 seconds)

My overall design prioritizes money safety, idempotency, auditability and reliable recovery from failures. Thank you.
