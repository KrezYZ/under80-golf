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
  time: string;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes: string;
  attendees: string;
  meeting_time?: string;
  registration_deadline?: string | null;
  capacity?: number | null;
  results_published?: boolean;
  attendee_count?: number;
  is_registered?: boolean;
}

export interface EventRegistration { id: string; event_id: string; user_id: string; member_id: string | null; status: 'registered' | 'cancelled'; registered_at: string; member?: Pick<Member, 'id'|'name'|'licencia'>; }
export interface TeeAssignment { id: string; event_id: string; member_id: string; group_name: string; tee: string; tee_time: string; notes: string; member?: Pick<Member, 'id'|'name'|'licencia'>; }
export interface EventResult { id: string; event_id: string; member_id: string; stableford: number; gross_score?: number | null; handicap_playing?: number | null; position?: number | null; source: 'manual'|'golf_directo'; notes: string; member?: Pick<Member, 'id'|'name'|'licencia'>; }
export interface RankingRow { year: number; member_id: string; name: string; licencia: string; events_played: number; total_stableford: number; best_round: number; average_stableford: number; ranking: number; }
export interface AppNotification { id: string; title: string; body: string; event_id?: string | null; read_at?: string | null; delivered_at?: string | null; created_at: string; }

export interface Transaction {
  id: string;
  eventId?: string | null;
  memberId?: string | null;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: string;
}

// ---- Categories ----

export const INCOME_CATEGORIES = ['参赛费', '会员会费', '赞助', '捐赠', '其他收入'];
export const EXPENSE_CATEGORIES = ['场地费', '奖品', '餐饮', '设备器材', '交通', '保险', '其他支出'];

// ---- CRUD: Members ----

export async function getMembers(): Promise<Member[]> {
  const { data } = await supabase.from('members').select('*').order('name');
  return data || [];
}

export async function getMemberDirectory(): Promise<Pick<Member, 'id'|'name'|'licencia'>[]> {
  const { data, error } = await supabase.rpc('get_member_directory');
  if (error) throw error;
  return data || [];
}

export async function getMyMemberIdentity(): Promise<Pick<Member, 'id'|'name'|'licencia'> | null> {
  const { data, error } = await supabase.rpc('get_my_member_identity');
  if (error) throw error;
  return data?.[0] || null;
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

export async function getEvents(access: 'public'|'admin' = 'public'): Promise<GolfEvent[]> {
  if (access === 'admin') {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const { data, error } = await supabase.rpc('get_events_public');
  if (error) throw error;
  return (data || []).map((event: GolfEvent) => ({ ...event, attendees: '[]' }));
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

export async function getRegistrations(eventId: string): Promise<EventRegistration[]> {
  const { data, error } = await supabase.from('event_registrations').select('*').eq('event_id', eventId).eq('status', 'registered');
  if (error) throw error;
  return data || [];
}

export async function toggleEventRegistration(eventId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_event_registration', { p_event_id: eventId });
  if (error) throw error;
  return data === true;
}

export async function getTeeAssignments(eventId: string): Promise<TeeAssignment[]> {
  const { data, error } = await supabase.from('tee_assignments').select('*').eq('event_id', eventId).order('tee_time');
  if (error) throw error;
  return data || [];
}

export async function saveTeeAssignment(value: Omit<TeeAssignment, 'id'|'member'>): Promise<void> {
  const { error } = await supabase.from('tee_assignments').upsert(value, { onConflict: 'event_id,member_id' });
  if (error) throw error;
}

export async function getEventResults(eventId: string): Promise<EventResult[]> {
  const { data, error } = await supabase.from('event_results').select('*').eq('event_id', eventId).order('stableford', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveEventResult(value: Omit<EventResult, 'id'|'member'>): Promise<void> {
  const { error } = await supabase.from('event_results').upsert(value, { onConflict: 'event_id,member_id' });
  if (error) throw error;
}

export async function getAnnualRanking(year: number): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc('get_annual_stableford_ranking', { p_year: year });
  if (error) throw error;
  return data || [];
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Login required');
  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: subscription.endpoint, subscription: json, updated_at: new Date().toISOString() }, { onConflict: 'user_id,endpoint' });
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
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

// ---- Auto-backup ----

let backupTimer: any = null;
export async function autoBackup(label: string = 'auto') {
  clearTimeout(backupTimer);
  backupTimer = setTimeout(async () => {
    try {
      const [members, events, transactions, registrations, teeAssignments, eventResults] = await Promise.all([
        getMembers(), getEvents('admin'), getTransactions(),
        supabase.from('event_registrations').select('*').then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('tee_assignments').select('*').then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('event_results').select('*').then(({ data, error }) => { if (error) throw error; return data || []; }),
      ]);
      await supabase.from('backups').insert({
        label,
        data: { members, events, transactions, registrations, teeAssignments, eventResults },
      });
    } catch (e) {
      console.error('Backup failed:', e);
    }
  }, 2000); // Debounce 2s
}

export async function getBackups(): Promise<{ id: string; created_at: string; label: string }[]> {
  const { data } = await supabase.from('backups').select('id,created_at,label').order('created_at', { ascending: false }).limit(20);
  return data || [];
}

export async function restoreBackup(id: string): Promise<void> {
  const { data } = await supabase.from('backups').select('data').eq('id', id).single();
  if (!data?.data) throw new Error('Backup not found');
  const { members, events, transactions } = data.data;

  // Clear and restore
  await supabase.from('transactions').delete().neq('id', '0');
  await supabase.from('members').delete().neq('id', '0');
  await supabase.from('events').delete().neq('id', '0');

  for (const e of events) await supabase.from('events').insert(e);
  for (const m of members) await supabase.from('members').insert(m);
  for (const t of transactions) await supabase.from('transactions').insert(t);
}
