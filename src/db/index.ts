// Database layer — uses Supabase
import { isSupabaseConfigured } from '../firebase/config';
import * as supabase from './supabase';
import * as localStore from './localStore';

const store = isSupabaseConfigured() ? supabase : localStore;

// Types
export type { Member, GolfEvent, Transaction, EventRegistration, TeeAssignment, LineupEntry, EventResult, RankingRow, AppNotification } from './supabase';

// CRUD
export const getMembers = store.getMembers;
export const addMember = store.addMember;
export const updateMember = store.updateMember;
export const deleteMember = store.deleteMember;

export const getEvents = store.getEvents;
export const addEvent = store.addEvent;
export const updateEvent = store.updateEvent;
export const deleteEvent = store.deleteEvent;
export const getRegistrations = supabase.getRegistrations;
export const toggleEventRegistration = supabase.toggleEventRegistration;
export const getTeeAssignments = supabase.getTeeAssignments;
export const getEventLineup = supabase.getEventLineup;
export const saveTeeAssignment = supabase.saveTeeAssignment;
export const saveTeeAssignments = supabase.saveTeeAssignments;
export const getEventResults = supabase.getEventResults;
export const saveEventResult = supabase.saveEventResult;
export const saveEventResults = supabase.saveEventResults;
export const getAnnualRanking = supabase.getAnnualRanking;
export const getNotifications = supabase.getNotifications;
export const savePushSubscription = supabase.savePushSubscription;
export const markNotificationRead = supabase.markNotificationRead;
export const getMemberDirectory = supabase.getMemberDirectory;
export const getMyMemberIdentity = supabase.getMyMemberIdentity;

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

// Backup
export { autoBackup, getBackups, restoreBackup } from './supabase';
