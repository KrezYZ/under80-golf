import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const tabs = [
    { path: '/', label: '总览', icon: '📊' },
    { path: '/transactions', label: '账本', icon: '📒' },
    { path: '/events', label: '比赛', icon: '🏆' },
    { path: '/members', label: '会员', icon: '👥' },
  ];

  return (
    <>
      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e0e0e0',
        padding: '8px 16px', paddingTop: 'max(8px, env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#E8F5E9', color: '#1B5E20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email?.split('@')[0] || 'User'}
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
    </>
  );
}
