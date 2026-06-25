import { supabase } from '../firebase/config';

// ---- Types (ID: string for Supabase UUID) ----

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  licencia: string;
  genero: string;
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
  eventId?: string | null;
  memberId?: string | null;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
}

// ---- Categories ----

export const INCOME_CATEGORIES = ['参赛费', '会员会费', '赞助', '捐赠', '其他收入'];
export const EXPENSE_CATEGORIES = ['场地费', '奖品', '餐饮', '设备器材', '交通', '保险', '其他支出'];

// ---- CRUD: Members ----

export async function getMembers(): Promise<Member[]> {
  const { data } = await supabase.from('members').select('*').order('name');
  return data || [];
}

export async function addMember(data: Omit<Member, 'id'>): Promise<Member> {
  const { data: result, error } = await supabase.from('members').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateMember(id: string, data: Omit<Member, 'id'>): Promise<void> {
  const { error } = await supabase.from('members').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

// ---- CRUD: Events ----

export async function getEvents(): Promise<GolfEvent[]> {
  const { data } = await supabase.from('events').select('*').order('date', { ascending: false });
  return data || [];
}

export async function addEvent(data: Omit<GolfEvent, 'id'>): Promise<GolfEvent> {
  const { data: result, error } = await supabase.from('events').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateEvent(id: string, data: Omit<GolfEvent, 'id'>): Promise<void> {
  const { error } = await supabase.from('events').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ---- CRUD: Transactions ----

export async function getTransactions(): Promise<Transaction[]> {
  const { data } = await supabase.from('transactions').select('*').order('date', { ascending: true });
  return data || [];
}

export async function addTransaction(data: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { data: result, error } = await supabase.from('transactions').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateTransaction(id: string, data: Omit<Transaction, 'id'>): Promise<void> {
  const { error } = await supabase.from('transactions').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// ---- Active member count ----

export async function getActiveMemberCount(): Promise<number> {
  const { count } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active');
  return count || 0;
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
