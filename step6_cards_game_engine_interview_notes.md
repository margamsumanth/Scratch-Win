# Scratch & Win — Step 6: Scratch Card & Game Engine Interview Guide

## Overview of What We Built in Step 6

We implemented a secure, production-ready lottery engine and scratch card management system in NestJS:
- **Unique Card Generation (`crypto.randomBytes`)**: Generating cryptographically secure 12-character uppercase card codes (e.g. `CARD-9A2F-8K3L`).
- **Weighted Probability Lottery Algorithm**: Dynamic weighted random choice based on active prize probabilities (`probability`) and available stock (`remainingQuantity > 0`).
- **Double-Scratch & Idempotency Protection**: Guarded at both application layer (status check `UNSCRATCHED`) and database layer (`@unique` constraint on `scratchCardId` in `ScratchResult`).
- **User Ownership Authorization**: Enforcing strict ownership validation (`card.userId === userId`) throwing `403 Forbidden` if a user attempts to scratch another user's card.
- **Stock Decrement & Audit Ledger**: Decrements prize inventory upon winning and records immutable audit records in `ScratchResult`.

---

## Code Architecture Created

```text
src/cards/
  ├── dto/
  │   └── issue-card.dto.ts     <-- Validates userId & optional expiry date
  ├── cards.service.ts          <-- Game engine logic (lottery algorithm, double-scratch guard, stock decrement)
  ├── cards.controller.ts       <-- Endpoints: POST /cards/issue, GET /cards/my-cards, POST /cards/:code/scratch
  └── cards.module.ts           <-- Imports PrismaModule & AuthModule
```

---

## Verified Live Test Cases

| Endpoint | Method | Role Required | Payload / Params | Result |
|---|---|---|---|---|
| `/cards/issue` | `POST` | `ADMIN` | `{"userId": 1}` | `201 Created` + Card object with code `CARD-XXXX-YYYY` |
| `/cards/my-cards` | `GET` | `USER` / `ADMIN` | Header `Authorization: Bearer <TOKEN>` | `200 OK` + Array of user's assigned cards |
| `/cards/:code/scratch` | `POST` | `USER` / `ADMIN` | Param `:code` | `200 OK` + Winner status & prize/result object |
| `/cards/:code/scratch` | `POST` | *Other User* | Param `:code` | `403 Forbidden` (`You are not authorized to scratch this card`) |
| `/cards/:code/scratch` | `POST` | *Same Card Again* | Param `:code` | `400 Bad Request` (`This card has already been scratched`) |

---

## Core Interview Questions & Comprehensive Answers

### Q1: How does the Weighted Random Lottery Engine work?
**Answer**:
1. Active prizes with `remainingQuantity > 0` are fetched.
2. The total sum of winning probabilities is computed: $\text{winWeightSum} = \sum \text{probability}_i$.
3. A "No Win" weight is added ($\text{noWinWeight} = \max(0, 100 - \text{winWeightSum})$) to form a total pool (e.g. 100).
4. A random floating-point number is generated: $\text{pick} \in [0, \text{totalPool})$.
5. The algorithm iterates through available prizes, accumulating weight intervals. The prize where $\text{pick} \le \text{cumulativeWeight}$ is selected as the winner.

---

### Q2: How is Double-Scratch Protection enforced at both Application & Database layers?
**Answer**:
- **Application Layer**: Checks `card.status === 'UNSCRATCHED'`. If `SCRATCHED`, throws `400 Bad Request`.
- **Database Layer**: `ScratchResult.scratchCardId` has a `@unique` constraint. If a race condition bypasses application memory checks, PostgreSQL enforces uniqueness and rejects duplicate result rows.

---

### Q3: Why is an immutable `ScratchResult` ledger table necessary?
**Answer**:
Decoupling game attempts into an immutable ledger table (`ScratchResult`) ensures:
- **Auditability**: Complete historical record of when a card was scratched, who scratched it, which prize ID was won, and the amount won.
- **Financial Reconciliation**: Provides verifiable proof for prize payout auditing without modifying historical card metadata.

---

### Q4: How do we prevent unauthorized users from scratching cards owned by others?
**Answer**:
Inside `scratchCard(code, userId)`, the system compares `card.userId` with the authenticated `userId` extracted from the verified JWT payload:
```typescript
if (card.userId !== userId) {
  throw new ForbiddenException('You are not authorized to scratch this card');
}
```
If mismatched, NestJS throws `403 Forbidden`.
