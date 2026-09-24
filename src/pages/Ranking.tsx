import { useCallback, useEffect, useState } from 'react';
import { getAnnualRanking, getMyEventResults, type MyEventResult, type RankingRow } from '../db';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

const currentYear = new Date().getFullYear();

export default function Ranking() {
  const { t } = useT();
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(currentYear);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [myResults, setMyResults] = useState<MyEventResult[]>([]);
  const load = useCallback(async () => {
    const [rankingRows, ownRows] = await Promise.all([
      getAnnualRanking(year),
      isAdmin ? Promise.resolve([]) : getMyEventResults(year),
    ]);
    setRanking(rankingRows);
    setMyResults(ownRows);
  }, [year, isAdmin]);
  useEffect(() => { void load(); }, [load]);

  return <div className="page" style={{ paddingBottom: 90 }}>
    <div className="page-header">
      <h1 className="page-title">🏅 {t('ranking_title')}</h1>
      <select className="select" style={{ width: 110 }} value={year} onChange={event => setYear(Number(event.target.value))}>
        {[currentYear, currentYear - 1, currentYear - 2].map(value => <option key={value}>{value}</option>)}
      </select>
    </div>
    {!isAdmin && <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: 12, background: '#E8F5E9', color: '#1B5E20', fontWeight: 700 }}>
        {t('ranking_my_results')} · {myResults.length} {t('ranking_events')}
      </div>
      {myResults.length ? myResults.map(row => <div key={row.event_id} style={{ display: 'grid', gridTemplateColumns: '1fr 82px', gap: 10, padding: 12, borderTop: '1px solid #eee', alignItems: 'center' }}>
        <div><strong>{row.event_name}</strong><div style={{ color: '#888', fontSize: 12 }}>{row.event_date}</div></div>
        <div style={{ textAlign: 'right' }}><strong style={{ fontSize: 19, color: '#1B5E20' }}>{row.stableford}</strong><div style={{ color: '#888', fontSize: 10 }}>Stableford</div></div>
      </div>) : <div className="empty-state" style={{ padding: 24 }}>{t('ranking_my_empty')}</div>}
    </div>}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {ranking.length ? ranking.map(row => <div key={row.member_id} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 70px', gap: 6, padding: 12, borderBottom: '1px solid #eee', alignItems: 'center' }}>
        <strong style={{ fontSize: 20, color: row.ranking <= 2 ? '#C69214' : '#666' }}>{row.ranking}</strong>
        <div><strong>{row.name}</strong><div style={{ color: '#888', fontSize: 11 }}>{row.licencia} · {row.events_played} {t('ranking_events')}</div></div>
        <div style={{ textAlign: 'center' }}><strong style={{ fontSize: 18 }}>{row.total_stableford}</strong><div style={{ fontSize: 10, color: '#888' }}>{t('ranking_total')}</div></div>
      </div>) : <div className="empty-state">{t('ranking_empty')}</div>}
    </div>
  </div>;
}
