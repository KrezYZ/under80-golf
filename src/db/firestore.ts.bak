import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  writeBatch, query, where, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ---- Types (ID: string for Firestore) ----

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  joinDate: string;
  status: 'active' | 'inactive';
  notes: string;
}

export interface GolfEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes: string;
}

export interface Transaction {
  id: string;
  eventId?: string;
  memberId?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
}

// ---- Categories ----

export const INCOME_CATEGORIES = [
  '参赛费', '会员会费', '赞助', '捐赠', '其他收入',
];

export const EXPENSE_CATEGORIES = [
  '场地费', '奖品', '餐饮', '设备器材', '交通', '保险', '其他支出',
];

// ---- Firestore collection refs ----

const membersCol = collection(db, 'members');
const eventsCol = collection(db, 'events');
const transactionsCol = collection(db, 'transactions');

// ---- CRUD: Members ----

export async function getMembers(): Promise<Member[]> {
  const snap = await getDocs(membersCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
}

export async function addMember(data: Omit<Member, 'id'>): Promise<Member> {
  const ref = await addDoc(membersCol, data);
  return { id: ref.id, ...data };
}

export async function updateMember(id: string, data: Omit<Member, 'id'>): Promise<void> {
  await updateDoc(doc(db, 'members', id), data as any);
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(db, 'members', id));
}

// ---- CRUD: Events ----

export async function getEvents(): Promise<GolfEvent[]> {
  const snap = await getDocs(eventsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as GolfEvent));
}

export async function addEvent(data: Omit<GolfEvent, 'id'>): Promise<GolfEvent> {
  const ref = await addDoc(eventsCol, data);
  return { id: ref.id, ...data };
}

export async function updateEvent(id: string, data: Omit<GolfEvent, 'id'>): Promise<void> {
  await updateDoc(doc(db, 'events', id), data as any);
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'events', id));
}

// ---- CRUD: Transactions ----

export async function getTransactions(): Promise<Transaction[]> {
  const snap = await getDocs(transactionsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
}

export async function addTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction> {
  const ref = await addDoc(transactionsCol, data);
  return { id: ref.id, ...data };
}

export async function updateTransaction(id: string, data: Omit<Transaction, 'id'>): Promise<void> {
  await updateDoc(doc(db, 'transactions', id), data as any);
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', id));
}

// ---- Helper functions (pure — work on arrays) ----

export function getTotalIncome(transactions: Transaction[]): number {
  return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalExpense(transactions: Transaction[]): number {
  return transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
}

export function getBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpense(transactions);
}

export function getEventBalance(transactions: Transaction[], eventId: string): number {
  return getBalance(transactions.filter(t => t.eventId === eventId));
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

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getMonthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export function getRunningBalance(transactions: Transaction[]): number {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return getBalance(sorted);
}

// ---- Active member count ----

export async function getActiveMemberCount(): Promise<number> {
  const q = query(membersCol, where('status', '==', 'active'));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

// ---- Seed data import (one-time, run by admin) ----

export async function seedFirestore(
  events: Omit<GolfEvent, 'id'>[],
  members: Omit<Member, 'id'>[],
  transactions: { eventId?: number; type: 'income' | 'expense'; category: string; amount: number; description: string; date: string }[],
): Promise<void> {
  const batch = writeBatch(db);

  // Use predetermined IDs (event_0, event_1, ...)
  const eventIds = events.map((_, i) => `event_${i}`);
  for (let i = 0; i < events.length; i++) {
    batch.set(doc(db, 'events', eventIds[i]), events[i]);
  }

  // Members with predetermined IDs
  for (let i = 0; i < members.length; i++) {
    batch.set(doc(db, 'members', `member_${i}`), members[i]);
  }

  // Transactions — resolve eventId indices to Firestore IDs
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const resolvedEventId = tx.eventId != null ? eventIds[tx.eventId as any] : null;
    const firestoreTx = {
      ...tx,
      eventId: resolvedEventId || null,
    };
    batch.set(doc(db, 'transactions', `tx_${i}`), firestoreTx);
  }

  await batch.commit();
}
