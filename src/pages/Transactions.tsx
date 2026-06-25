import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getEvents, type Transaction, type GolfEvent,
  getBalance, formatCurrency, formatDate,
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
  const [form, setForm] = useState<{ eventId: string; type: 'income' | 'expense'; category: string; amount: string; description: string; date: string }>({
    eventId: '', type: 'expense', category: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10), paymentMethod: '',
  });

  const load = useCallback(async () => {
    const [txs, evts] = await Promise.all([getTransactions(), getEvents()]);
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setTransactions(txs);
    setEvents(evts);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const runningBalance = useMemo(() => {
    let bal = 0;
    return filtered.map(tx => { bal += tx.type === 'income' ? tx.amount : -tx.amount; return bal; });
  }, [filtered]);

  const overallBalance = getBalance(transactions);

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
    const data = {
      eventId: form.eventId || undefined,
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      description: form.description.trim(),
      date: form.date,
      paymentMethod: form.paymentMethod || '',
    };
    if (editing) {
      await updateTransaction(editing.id, data);
    } else {
      await addTransaction(data);
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('确定删除该记录？')) {
      await deleteTransaction(id);
      load();
    }
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
      if (!group || group.label !== label) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push({ tx, balance: runningBalance[i] });
    });
    return groups;
  }, [filtered, runningBalance]);

  useEffect(() => {
    if (showForm) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📒 账本</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => openNew('expense')}>+ 记录</button>}
      </div>

      <div className="card" style={{ background: overallBalance >= 0 ? '#E8F5E9' : '#FFEBEE', padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>💰 总余额</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: overallBalance >= 0 ? '#2E7D32' : '#C62828' }}>{formatCurrency(overallBalance)}</span>
        </div>
      </div>

      <div className="filter-pills">
        {(['all', 'income', 'expense'] as const).map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '全部' : f === 'income' ? '📈 收入' : '📉 支出'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}>📝</div><div>暂无记录</div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {grouped.map((group, gi) => (
            <div key={gi}>
              <div style={{ background: '#f5f7f5', padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#1B5E20', borderBottom: '1px solid #e0e6e0', position: 'sticky', top: 0, zIndex: 1 }}>
                📅 {group.label}
              </div>
              {group.items.map(({ tx, balance }, idx) => {
                const evName = getEventName(tx.eventId);
                return (
                  <div key={tx.id} onClick={() => openEdit(tx)}
                    style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 22px', gap: '4px', padding: '10px 12px', borderBottom: idx < group.items.length - 1 ? '1px solid #f0f0f0' : 'none', alignItems: 'center', fontSize: 14, cursor: 'pointer', lineHeight: 1.4 }}>
                    <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{fmtShort(tx.date)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 1 }}>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{tx.category}</span>
                        {evName && <span style={{ fontSize: 11, color: '#4CAF50' }}>🏌️ {evName}</span>}
                      </div>
                    </div>
                    <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: tx.type === 'income' ? '#2E7D32' : '#C62828', whiteSpace: 'nowrap' }}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                    </span>
                    <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: balance >= 0 ? '#2E7D32' : '#C62828', whiteSpace: 'nowrap', paddingLeft: 4, borderLeft: '1px solid #f0f0f0' }}>
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
                <button className={`btn btn-sm ${form.type === 'income' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setForm({ ...form, type: 'income', category: INCOME_CATEGORIES[0] })}
                  style={{ flex: 1 }} disabled={!isAdmin}>📈 收入</button>
                <button className={`btn btn-sm ${form.type === 'expense' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setForm({ ...form, type: 'expense', category: EXPENSE_CATEGORIES[0] })}
                  style={{ flex: 1 }} disabled={!isAdmin}>📉 支出</button>
              </div>
            </div>

            <div className="form-group">
              <label className="label">金额 *</label>
              <input className="input" type="number" inputMode="decimal" step="0.01" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" disabled={!isAdmin && !!editing} />
            </div>

            <div className="form-group">
              <label className="label">分类 *</label>
              <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={!isAdmin && !!editing}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">描述 *</label>
              <input className="input" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} placeholder="例如：GREEN FEE 或 会员年费" disabled={!isAdmin && !!editing} />
            </div>

            <div className="form-group">
              <label className="label">日期</label>
              <input className="input" type="date" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })} disabled={!isAdmin && !!editing} />
            </div>

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
                {editing && (
                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-block btn-danger" onClick={() => { handleDelete(editing.id); setShowForm(false); }}>删除</button>
                  </div>
                )}
              </>
            )}
            {!isAdmin && editing && (
              <div style={{ marginTop: 20 }}>
                <button className="btn btn-block btn-outline" onClick={() => setShowForm(false)}>关闭</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
