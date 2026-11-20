
# Part 1 - Code Review: Withdrawal Handler

## 1. Problems Ordered by Severity

### Critical 1: Race Condition / Double Spending
**Problem:** The code reads the wallet balance and updates it separately.

**Scenario:** Two withdrawal requests of ₹800 arrive simultaneously when the balance is ₹1,000. Both requests may read ₹1,000 and both may proceed.

**Fix:** Use an atomic conditional update with `$gte` and `$inc`, inside a MongoDB transaction.

### Critical 2: No Idempotency
**Problem:** Mobile clients retry timed-out requests, but the original handler does not identify duplicate requests.

**Scenario:** One withdrawal request may be processed twice after a timeout.

**Fix:** Require an idempotency key and enforce a unique compound index on `{ userId, idempotencyKey }`.

### Critical 3: Gateway Call Is Not Awaited
**Problem:** `gateway.createPayout()` is not awaited. The try/catch may not catch asynchronous failures.

**Scenario:** The API may return success even though the payout later fails.

**Fix:** Use an asynchronous payout worker and handle gateway results explicitly.

### Critical 4: Gateway Failure Is Swallowed
**Problem:** The catch block only logs the error. The wallet remains debited.

**Scenario:** Money is deducted but the beneficiary never receives it.

**Fix:** Maintain PENDING, PROCESSING, SUCCESS, FAILED and UNKNOWN states. Release reserved money only after a confirmed failure.

### Critical 5: No Atomic Database Operations
**Problem:** Wallet update and ledger insertion are separate operations.

**Scenario:** Wallet is updated but ledger insertion fails, creating inconsistent records.

**Fix:** Update wallet, withdrawal, ledger and outbox in one MongoDB transaction.

### High 6: Invalid Amount Handling
**Problem:** Negative, zero, decimal or unsafe amounts are not validated.

**Fix:** Store money as integer paise and validate using `Number.isSafeInteger()`.

### High 7: Missing Wallet Handling
**Problem:** If wallet is missing, accessing `wallet.balance` causes an error.

**Fix:** Check wallet existence and handle missing wallet safely.

### High 8: User ID Trust Issue
**Problem:** The handler accepts userId directly from the request body.

**Scenario:** A user may attempt to withdraw from another user's wallet.

**Fix:** Take userId from authenticated user context.

### High 9: Floating-Point Money
**Problem:** Floating-point arithmetic can create precision errors.

**Fix:** Store and calculate money in integer paise.

### High 10: Unbounded Ledger Query
**Problem:** `Ledger.find()` loads all matching history records.

**Scenario:** A user with thousands of transactions creates unnecessary database load.

**Fix:** Add compound indexes and pagination with a limit.

### Medium 11: Missing Database Indexes
**Problem:** Wallet and ledger lookups can become slow at scale.

**Fix:** Add indexes on wallet userId, withdrawal idempotency fields and ledger history fields.

### Medium 12: Unsafe Gateway Reference
**Problem:** `Date.now()` is not a reliable unique payout reference.

**Fix:** Generate and persist a unique reference and reuse it during retries.

## 2. Overall Design

The withdrawal flow uses integer paise and atomic wallet updates to prevent concurrent overspending. A MongoDB transaction stores the withdrawal, wallet reservation, ledger entry and outbox event together. A background worker processes payout requests outside the database transaction using a persisted gateway idempotency key. Unknown gateway outcomes are reconciled before releasing reserved funds. Authentication, indexes, pagination and monitoring improve security and production reliability.
