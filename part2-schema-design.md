
# Part 2 - Reward Points Schema Design

## 1. Collections

### A. PointAccount
Stores the current point balance of a user.

Fields:
- userId: ObjectId
- availablePoints: Number
- updatedAt: Date

Index:
- Unique index on `{ userId: 1 }`

### B. PointTransaction
Stores the immutable history of earned, converted and expired points.

Fields:
- userId: ObjectId
- type: String (EARNED, CONVERTED, EXPIRED)
- points: Number
- sourceType: String
- sourceId: ObjectId
- conversionId: ObjectId (optional)
- cohort: String
- createdAt: Date

Indexes:
- `{ userId: 1, createdAt: -1 }`
- `{ createdAt: 1, type: 1, userId: 1 }`

### C. PointLot
Tracks points from each earning event separately.

Fields:
- userId: ObjectId
- sourceId: ObjectId
- originalPoints: Number
- remainingPoints: Number
- expiresAt: Date
- createdAt: Date

Index:
- `{ userId: 1, expiresAt: 1 }`

### D. Conversion
Stores each points-to-cash conversion.

Fields:
- userId: ObjectId
- points: Number
- conversionRate: Number
- cashPaise: Number
- idempotencyKey: String
- status: String
- createdAt: Date

Indexes:
- Unique `{ userId: 1, idempotencyKey: 1 }`
- `{ userId: 1, createdAt: -1 }`

### E. ConversionRate
Stores historical conversion rates.

Fields:
- pointsPerRupee: Number
- effectiveFrom: Date
- effectiveTo: Date (optional)
- createdAt: Date

Index:
- `{ effectiveFrom: -1 }`

## 2. Important Design Decisions

- PointTransaction is append-only and acts as an audit history.
- PointLot tracks remaining points and expiry for each earning event.
- Conversion stores the exact rate used at conversion time.
- Historical conversion rates must never be overwritten.
- All point balances and conversion amounts must use safe integer values.
- The monthly report uses PointTransaction records.
