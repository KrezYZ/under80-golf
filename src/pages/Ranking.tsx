import { useCallback, useEffect, useMemo, useState } from 'react';
import { autoBackup, getAnnualRanking, getEvents, getEventResults, getMemberDirectory, getMembers, getRegistrations, getTeeAssignments, saveEventResult, saveTeeAssignment, updateEvent, type EventResult, type GolfEvent, type Member, type RankingRow, type TeeAssignment } from '../db';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

const currentYear = new Date().getFullYear();

export default function Ranking() {
  const { isAdmin } = useAuth();
  const { t } = useT();
  const [year, setYear] = useState(currentYear);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [members, setMembers] = useState<Pick<Member, 'id'|'name'|'licencia'>[]>([]);
  const [eventId, setEventId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Partial<EventResult>>>({});
  const [tees, setTees] = useState<Record<string, Partial<TeeAssignment>>>({});
  const [message, setMessage] = useState('');

  const loadRanking = useCallback(async () => setRanking(await getAnnualRanking(year)), [year]);
  useEffect(() => { loadRanking(); }, [loadRanking]);
  useEffect(() => {
    Promise.all([getEvents(isAdmin ? 'admin' : 'public'), isAdmin ? getMembers() : getMemberDirectory()]).then(([eventRows, memberRows]) => {
      setEvents(eventRows);
      setMembers(memberRows);
      if (!eventId && eventRows.length) setEventId(eventRows[0].id);
    });
  }, [isAdmin, eventId]);

  useEffect(() => {
    if (!eventId) return;
    Promise.all([getEventResults(eventId), getTeeAssignments(eventId), isAdmin ? getRegistrations(eventId) : Promise.resolve([])])
      .then(([resultRows, teeRows, registrationRows]) => {
        setResults(Object.fromEntries(resultRows.map(row => [row.member_id, row])));
        setTees(Object.fromEntries(teeRows.map(row => [row.member_id, row])));
        setParticipantIds(registrationRows.map(row => row.member_id).filter(Boolean) as string[]);
      });
  }, [eventId, isAdmin]);

  const selectedEvent = events.find(event => event.id === eventId);
  const eventResults = useMemo(() => Object.values(results).filter(row => row.stableford !== undefined).sort((a,b) => Number(b.stableford)-Number(a.stableford)), [results]);
  const adminParticipants = participantIds.length ? members.filter(member => participantIds.includes(member.id)) : members;

  const saveParticipant = async (memberId: string) => {
    if (!eventId) return;
    const tee = tees[memberId] || {};
    const result = results[memberId] || {};
    await saveTeeAssignment({ event_id: eventId, member_id: memberId, group_name: tee.group_name || '', tee: tee.tee || '', tee_time: tee.tee_time || '', notes: tee.notes || '' });
    if (result.stableford !== undefined && result.stableford !== null) {
      await saveEventResult({ event_id: eventId, member_id: memberId, stableford: Number(result.stableford), gross_score: result.gross_score ? Number(result.gross_score) : null, handicap_playing: result.handicap_playing ? Number(result.handicap_playing) : null, position: null, source: 'manual', notes: '' });
    }
    setMessage(t('ranking_saved'));
    autoBackup('编辑 Tee 与比赛成绩');
    await loadRanking();
  };

  const publish = async () => {
    if (!selectedEvent) return;
    await updateEvent(selectedEvent.id, { ...selectedEvent, results_published: true });
    setEvents(events.map(event => event.id === selectedEvent.id ? { ...event, results_published: true } : event));
    setMessage(t('ranking_published'));
    autoBackup('发布比赛成绩');
    await loadRanking();
  };

  return <div className="page" style={{ paddingBottom: 90 }}>
    <div className="page-header"><h1 className="page-title">🏅 {t('ranking_title')}</h1>
      <select className="select" style={{ width: 110 }} value={year} onChange={e => setYear(Number(e.target.value))}>
        {[currentYear, currentYear - 1, currentYear - 2].map(value => <option key={value}>{value}</option>)}
      </select>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {ranking.length ? ranking.map(row => <div key={row.member_id} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 65px 65px', gap: 6, padding: 12, borderBottom: '1px solid #eee', alignItems: 'center' }}>
        <strong style={{ fontSize: 20, color: row.ranking <= 2 ? '#C69214' : '#666' }}>{row.ranking}</strong>
        <div><strong>{row.name}</strong><div style={{ color: '#888', fontSize: 11 }}>{row.licencia} · {row.events_played} {t('ranking_events')}</div></div>
        <div style={{ textAlign: 'center' }}><strong>{row.total_stableford}</strong><div style={{ fontSize: 10, color: '#888' }}>{t('ranking_total')}</div></div>
        <div style={{ textAlign: 'center' }}><strong>{row.best_round}</strong><div style={{ fontSize: 10, color: '#888' }}>{t('ranking_best')}</div></div>
      </div>) : <div className="empty-state">{t('ranking_empty')}</div>}
    </div>

    <h2 style={{ marginTop: 22, fontSize: 18 }}>{t('ranking_results')}</h2>
    <select className="select" value={eventId} onChange={e => setEventId(e.target.value)}>
      {events.map(event => <option key={event.id} value={event.id}>{event.date} · {event.name}</option>)}
    </select>

    {!isAdmin && <div className="card" style={{ marginTop: 12 }}>
      {eventResults.length ? eventResults.map((row, index) => {
        const member = members.find(item => item.id === row.member_id);
        return <div key={row.member_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}><span>{index + 1}. {member?.name || '—'}</span><strong>{row.stableford} pts</strong></div>;
      }) : t('ranking_unpublished')}
    </div>}

    {isAdmin && <div style={{ marginTop: 12 }}>
      {adminParticipants.map(member => {
        const tee = tees[member.id] || {};
        const result = results[member.id] || {};
        return <div className="card" key={member.id}>
          <strong>{member.name}</strong><span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>{member.licencia}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <input className="input" placeholder={t('ranking_group')} value={tee.group_name || ''} onChange={e => setTees({ ...tees, [member.id]: { ...tee, group_name: e.target.value } })} />
            <input className="input" placeholder="Tee" value={tee.tee || ''} onChange={e => setTees({ ...tees, [member.id]: { ...tee, tee: e.target.value } })} />
            <input className="input" type="time" value={tee.tee_time || ''} onChange={e => setTees({ ...tees, [member.id]: { ...tee, tee_time: e.target.value } })} />
            <input className="input" inputMode="numeric" placeholder="Stableford" value={result.stableford ?? ''} onChange={e => setResults({ ...results, [member.id]: { ...result, member_id: member.id, event_id: eventId, stableford: e.target.value === '' ? undefined : Number(e.target.value) } })} />
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => saveParticipant(member.id)}>{t('ranking_save')}</button>
        </div>;
      })}
      {selectedEvent && !selectedEvent.results_published && <button className="btn btn-primary btn-block" onClick={publish}>{t('ranking_publish')}</button>}
      {message && <div style={{ textAlign: 'center', color: '#2E7D32', marginTop: 8 }}>{message}</div>}
    </div>}
  </div>;
}
