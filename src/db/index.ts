// Database layer — auto-selects Firebase or local storage
import { isFirebaseConfigured } from '../firebase/config';
import * as firestore from './firestore';
import * as localStore from './localStore';

const store = isFirebaseConfigured() ? firestore : localStore;

// Types
export type { Member, GolfEvent, Transaction } from './firestore';

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
} from './firestore';

// Seed (only when using local store)
export { seedFirestore } from './firestore';
