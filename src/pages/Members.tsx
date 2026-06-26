import { useState, useEffect, useCallback } from 'react';
import { getMembers, addMember, updateMember, deleteMember, type Member, autoBackup, formatDate } from '../db';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

export default function Members() {
  const { isAdmin } = useAuth(); const { t } = useT();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', licencia: '', genero: '', status: 'active' as 'active' | 'inactive', notes: '',
  });

  const load = useCallback(async () => {
    const all = await getMembers();
    setMembers(all.sort((a, b) => a.name.localeCompare(b.name, 'zh')));
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = search.toLowerCase();
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(s) ||
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
    setForm({ name: '', phone: '', email: '', licencia: '', genero: '', status: 'active', notes: '' });
    setShowForm(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone, email: m.email, licencia: m.licencia || '', genero: m.genero || '', status: m.status, notes: m.notes });
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
    load(); autoBackup('编辑/添加会员');
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('确定删除该会员？')) {
      await deleteMember(id);
      load(); autoBackup('删除会员');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👥 {t("mb_title")}</h1>
        <span style={{ color: '#888', fontSize: 13 }}>共 {members.length} 人 · 男 {members.filter(m=>m.genero==='M').length} · 女 {members.filter(m=>m.genero==='F').length}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="input" placeholder="🔍 搜索姓名/执照..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={openNew}>t('mb_add')</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize: 48 }}>👤</div><div>{search ? '没有匹配的会员' : '还没有会员'}</div></div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>活跃会员 ({active.length})</div>
              {active.map(m => isAdmin ? <AdminCard key={m.id} m={m} onClick={() => openEdit(m)} /> : <PublicCard key={m.id} m={m} onClick={() => openEdit(m)} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>停用会员 ({inactive.length})</div>
              {inactive.map(m => isAdmin ? <AdminCard key={m.id} m={m} onClick={() => openEdit(m)} /> : <PublicCard key={m.id} m={m} onClick={() => openEdit(m)} />)}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1B5E20' }}>
              {editing ? (isAdmin ? '编辑会员' : '会员详情') : '添加会员'}
            </h2>

            <div className="form-group">
              <label className="label">姓名</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="会员姓名" disabled={!isAdmin} />
            </div>

            <div className="form-group">
              <label className="label">Licencia</label>
              <input className="input" value={form.licencia} onChange={e => setForm({ ...form, licencia: e.target.value })} placeholder="执照号码" disabled={!isAdmin} />
            </div>

            <div className="form-group">
              <label className="label">性别</label>
              <select className="select" value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })} disabled={!isAdmin}>
                <option value="">未指定</option>
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </div>

            {isAdmin && (
              <>
                <div className="form-group"><label className="label">手机号码</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="手机号" /></div>
                <div className="form-group"><label className="label">邮箱</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
                <div className="form-group"><label className="label">状态</label><select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' })}><option value="active">活跃</option><option value="inactive">停用</option></select></div>
                <div className="form-group"><label className="label">备注</label><input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="备注信息" /></div>
                {editing && editing.joinDate && <div className="form-group"><label className="label">加入日期</label><input className="input" value={formatDate(editing.joinDate)} disabled /></div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button className="btn btn-block btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>取消</button>
                  <button className="btn btn-block btn-primary" onClick={handleSave} style={{ flex: 1 }}>保存</button>
                </div>
                {editing && <div style={{ marginTop: 10 }}><button className="btn btn-block btn-danger" onClick={() => { handleDelete(editing.id); setShowForm(false); }}>删除</button></div>}
              </>
            )}
            {!isAdmin && <div style={{ marginTop: 20 }}><button className="btn btn-block btn-outline" onClick={() => setShowForm(false)}>关闭</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Admin card — shows all info
function AdminCard({ m, onClick }: { m: Member; onClick: () => void }) {
  return (
    <div className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="member-avatar">{m.name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}{m.genero && <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>{m.genero === 'F' ? '女' : '男'}</span>}</div>
          {m.licencia && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{m.licencia}</div>}
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>
            {m.phone && <span>{m.phone} · </span>}{m.email && <span>{m.email}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span className={`tag ${m.status === 'active' ? 'tag-income' : 'tag-expense'}`}>{m.status === 'active' ? '活跃' : '停用'}</span>
          {m.joinDate && <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{formatDate(m.joinDate)}</div>}
        </div>
      </div>
    </div>
  );
}

// Public card — only name, gender, licencia
function PublicCard({ m, onClick }: { m: Member; onClick: () => void }) {
  return (
    <div className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="member-avatar">{m.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}{m.genero && <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>{m.genero === 'F' ? '女' : '男'}</span>}</div>
          {m.licencia && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{m.licencia}</div>}
        </div>
      </div>
    </div>
  );
}
