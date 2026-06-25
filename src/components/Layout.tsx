import { useLocation, useNavigate } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', label: '总览', icon: '📊' },
    { path: '/transactions', label: '收支', icon: '💳' },
    { path: '/events', label: '比赛', icon: '🏆' },
    { path: '/members', label: '会员', icon: '👥' },
  ];

  return (
    <>
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
