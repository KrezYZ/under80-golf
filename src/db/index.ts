// Database layer — uses Supabase
import { isSupabaseConfigured } from '../firebase/config';
import * as supabase from './supabase';
import * as localStore from './localStore';

const store = isSupabaseConfigured() ? supabase : localStore;

// Types
export type { Member, GolfEvent, Transaction } from './supabase';

// CRUD
export const getMembers = store.getMembers;
export const addMember = store.addMember;
export const updateMember = store.updateMember;
export const deleteMember = store.deleteMember;

export const getEvents = store.getEvents;
export const addEvent = store.addEvent;
export const updateEvent = store.updateEvent;
export const deleteEvent = store.deleteEvent;

export const getTransactions = store.getTransactions;
export const addTransaction = store.addTransaction;
export const updateTransaction = store.updateTransaction;
export const deleteTransaction = store.deleteTransaction;

export const getActiveMemberCount = store.getActiveMemberCount;

// Categories & helpers (same regardless of backend)
export {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES,
  getTotalIncome, getTotalExpense, getBalance, getEventBalance,
  getTransactionsByMonth, getCurrentMonthTransactions,
  formatCurrency, formatDate, getMonthLabel, getRunningBalance,
} from './supabase';
