
# Part 2 - Monthly Per-User Aggregation

The following aggregation generates a monthly report for November 2026.

```javascript
db.PointTransaction.aggregate([
  {
    $match: {
      createdAt: {
        $gte: ISODate("2026-11-01T00:00:00Z"),
        $lt: ISODate("2026-12-01T00:00:00Z")
      },
      type: {
        $in: ["EARNED", "CONVERTED", "EXPIRED"]
      }
    }
  },
  {
    $group: {
      _id: {
        userId: "$userId",
        cohort: "$cohort"
      },
      pointsEarned: {
        $sum: {
          $cond: [
            { $eq: ["$type", "EARNED"] },
            "$points",
            0
          ]
        }
      },
      pointsConverted: {
        $sum: {
          $cond: [
            { $eq: ["$type", "CONVERTED"] },
            "$points",
            0
          ]
        }
      },
      pointsExpired: {
        $sum: {
          $cond: [
            { $eq: ["$type", "EXPIRED"] },
            "$points",
            0
          ]
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      userId: "$_id.userId",
      cohort: "$_id.cohort",
      pointsEarned: 1,
      pointsConverted: 1,
      pointsExpired: 1
    }
  },
  {
    $sort: {
      cohort: 1,
      userId: 1
    }
  }
]);
```

Assumption: The reporting month is based on UTC.

The query filters transactions for the selected month, groups them by user and cohort, and calculates earned, converted and expired points separately.
