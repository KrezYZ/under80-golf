import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      const msg = err?.message || err?.msg || '';
      if (msg.includes('Invalid login') || msg.includes('Invalid Login')) {
        setError('邮箱或密码错误');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('该邮箱已注册，请直接登录');
      } else if (msg.includes('password') && msg.includes('6')) {
        setError('密码至少需要6个字符');
      } else if (msg.includes('rate limit') || msg.includes('Rate')) {
        setError('注册太频繁，请稍后再试');
      } else {
        setError(msg || '登录失败');
      }
    }
    setBusy(false);
  };

  return (
    <div className="page" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', paddingBottom: 40,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="logo.png" alt="Under 80 Golf Club" style={{ width: 240, marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1B5E20', marginBottom: 4 }}>🏌️ UNDER 80 GOLF 🏌️‍♀️</h1>
        <p style={{ fontSize: 14, color: '#888' }}>俱乐部财务管理</p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1B5E20', textAlign: 'center' }}>
          {isRegister ? '注册账号' : '登录'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">邮箱</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label className="label">密码</label>
            <input
              className="input"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isRegister ? '至少6个字符' : '输入密码'}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFEBEE', color: '#C62828', padding: '8px 12px',
              borderRadius: 8, fontSize: 13, marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {busy ? '请稍候...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none', border: 'none', color: '#2E7D32',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isRegister ? '已有账号？登录' : '没有账号？注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
