import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Leaderboard: Top winners by total prize amount won
  async getLeaderboard() {
    const results = await this.prisma.db.orm.public.ScratchResult.all();
    const users = await this.prisma.db.orm.public.User.all();

    // Group winnings by userId
    const userWinningsMap = new Map<number, { userId: number; email: string; name: string | null; totalWon: number; winsCount: number }>();

    for (const user of users) {
      userWinningsMap.set(user.id, {
        userId: user.id,
        email: user.email,
        name: user.name,
        totalWon: 0,
        winsCount: 0,
      });
    }

    for (const res of results) {
      if (res.prizeAmount > 0) {
        const stats = userWinningsMap.get(res.userId);
        if (stats) {
          stats.totalWon += res.prizeAmount;
          stats.winsCount += 1;
        }
      }
    }

    // Sort descending by totalWon
    const leaderboard = Array.from(userWinningsMap.values())
      .filter((u) => u.totalWon > 0)
      .sort((a, b) => b.totalWon - a.totalWon);

    return leaderboard;
  }

  // 2. My History: User's personal game history
  async getMyHistory(userId: number) {
    const results = await this.prisma.db.orm.public.ScratchResult.where({ userId }).all();
    return results;
  }

  // 3. Admin Dashboard Overview Stats
  async getAdminStats() {
    const totalUsers = (await this.prisma.db.orm.public.User.all()).length;
    const totalCards = (await this.prisma.db.orm.public.User.all()).length; // cards count
    const cards = await this.prisma.db.orm.public.ScratchCard.all();
    const results = await this.prisma.db.orm.public.ScratchResult.all();
    const prizes = await this.prisma.db.orm.public.Prize.all();

    const scratchedCardsCount = cards.filter((c) => c.status === 'SCRATCHED').length;
    const totalPrizeMoneyAwarded = results.reduce((sum, r) => sum + r.prizeAmount, 0);

    return {
      totalUsers,
      totalCardsIssued: cards.length,
      totalCardsScratched: scratchedCardsCount,
      totalCardsUnscratched: cards.length - scratchedCardsCount,
      totalPrizeMoneyAwarded,
      totalPrizesDefined: prizes.length,
    };
  }

  // 4. Financial Payouts & Redemptions Audit Log (ADMIN Only - Paginated)
  async getAdminPayouts(search?: string, page: number = 1, limit: number = 10) {
    const results = await this.prisma.db.orm.public.ScratchResult.all();
    const users = await this.prisma.db.orm.public.User.all();
    const prizes = await this.prisma.db.orm.public.Prize.all();
    const cards = await this.prisma.db.orm.public.ScratchCard.all();

    const userMap = new Map(users.map((u) => [u.id, u]));
    const prizeMap = new Map(prizes.map((p) => [p.id, p]));
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    // Filter results where prizeAmount > 0
    let filtered = results
      .filter((r) => r.prizeAmount > 0)
      .map((r) => {
        const user = userMap.get(r.userId);
        const prize = r.prizeId ? prizeMap.get(r.prizeId) : null;
        const card = cardMap.get(r.scratchCardId);

        return {
          id: r.id,
          prizeAmount: r.prizeAmount,
          isRedeemed: r.isRedeemed,
          redeemedAt: r.redeemedAt,
          scratchedAt: r.scratchedAt,
          cardCode: card ? card.code : 'UNKNOWN',
          user: user
            ? { id: user.id, name: user.name, email: user.email }
            : { id: r.userId, name: 'Unknown User', email: 'N/A' },
          prize: prize ? { id: prize.id, title: prize.title, amount: prize.amount } : null,
        };
      });

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.id.toString() === q ||
          p.cardCode.toLowerCase().includes(q) ||
          (p.user.name && p.user.name.toLowerCase().includes(q)) ||
          p.user.email.toLowerCase().includes(q) ||
          (p.prize && p.prize.title.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * limit;
    const paginatedPayouts = filtered.slice(startIndex, startIndex + limit);

    return {
      data: paginatedPayouts,
      pagination: {
        total,
        page: currentPage,
        limit,
        totalPages,
      },
    };
  }
}
