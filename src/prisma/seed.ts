import { db } from './db.js';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Starting database seeding...');

  const saltRounds = 10;

  // 1. Create Admin User (or skip if exists)
  const existingAdmin = await db.orm.public.User.where({ email: 'admin@example.com' }).first();
  let admin = existingAdmin;
  if (!admin) {
    const adminPassword = await bcrypt.hash('password123', saltRounds);
    admin = await db.orm.public.User.create({
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin Boss',
      role: 'ADMIN',
    });
    console.log(`✅ Created Admin User: ${admin.email} (Role: ADMIN)`);
  } else {
    console.log(`ℹ️ Admin User already exists (${admin.email})`);
  }

  // 2. Create Regular Players
  const player1Password = await bcrypt.hash('password123', saltRounds);
  const existingPlayer1 = await db.orm.public.User.where({ email: 'player1@example.com' }).first();
  let player1 = existingPlayer1;
  if (!player1) {
    player1 = await db.orm.public.User.create({
      email: 'player1@example.com',
      password: player1Password,
      name: 'Lucky Luke',
      role: 'USER',
    });
  }

  const player2Password = await bcrypt.hash('password123', saltRounds);
  const existingPlayer2 = await db.orm.public.User.where({ email: 'player2@example.com' }).first();
  let player2 = existingPlayer2;
  if (!player2) {
    player2 = await db.orm.public.User.create({
      email: 'player2@example.com',
      password: player2Password,
      name: 'Scratch Queen',
      role: 'USER',
    });
  }
  console.log(`✅ Ready Players: ${player1.email}, ${player2.email}`);

  // 3. Create Prize Pool Items
  const prizes = [
    { title: '🥇 Mega Jackpot Cash', amount: 1000.0, probability: 2.0, totalQuantity: 3, remainingQuantity: 3, isActive: true },
    { title: '🥈 Super Cash Reward', amount: 250.0, probability: 8.0, totalQuantity: 10, remainingQuantity: 10, isActive: true },
    { title: '🥉 Quick Winner Cash', amount: 50.0, probability: 20.0, totalQuantity: 25, remainingQuantity: 25, isActive: true },
    { title: '🎟️ Lucky Bonus $10', amount: 10.0, probability: 30.0, totalQuantity: 50, remainingQuantity: 50, isActive: true },
  ];

  for (const prize of prizes) {
    const existingPrize = await db.orm.public.Prize.where({ title: prize.title }).first();
    if (!existingPrize) {
      await db.orm.public.Prize.create(prize);
    }
  }
  console.log(`✅ Created Prize Pool Items!`);

  // 4. Issue Pre-assigned Scratch Cards
  const cardsToIssue = [
    { code: 'CARD-JACKPOT-777', userId: player1.id, status: 'UNSCRATCHED' },
    { code: 'CARD-LUCKY-888', userId: player1.id, status: 'UNSCRATCHED' },
    { code: 'CARD-WINNER-999', userId: player2.id, status: 'UNSCRATCHED' },
  ];

  for (const card of cardsToIssue) {
    const existingCard = await db.orm.public.ScratchCard.where({ code: card.code }).first();
    if (!existingCard) {
      await db.orm.public.ScratchCard.create(card);
    }
  }
  console.log(`✅ Issued Initial Scratch Cards!`);

  console.log('\n🎉 Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
