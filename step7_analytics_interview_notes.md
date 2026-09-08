# Scratch & Win — Step 7: Analytics, Leaderboard & Admin Stats Interview Guide

## Overview of What We Built in Step 7

We implemented real-time analytics, competitive leaderboards, and administrative system metrics in NestJS:
- **Leaderboard Engine (`GET /analytics/leaderboard`)**: Dynamically computes top winners by aggregating scratch win amounts (`prizeAmount`) per user, returning records sorted by total cash won descending.
- **User Activity History (`GET /analytics/my-history`)**: Provides users with a full historical audit trail of all their scratched cards and results.
- **Admin System Dashboard (`GET /analytics/admin-stats`)**: Aggregates macro system metrics including total users, total cards issued, scratched vs unscratched breakdown, and total prize money distributed.

---

## Code Architecture Created

```text
src/analytics/
  ├── analytics.service.ts      <-- Leaderboard aggregation, user history, admin metrics
  ├── analytics.controller.ts   <-- Endpoints: GET /analytics/leaderboard, GET /analytics/my-history, GET /analytics/admin-stats
  └── analytics.module.ts       <-- Imports PrismaModule & AuthModule
```

---

## Verified Live Endpoints

| Endpoint | Method | Access Level | Description |
|---|---|---|---|
| `/analytics/leaderboard` | `GET` | Authenticated Users | Returns top winners sorted by total amount won descending |
| `/analytics/my-history` | `GET` | Authenticated Users | Returns logged-in user's personal scratch results audit trail |
| `/analytics/admin-stats` | `GET` | `ADMIN` only | Returns macro system analytics & total prize money distributed |

---

## Core Interview Questions & Comprehensive Answers

### Q1: How is the Leaderboard computed dynamically?
**Answer**:
The service queries `ScratchResult` records and `User` records. It maps total `prizeAmount` won by each `userId` into an in-memory aggregation map, filters out users with 0 wins, and sorts the results in descending order by `totalWon`.

---

### Q2: How is Admin access protected on `/analytics/admin-stats`?
**Answer**:
The controller endpoint is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')`. If a regular user without an `ADMIN` role invokes this endpoint, `RolesGuard` rejects the request with HTTP `403 Forbidden`.
