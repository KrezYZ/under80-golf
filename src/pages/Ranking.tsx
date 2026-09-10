import { useCallback, useEffect, useState } from 'react';
import { getAnnualRanking, type RankingRow } from '../db';
import { useT } from '../i18n/useT';

const currentYear = new Date().getFullYear();

export default function Ranking() {
  const { t } = useT();
  const [year, setYear] = useState(currentYear);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const load = useCallback(async () => setRanking(await getAnnualRanking(year)), [year]);
  useEffect(() => { void load(); }, [load]);

  return <div className="page" style={{ paddingBottom: 90 }}>
    <div className="page-header">
      <h1 className="page-title">🏅 {t('ranking_title')}</h1>
      <select className="select" style={{ width: 110 }} value={year} onChange={event => setYear(Number(event.target.value))}>
        {[currentYear, currentYear - 1, currentYear - 2].map(value => <option key={value}>{value}</option>)}
      </select>
    </div>
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {ranking.length ? ranking.map(row => <div key={row.member_id} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 70px', gap: 6, padding: 12, borderBottom: '1px solid #eee', alignItems: 'center' }}>
        <strong style={{ fontSize: 20, color: row.ranking <= 2 ? '#C69214' : '#666' }}>{row.ranking}</strong>
        <div><strong>{row.name}</strong><div style={{ color: '#888', fontSize: 11 }}>{row.licencia} · {row.events_played} {t('ranking_events')}</div></div>
        <div style={{ textAlign: 'center' }}><strong style={{ fontSize: 18 }}>{row.total_stableford}</strong><div style={{ fontSize: 10, color: '#888' }}>{t('ranking_total')}</div></div>
      </div>) : <div className="empty-state">{t('ranking_empty')}</div>}
    </div>
  </div>;
}
