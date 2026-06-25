import { useState, useEffect, useCallback } from 'react';
import { getMembers, addMember, updateMember, deleteMember, type Member, formatDate } from '../db';
import { useAuth } from '../hooks/useAuth';

export default function Members() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', licencia: '', status: 'active' as const, notes: '',
  });

  const load = useCallback(async () => {
    const all = await getMembers();
    setMembers(all.sort((a, b) => a.name.localeCompare(b.name, 'zh')));
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = search.toLowerCase();
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(s) ||
    m.phone.includes(search) ||
    (m.email && m.email.toLowerCase().includes(s)) ||
    (m.licencia && m.licencia.toLowerCase().includes(s))
  );

  const active = filtered.filter(m => m.status === 'active');
  const inactive = filtered.filter(m => m.status === 'inactive');

  useEffect(() => {
    if (showForm) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  const openNew = () => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ name: '', phone: '', email: '', licencia: '', status: 'active', notes: '' });
    setShowForm(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone, email: m.email, licencia: m.licencia || '', status: m.status, notes: m.notes });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!isAdmin || !form.name.trim()) return;
    if (editing) {
      await updateMember(editing.id, { ...form, joinDate: editing.joinDate });
    } else {
      await addMember({ ...form, joinDate: new Date().toISOString().slice(0, 10) });
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('确定删除该会员？')) {
      await deleteMember(id);
      load();
    }
  };

  const renderMemberList = (list: Member[], title: string) => (
    list.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>
          {title} ({list.length})
        </div>
        {list.map(m => (
          <div key={m.id} className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => openEdit(m)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="member-avatar">{m.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                {m.licencia && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {m.licencia}
                  </div>
                )}
                {/* Admin sees extra info on card */}
                {isAdmin && (
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>
                    {m.phone && <span>{m.phone} · </span>}
                    {m.email && <span>{m.email}</span>}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span className={`tag ${m.status === 'active' ? 'tag-income' : 'tag-expense'}`}>
                  {m.status === 'active' ? '活跃' : '停用'}
                </span>
                {isAdmin && <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{formatDate(m.joinDate)}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👥 会员管理</h1>
        <span style={{ color: '#888', fontSize: 13 }}>共 {members.length} 人</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="input" placeholder="🔍 搜索姓名/电话/执照..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={openNew}>+ 添加</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}>👤</div><div>{search ? '没有匹配的会员' : '还没有会员'}</div></div>
      ) : (
        <>
          {renderMemberList(active, '活跃会员')}
          {renderMemberList(inactive, '停用会员')}
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1B5E20' }}>
              {editing ? (isAdmin ? '编辑会员' : '会员详情') : '添加会员'}
            </h2>

            {/* Name — visible to all */}
            <div className="form-group">
              <label className="label">姓名 *</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="会员姓名" disabled={!isAdmin} />
            </div>

            {/* Licencia — visible to all */}
            <div className="form-group">
              <label className="label">Licencia</label>
              <input className="input" value={form.licencia} onChange={e => setForm({ ...form, licencia: e.target.value })} placeholder="执照号码" disabled={!isAdmin} />
            </div>

            {/* Admin-only fields */}
            {isAdmin && (
              <>
                <div className="form-group">
                  <label className="label">手机号码</label>
                  <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="手机号" />
                </div>
                <div className="form-group">
                  <label className="label">邮箱</label>
                  <input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label className="label">状态</label>
                  <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' })}>
                    <option value="active">活跃</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">备注</label>
                  <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="备注信息" />
                </div>
              </>
            )}

            {isAdmin && editing && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="label">加入日期</label>
                <input className="input" value={editing.joinDate} disabled />
              </div>
            )}

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
            {!isAdmin && (
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
