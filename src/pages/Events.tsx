import { useState, useEffect, useCallback } from 'react';
import { getEvents, addEvent, updateEvent, deleteEvent, getTransactions, type GolfEvent, getEventBalance, formatCurrency, formatDate } from '../db/firestore';
import { useAuth } from '../hooks/useAuth';

export default function Events() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GolfEvent | null>(null);
  const [form, setForm] = useState<{ name: string; date: string; location: string; status: 'upcoming' | 'completed' | 'cancelled'; notes: string }>({
    name: '', date: '', location: '', status: 'upcoming', notes: '',
  });
  const [eventBalances, setEventBalances] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [all, txs] = await Promise.all([getEvents(), getTransactions()]);
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEvents(all);
    const balances: Record<string, number> = {};
    for (const ev of all) {
      balances[ev.id] = getEventBalance(txs, ev.id);
    }
    setEventBalances(balances);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showForm) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  const openNew = () => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ name: '', date: new Date().toISOString().slice(0, 10), location: '', status: 'upcoming', notes: '' });
    setShowForm(true);
  };

  const openEdit = (ev: GolfEvent) => {
    setEditing(ev);
    setForm({ name: ev.name, date: ev.date, location: ev.location, status: ev.status, notes: ev.notes });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!isAdmin || !form.name.trim() || !form.date) return;
    if (editing) {
      await updateEvent(editing.id, form);
    } else {
      await addEvent(form);
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('确定删除该比赛？关联的交易记录不会被删除。')) {
      await deleteEvent(id);
      load();
    }
  };

  const upcoming = events.filter(e => e.status === 'upcoming');
  const past = events.filter(e => e.status !== 'upcoming');

  const renderEventList = (list: GolfEvent[], title: string) => (
    list.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>
          {title} ({list.length})
        </div>
        {list.map(ev => (
          <div key={ev.id} className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => openEdit(ev)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{ev.name}</div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  📅 {formatDate(ev.date)}{ev.location ? ` · 📍 ${ev.location}` : ''}
                </div>
              </div>
              <span className={`tag ${ev.status === 'upcoming' ? 'tag-income' : ev.status === 'completed' ? 'tag-income' : 'tag-expense'}`}>
                {ev.status === 'upcoming' ? '即将举行' : ev.status === 'completed' ? '已结束' : '已取消'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <span style={{ color: '#888' }}>收支结余</span>
              <span className={eventBalances[ev.id] >= 0 ? 'amount-income' : 'amount-expense'}>
                {formatCurrency(eventBalances[ev.id] || 0)}
              </span>
            </div>
            {ev.notes && <div style={{ fontSize: 12, color: '#bbb', marginTop: 6 }}>📝 {ev.notes}</div>}
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏆 比赛管理</h1>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={openNew}>+ 新建</button>}
      </div>

      {events.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}>⛳</div><div>还没有比赛记录</div></div>
      ) : (
        <>
          {renderEventList(upcoming, '即将举行')}
          {renderEventList(past, '已结束/已取消')}
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1B5E20' }}>
              {editing ? (isAdmin ? '编辑比赛' : '比赛详情') : '新建比赛'}
            </h2>
            <div className="form-group">
              <label className="label">比赛名称 *</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例如：6月月例赛" disabled={!isAdmin && !!editing} />
            </div>
            <div className="form-group">
              <label className="label">日期 *</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={!isAdmin && !!editing} />
            </div>
            <div className="form-group">
              <label className="label">地点</label>
              <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="球场名称" disabled={!isAdmin && !!editing} />
            </div>
            <div className="form-group">
              <label className="label">状态</label>
              <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'upcoming' })} disabled={!isAdmin}>
                <option value="upcoming">即将举行</option>
                <option value="completed">已结束</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">备注</label>
              <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="比赛备注" disabled={!isAdmin && !!editing} />
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
