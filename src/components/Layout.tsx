import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMembers, updateMember, autoBackup, type Member } from '../db';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [profileError, setProfileError] = useState('');

  const tabs = [
    { path: '/', label: '总览', icon: '📊' },
    { path: '/transactions', label: '账本', icon: '📒' },
    { path: '/events', label: '比赛', icon: '🏆' },
    { path: '/members', label: '会员', icon: '👥' },
  ];

  // Find matching member by email
  useEffect(() => {
    if (!user?.email) return;
    getMembers().then(all => {
      const m = all.find(m => m.email?.toLowerCase() === user.email!.toLowerCase());
      if (m) {
        setMember(m);
        setProfileForm({ name: m.name, phone: m.phone, email: m.email });
      }
    });
  }, [user?.email]);

  const handleProfileSave = async () => {
    if (!member || !profileForm.phone.trim() || !profileForm.email.trim()) {
      setProfileError('手机号和邮箱不能为空');
      return;
    }
    setProfileError('');
    await updateMember(member.id, {
      name: profileForm.name.trim() || member.name,
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim(),
      licencia: member.licencia || '',
      genero: member.genero || '',
      joinDate: member.joinDate,
      status: member.status,
      notes: member.notes,
    });
    // Refresh member data
    const all = await getMembers();
    const updated = all.find(m => m.id === member.id);
    if (updated) {
      setMember(updated);
      setProfileForm({ name: updated.name, phone: updated.phone, email: updated.email });
    }
    autoBackup('编辑个人资料');
    setShowProfile(false);
  };

  const displayName = member?.name || user?.email?.split('@')[0] || 'User';

  return (
    <>
      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e0e0e0',
        padding: '8px 16px', paddingTop: 'max(8px, env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => setShowProfile(true)}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#E8F5E9', color: '#1B5E20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            {isAdmin && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#1B5E20', padding: '1px 6px', borderRadius: 4 }}>
                ADMIN
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => signOut()}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: 8,
            padding: '4px 12px', fontSize: 12, color: '#888', cursor: 'pointer',
          }}
        >
          退出
        </button>
      </div>

      {children}

      <nav className="bottom-nav">
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Edit Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowProfile(false); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#1B5E20' }}>编辑个人资料</h2>

            <div className="form-group">
              <label className="label">姓名</label>
              <input className="input" value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="姓名" disabled={!isAdmin} />
            </div>
            <div className="form-group">
              <label className="label">手机号 *</label>
              <input className="input" value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="必填" />
            </div>
            <div className="form-group">
              <label className="label">邮箱 *</label>
              <input className="input" value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="必填" />
            </div>

            {profileError && (
              <div style={{ background: '#FFEBEE', color: '#C62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {profileError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-block btn-outline" onClick={() => setShowProfile(false)} style={{ flex: 1 }}>取消</button>
              <button className="btn btn-block btn-primary" onClick={handleProfileSave} style={{ flex: 1 }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
