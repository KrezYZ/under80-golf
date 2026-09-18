import { useState } from 'react';
import { supabase } from '../firebase/config';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

export default function ResetPassword() {
  const { t } = useT();
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) { setError(t('password_short')); return; }
    if (password !== confirmation) { setError(t('password_mismatch')); return; }
    setBusy(true); setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await signOut(); window.location.hash = '';
      window.alert(t('password_updated'));
    } catch { setError(t('reset_invalid')); }
    finally { setBusy(false); }
  };
  return <div className="page" style={{ maxWidth: 400, margin: '60px auto' }}><div className="card">
    <h2>{t('reset_password')}</h2><form onSubmit={save}>
      <label className="label">{t('password')}</label>
      <input className="input" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
      <label className="label" style={{ marginTop: 12 }}>{t('confirm_password')}</label>
      <input className="input" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      {error && <p role="alert" style={{ color: '#C62828' }}>{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 16 }}>{busy ? t('please_wait') : t('reset_password')}</button>
    </form><button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => { window.location.hash = ''; void signOut(); }}>{t('have_account')}</button>
  </div></div>;
}
