import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { t, lang, switchLang } = useT();
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
      if (isRegister) { await signUp(email.trim(), password); }
      else { await signIn(email.trim(), password); }
    } catch (err: any) {
      const msg = err?.message || err?.msg || '';
      if (msg.includes('Invalid login') || msg.includes('Invalid Login')) setError(t('invalid_login'));
      else if (msg.includes('already registered') || msg.includes('already been registered')) setError(t('already_registered'));
      else if (msg.includes('password') && msg.includes('6')) setError(t('password_short'));
      else if (msg.includes('rate limit') || msg.includes('Rate')) setError(t('rate_limit'));
      else setError(msg || t('login_failed'));
    }
    setBusy(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <button onClick={() => switchLang(lang === 'zh' ? 'es' : 'zh')}
          style={{ background: 'white', border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {lang === 'zh' ? '🇪🇸 ES' : '🇨🇳 中文'}
        </button>
      </div>
      <img src="logo.png" alt="Under 80 Golf Club" style={{ width: 200, marginBottom: 20 }} />

      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1B5E20', textAlign: 'center' }}>
          {isRegister ? t('register') : t('login')}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">{t('email')}</label>
            <input className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label className="label">{t('password')}</label>
            <input className="input" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isRegister ? t('password_hint') : t('password_enter')} />
          </div>
          {error && (
            <div style={{ background: '#FFEBEE', color: '#C62828', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? t('please_wait') : isRegister ? t('sign_up') : t('sign_in')}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }} style={{ background: 'none', border: 'none', color: '#2E7D32', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {isRegister ? t('have_account') : t('no_account')}
          </button>
        </div>
      </div>
    </div>
  );
}
