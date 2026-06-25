import Dexie, { type EntityTable } from 'dexie';

// ---- Types ----

export interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  joinDate: string; // ISO date
  status: 'active' | 'inactive';
  notes: string;
}

export interface GolfEvent {
  id: number;
  name: string;
  date: string; // ISO date
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes: string;
}

export interface Transaction {
  id: number;
  eventId?: number;
  memberId?: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string; // ISO date
}

// ---- Categories ----

export const INCOME_CATEGORIES = [
  '参赛费',
  '会员会费',
  '赞助',
  '捐赠',
  '其他收入',
];

export const EXPENSE_CATEGORIES = [
  '场地费',
  '奖品',
  '餐饮',
  '设备器材',
  '交通',
  '保险',
  '其他支出',
];

// ---- Database ----

const db = new Dexie('Under80GolfDB') as Dexie & {
  members: EntityTable<Member, 'id'>;
  events: EntityTable<GolfEvent, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
};

db.version(1).stores({
  members: '++id, name, status',
  events: '++id, date, status',
  transactions: '++id, eventId, type, category, date',
});

// ---- Helper functions ----

export function getTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalExpense(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpense(transactions);
}

export function getEventBalance(transactions: Transaction[], eventId: number): number {
  const eventTxs = transactions.filter(t => t.eventId === eventId);
  return getBalance(eventTxs);
}

export function getTransactionsByMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getCurrentMonthTransactions(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  return getTransactionsByMonth(transactions, now.getFullYear(), now.getMonth());
}

export function formatCurrency(amount: number): string {
  return `€${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getRunningBalance(transactions: Transaction[]): number {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return getBalance(sorted);
}

export async function importSeedData(
  events: Omit<GolfEvent, 'id'>[],
  members: Omit<Member, 'id'>[],
  transactions: Omit<Transaction, 'id'>[]
): Promise<void> {
  const SEED_VERSION = 3;
  const importedVersion = localStorage.getItem('under80_seed_version');
  if (importedVersion === String(SEED_VERSION)) return; // Already imported this version

  // Clear existing data before importing
  await db.transactions.clear();
  await db.members.clear();
  await db.events.clear();

  // Insert events and track actual IDs
  const eventIdMap: Record<number, number> = {};
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const id = await db.events.add({ name: e.name, date: e.date, location: e.location, status: e.status, notes: e.notes } as any);
    eventIdMap[i] = id;
  }

  // Insert members
  for (const m of members) {
    await db.members.add({ name: m.name, phone: m.phone, email: m.email, joinDate: m.joinDate, status: m.status, notes: m.notes } as any);
  }

  // Insert transactions with resolved event IDs
  for (const tx of transactions) {
    const resolvedEventId = tx.eventId !== undefined ? eventIdMap[tx.eventId] : undefined;
    await db.transactions.add({
      eventId: resolvedEventId,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description,
      date: tx.date,
    } as any);
  }

  localStorage.setItem('under80_seed_version', String(SEED_VERSION));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getMonthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export { db };
export default db;
