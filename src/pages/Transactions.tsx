import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getEvents, type Transaction, type GolfEvent,
  getBalance, formatCurrency, formatDate,
  autoBackup,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES,
} from '../db';
import { useAuth } from '../hooks/useAuth';

function fmtShort(d: string) {
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

export default function Transactions() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ eventId: string; type: 'income' | 'expense'; category: string; amount: string; description: string; date: string; paymentMethod: string }>({
    eventId: '', type: 'expense', category: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10), paymentMethod: '',
  });

  const load = useCallback(async () => {
    const [txs, evts] = await Promise.all([getTransactions(), getEvents()]);
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setTransactions(txs);
    setEvents(evts);
  }, []);

  useEffect(() => { load(); }, [load]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Auto-expand most recent month on first load
  useEffect(() => {
    if (availableMonths.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([availableMonths[0]]));
    }
  }, [availableMonths]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filter !== 'all') result = result.filter(t => t.type === filter);
    if (monthFilter !== 'all') {
      result = result.filter(t => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthFilter;
      });
    }
    return result;
  }, [transactions, filter, monthFilter]);

  const runningBalance = useMemo(() => {
    let bal = 0;
    return filtered.map(tx => { bal += tx.type === 'income' ? tx.amount : -tx.amount; return bal; });
  }, [filtered]);

  const overallBalance = getBalance(transactions);
  const cashBalance = getBalance(transactions.filter(t => t.paymentMethod === 'efectivo' || !t.paymentMethod));
  const bankBalance = getBalance(transactions.filter(t => t.paymentMethod === 'banco'));

  const openNew = (type: 'income' | 'expense' = 'expense') => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ eventId: '', type, category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0], amount: '', description: '', date: new Date().toISOString().slice(0, 10), paymentMethod: '' });
    setShowForm(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({ eventId: tx.eventId || '', type: tx.type, category: tx.category, amount: String(tx.amount), description: tx.description, date: tx.date, paymentMethod: tx.paymentMethod || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!isAdmin || !form.amount || !form.description.trim() || !form.category) return;
    const data = { eventId: form.eventId || undefined, type: form.type, category: form.category, amount: Number(form.amount), description: form.description.trim(), date: form.date, paymentMethod: form.paymentMethod || '' };
    if (editing) { await updateTransaction(editing.id, data); }
    else { await addTransaction(data); }
    setShowForm(false); load(); autoBackup('编辑/添加交易');
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('确定删除该记录？')) { await deleteTransaction(id); load(); autoBackup('删除交易'); }
  };

  const getEventName = (eventId?: string | null) => {
    if (!eventId) return null;
    const ev = events.find(e => e.id === eventId);
    return ev ? ev.name : null;
  };

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const grouped = useMemo(() => {
    const groups: { label: string; items: { tx: Transaction; balance: number }[] }[] = [];
    filtered.forEach((tx, i) => {
      const d = new Date(tx.date);
      const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      let group = groups[groups.length - 1];
      if (!group || group.label !== label) { group = { label, items: [] }; groups.push(group); }
      group.items.push({ tx, balance: runningBalance[i] });
    });
    groups.reverse(); groups.forEach(g => g.items.reverse()); return groups;
  }, [filtered, runningBalance]);

  useEffect(() => {
    if (showForm) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  return (
    <div className="page" style={{ padding: '16px 8px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div className="page-header" style={{ paddingLeft: 8, paddingRight: 8 }}>
        <h1 className="page-title">📒 账本</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => openNew('expense')}>+ 记录</button>}
      </div>

      {/* Balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, padding: '0 8px' }}>
        <div className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>💰 总余额</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: overallBalance >= 0 ? '#2E7D32' : '#C62828' }}>{formatCurrency(overallBalance)}</div>
        </div>
        <div className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>💵 现金</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: cashBalance >= 0 ? '#2E7D32' : '#C62828' }}>{formatCurrency(cashBalance)}</div>
        </div>
        <div className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>🏦 银行</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: bankBalance >= 0 ? '#2E7D32' : '#C62828' }}>{formatCurrency(bankBalance)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 8px' }}>
        <div className="filter-pills">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? '全部' : f === 'income' ? '📈 收入' : '📉 支出'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <select className="select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            style={{ fontSize: 13, padding: '6px 28px 6px 12px', width: 'auto' }}>
            <option value="all">📅 全部月份</option>
            {availableMonths.map(m => { const [y, mo] = m.split('-'); return <option key={m} value={m}>{y}年{parseInt(mo)}月</option>; })}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}>📝</div><div>暂无记录</div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', margin: '0 8px' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 100px 80px', gap: 6, padding: '8px 14px', background: '#1B5E20', color: 'white', fontSize: 12, fontWeight: 700, position: 'sticky', top: 0, zIndex: 2 }}>
            <span>日期</span>
            <span>描述</span>
            <span style={{ textAlign: 'right' }}>金额</span>
            <span style={{ textAlign: 'right' }}>余额</span>
          </div>
          {grouped.map((group) => (
            <div key={group.label}>
              <div onClick={() => {
                const next = new Set(expandedMonths);
                if (next.has(group.label)) next.delete(group.label);
                else next.add(group.label);
                setExpandedMonths(next);
              }} style={{ background: '#f5f7f5', padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#1B5E20', borderBottom: expandedMonths.has(group.label) ? '1px solid #e0e6e0' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📅 {group.label} ({group.items.length})</span>
                <span style={{ color: '#888' }}>{expandedMonths.has(group.label) ? '▲' : '▼'}</span>
              </div>
              {expandedMonths.has(group.label) && group.items.map(({ tx, balance }, idx) => {
                const evName = getEventName(tx.eventId);
                return (
                  <div key={tx.id} onClick={() => openEdit(tx)}
                    style={{
                      display: 'grid', gridTemplateColumns: '70px 1fr 100px 80px', gap: 6, padding: '10px 14px',
                      borderBottom: idx < group.items.length - 1 ? '1px solid #f0f0f0' : 'none',
                      alignItems: 'center', cursor: 'pointer', lineHeight: 1.4,
                    }}>
                    <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>{fmtShort(tx.date)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{tx.category}</span>
                        {tx.paymentMethod === 'banco' && <span style={{ fontSize: 10, fontWeight: 600, color: '#1565C0', background: '#E3F2FD', padding: '1px 5px', borderRadius: 3 }}>🏦 银行</span>}
                        {tx.paymentMethod === 'efectivo' && <span style={{ fontSize: 10, fontWeight: 600, color: '#2E7D32', background: '#E8F5E9', padding: '1px 5px', borderRadius: 3 }}>💵 现金</span>}
                        {evName && <span style={{ fontSize: 11, color: '#4CAF50' }}>🏌️ {evName}</span>}
                      </div>
                    </div>
                    <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: tx.type === 'income' ? '#2E7D32' : '#C62828', whiteSpace: 'nowrap' }}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: balance >= 0 ? '#2E7D32' : '#C62828', whiteSpace: 'nowrap' }}>
                      {balance >= 0 ? '' : '-'}€{Math.abs(balance).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 80 }} />
      {isAdmin && <button className="fab" onClick={() => openNew('expense')}>+</button>}

      {/* Modal Form — unchanged */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1B5E20' }}>
              {editing ? (isAdmin ? '编辑记录' : '记录详情') : '添加记录'}
            </h2>
            <div className="form-group">
              <label className="label">类型</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn btn-sm ${form.type === 'income' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, type: 'income', category: INCOME_CATEGORIES[0] })} style={{ flex: 1 }} disabled={!isAdmin}>📈 收入</button>
                <button className={`btn btn-sm ${form.type === 'expense' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setForm({ ...form, type: 'expense', category: EXPENSE_CATEGORIES[0] })} style={{ flex: 1 }} disabled={!isAdmin}>📉 支出</button>
              </div>
            </div>
            <div className="form-group"><label className="label">金额 *</label><input className="input" type="number" inputMode="decimal" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" disabled={!isAdmin && !!editing} /></div>
            <div className="form-group"><label className="label">分类 *</label><select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={!isAdmin && !!editing}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="label">描述 *</label><input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="例如：GREEN FEE 或 会员年费" disabled={!isAdmin && !!editing} /></div>
            <div className="form-group"><label className="label">日期</label><input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={!isAdmin && !!editing} /></div>
            {isAdmin && (
              <div className="form-group">
                <label className="label">付款方式</label>
                <select className="select" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="">未指定</option>
                  <option value="efectivo">💵 现金</option>
                  <option value="banco">🏦 银行</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label">关联比赛（可选）</label>
              <select className="select" value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })} disabled={!isAdmin && !!editing}>
                <option value="">不关联</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.date)})</option>)}
              </select>
            </div>
            {isAdmin && (
              <>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button className="btn btn-block btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>取消</button>
                  <button className="btn btn-block btn-primary" onClick={handleSave} style={{ flex: 1 }}>保存</button>
                </div>
                {editing && <div style={{ marginTop: 10 }}><button className="btn btn-block btn-danger" onClick={() => { handleDelete(editing.id); setShowForm(false); }}>删除</button></div>}
              </>
            )}
            {!isAdmin && editing && <div style={{ marginTop: 20 }}><button className="btn btn-block btn-outline" onClick={() => setShowForm(false)}>关闭</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}
