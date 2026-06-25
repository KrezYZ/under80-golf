// Local storage data layer — used when Firebase is not yet configured
// Mirrors the same API as firestore.ts

import type { Member, GolfEvent, Transaction } from './supabase';
import { seedEvents, seedMembers, seedTransactions } from '../seed';

const KEYS = { members: 'under80_members', events: 'under80_events', transactions: 'under80_tx' };

function load<T>(key: string, seed: any[], idPrefix: string): T[] {
  const raw = localStorage.getItem(key);
  if (raw) return JSON.parse(raw);
  // First time: seed data with generated IDs
  const seeded = seed.map((item: any, i: number) => ({ id: idPrefix + i, ...item }));
  save(key, seeded);
  return seeded as T[];
}

function save(key: string, data: any[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Helper to resolve numeric eventId indices to string IDs
function initTransactions(): Transaction[] {
  const raw = localStorage.getItem(KEYS.transactions);
  if (raw) return JSON.parse(raw);
  // Ensure events are initialized first
  load<GolfEvent>(KEYS.events, seedEvents, 'ev_');
  const txs = seedTransactions.map((tx: any, i: number) => ({
    id: 'tx_' + i,
    type: tx.type,
    category: tx.category,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    eventId: tx.eventId != null ? 'ev_' + tx.eventId : undefined,
  }));
  save(KEYS.transactions, txs);
  return txs;
}

// ---- Members ----

export async function getMembers(): Promise<Member[]> {
  return load<Member>(KEYS.members, seedMembers, 'mb_');
}

export async function addMember(data: Omit<Member, 'id'>): Promise<Member> {
  const all = await getMembers();
  const item: Member = { id: 'mb_' + Date.now(), ...data };
  all.push(item);
  save(KEYS.members, all);
  return item;
}

export async function updateMember(id: string, data: Omit<Member, 'id'>): Promise<void> {
  const all = await getMembers();
  const idx = all.findIndex(m => m.id === id);
  if (idx >= 0) all[idx] = { ...data, id };
  save(KEYS.members, all);
}

export async function deleteMember(id: string): Promise<void> {
  const all = await getMembers();
  save(KEYS.members, all.filter(m => m.id !== id));
}

// ---- Events ----

export async function getEvents(): Promise<GolfEvent[]> {
  return load<GolfEvent>(KEYS.events, seedEvents, 'ev_');
}

export async function addEvent(data: Omit<GolfEvent, 'id'>): Promise<GolfEvent> {
  const all = await getEvents();
  const item: GolfEvent = { id: 'ev_' + Date.now(), ...data };
  all.push(item);
  save(KEYS.events, all);
  return item;
}

export async function updateEvent(id: string, data: Omit<GolfEvent, 'id'>): Promise<void> {
  const all = await getEvents();
  const idx = all.findIndex(e => e.id === id);
  if (idx >= 0) all[idx] = { ...data, id };
  save(KEYS.events, all);
}

export async function deleteEvent(id: string): Promise<void> {
  const all = await getEvents();
  save(KEYS.events, all.filter(e => e.id !== id));
}

// ---- Transactions ----

export async function getTransactions(): Promise<Transaction[]> {
  return initTransactions();
}

export async function addTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction> {
  const all = await getTransactions();
  const item: Transaction = { id: 'tx_' + Date.now(), ...data };
  all.push(item);
  save(KEYS.transactions, all);
  return item;
}

export async function updateTransaction(id: string, data: Omit<Transaction, 'id'>): Promise<void> {
  const all = await getTransactions();
  const idx = all.findIndex(t => t.id === id);
  if (idx >= 0) all[idx] = { ...data, id };
  save(KEYS.transactions, all);
}

export async function deleteTransaction(id: string): Promise<void> {
  const all = await getTransactions();
  save(KEYS.transactions, all.filter(t => t.id !== id));
}

// ---- Active member count ----

export async function getActiveMemberCount(): Promise<number> {
  const all = await getMembers();
  return all.filter(m => m.status === 'active').length;
}
