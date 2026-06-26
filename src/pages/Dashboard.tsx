import { useEffect, useState, useCallback } from 'react';
import {
  type Transaction,
  getTotalIncome, getTotalExpense, getBalance,
  getCurrentMonthTransactions, formatCurrency, getMonthLabel,
  getTransactions, getMembers, getEvents,
  EXPENSE_CATEGORIES,
} from '../db';
import { useT } from '../i18n/useT';
import { exportToExcel } from '../utils/export';

interface MonthlyStats {
  label: string;
  income: number;
  expense: number;
}

export default function Dashboard() {
  const { t } = useT();
  const [balance, setBalance] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ name: string; amount: number }[]>([]);

  const refresh = useCallback(async () => {
    const [txs, allMembers, events] = await Promise.all([getTransactions(), getMembers(), getEvents()]);
    // Active members: participated in events within the last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentEventEmails = new Set<string>();
    events.forEach(ev => {
      if (new Date(ev.date) >= oneYearAgo) {
        try { JSON.parse(ev.attendees || '[]').forEach((e: string) => recentEventEmails.add(e.toLowerCase())); } catch {}
      }
    });
    // Also check transactions linked to events in past year
    const recentEventIds = new Set(events.filter(e => new Date(e.date) >= oneYearAgo).map(e => e.id));
    const recentTxMembers = new Set(txs.filter(t => t.eventId && recentEventIds.has(t.eventId)).map(t => t.description));
    const count = allMembers.filter(m => {
      if (m.email && recentEventEmails.has(m.email.toLowerCase())) return true;
      if (recentTxMembers.has(m.name)) return true;
      return false;
    }).length;

    setBalance(getBalance(txs));
    setTotalIncome(getTotalIncome(txs));
    setTotalExpense(getTotalExpense(txs));

    // Cash & bank balances
    const cashTxs = txs.filter(t => t.paymentMethod === 'efectivo' || !t.paymentMethod);
    const bankTxs = txs.filter(t => t.paymentMethod === 'banco');
    setCashBalance(getBalance(cashTxs));
    setBankBalance(getBalance(bankTxs));
    setMemberCount(count);

    const monthTxs = getCurrentMonthTransactions(txs);
    setMonthIncome(getTotalIncome(monthTxs));
    setMonthExpense(getTotalExpense(monthTxs));

    setRecentTx(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10));

    const stats: MonthlyStats[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const y = now.getFullYear();
      const m = now.getMonth() - i;
      const d = new Date(y, m, 1);
      const monthTxs = txs.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });
      stats.push({
        label: getMonthLabel(d.getFullYear(), d.getMonth()),
        income: getTotalIncome(monthTxs),
        expense: getTotalExpense(monthTxs),
      });
    }
    setMonthlyStats(stats);

    const cats = EXPENSE_CATEGORIES.map(cat => ({
      name: cat,
      amount: txs.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0),
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    setCategoryBreakdown(cats);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const maxMonthly = Math.max(...monthlyStats.map(s => Math.max(s.income, s.expense)), 1);

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="logo.png" alt="Logo" style={{ width: 48, marginRight: 4 }} />
          <h1 className="page-title">{t('app_name')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => exportToExcel()}>{t('export_btn')}</button>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)', color: 'white' }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>{t('total_balance')}</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{formatCurrency(balance)}</div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, opacity: 0.9 }}>
          <span>{t('total_income')} {formatCurrency(totalIncome)}</span>
          <span>{t('total_expense')} {formatCurrency(totalExpense)}</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">💵 现金余额</div>
          <div className={`stat-value ${cashBalance >= 0 ? 'green' : 'red'}`}>{formatCurrency(cashBalance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🏦 银行余额</div>
          <div className={`stat-value ${bankBalance >= 0 ? 'green' : 'red'}`}>{formatCurrency(bankBalance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('member_count')}</div>
          <div className="stat-value gold">{memberCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('month_balance')}</div>
          <div className={`stat-value ${monthIncome - monthExpense >= 0 ? 'green' : 'red'}`}>
            {formatCurrency(monthIncome - monthExpense)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">{t('six_month_chart')}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, paddingTop: 10 }}>
          {monthlyStats.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 110 }}>
                <div title={`收入 ${formatCurrency(s.income)}`} style={{
                  width: 12, height: `${(s.income / maxMonthly) * 100}%`,
                  background: '#4CAF50', borderRadius: '4px 4px 0 0', minHeight: 2,
                }} />
                <div title={`支出 ${formatCurrency(s.expense)}`} style={{
                  width: 12, height: `${(s.expense / maxMonthly) * 100}%`,
                  background: '#f44336', borderRadius: '4px 4px 0 0', minHeight: 2,
                }} />
              </div>
              <span style={{ fontSize: 9, color: '#888', marginTop: 4, whiteSpace: 'nowrap' }}>{s.label.replace(/^\d+年/, '')}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontSize: 12, color: '#888' }}>
          <span>🟢 {t('tx_income')}</span><span>{t('tx_expense')}</span>
        </div>
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="card">
          <div className="section-title">{t('expense_categories')}</div>
          {categoryBreakdown.map((c, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span>{c.name}</span>
                <span className="amount-expense">{formatCurrency(c.amount)}</span>
              </div>
              <div className="budget-bar">
                <div className="budget-bar-fill safe" style={{ width: `${totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="section-title">{t('recent_records')}</div>
        {recentTx.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize: 36, marginBottom: 8 }}>📝</div><div>{t('no_records')}</div></div>
        ) : (
          recentTx.map(tx => (
            <div key={tx.id} className="list-item" style={{ gap: 6, padding: '10px 0', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{tx.description}</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 1 }}>
                  <span style={{ color: '#888', fontSize: 10, whiteSpace: 'nowrap' }}>{tx.category} · {tx.date}</span>
                  {tx.paymentMethod === 'banco' && <span style={{ fontSize: 9, fontWeight: 600, color: '#1565C0', background: '#E3F2FD', padding: '1px 3px', borderRadius: 2, whiteSpace: 'nowrap' }}>🏦</span>}
                  {tx.paymentMethod === 'efectivo' && <span style={{ fontSize: 9, fontWeight: 600, color: '#2E7D32', background: '#E8F5E9', padding: '1px 3px', borderRadius: 2, whiteSpace: 'nowrap' }}>💵</span>}
                </div>
              </div>
              <span className={tx.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))
        )}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
