import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { autoBackup, getEventResults, getEvents, getMembers, getRegistrations, saveEventResult, saveEventResults, updateEvent, type EventResult, type GolfEvent, type Member } from '../db';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

export default function Scores() {
  const { isAdmin } = useAuth();
  const { t } = useT();
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventId, setEventId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Partial<EventResult>>>({});
  const [editMemberId, setEditMemberId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([getEvents('admin'), getMembers()]).then(([eventRows, memberRows]) => {
      setEvents(eventRows); setMembers(memberRows);
      if (!eventId && eventRows.length) setEventId(eventRows[0].id);
    });
  }, [isAdmin, eventId]);

  const load = useCallback(async () => {
    if (!eventId || !isAdmin) return;
    const [resultRows, registrations] = await Promise.all([getEventResults(eventId), getRegistrations(eventId)]);
    setResults(Object.fromEntries(resultRows.map(row => [row.member_id, row])));
    setParticipantIds(registrations.map(row => row.member_id).filter(Boolean) as string[]);
  }, [eventId, isAdmin]);
  useEffect(() => { void load(); }, [load]);

  const participants = useMemo(() => members.filter(member => participantIds.includes(member.id)), [members, participantIds]);
  const selectedEvent = events.find(event => event.id === eventId);
  const setScore = (memberId: string, value: string) => {
    const current = results[memberId] || {};
    setResults({ ...results, [memberId]: { ...current, event_id: eventId, member_id: memberId, stableford: value === '' ? undefined : Number(value) } });
  };

  const saveAll = async () => {
    const values = participants.flatMap(member => {
      const result = results[member.id];
      if (result?.stableford === undefined || result.stableford === null) return [];
      return [{ event_id: eventId, member_id: member.id, stableford: Number(result.stableford), gross_score: null, handicap_playing: null, position: null, source: 'manual' as const, notes: '' }];
    });
    await saveEventResults(values);
    setMessage(t('scores_saved_all')); autoBackup('批量保存比赛成绩'); await load();
  };

  const saveSelected = async () => {
    const result = results[editMemberId];
    if (!result || result.stableford === undefined) return;
    await saveEventResult({ event_id: eventId, member_id: editMemberId, stableford: Number(result.stableford), gross_score: null, handicap_playing: null, position: null, source: 'manual', notes: '' });
    setMessage(t('scores_saved_one')); autoBackup('编辑单个会员比赛成绩'); await load();
  };

  const publish = async () => {
    if (!selectedEvent) return;
    await updateEvent(selectedEvent.id, { ...selectedEvent, results_published: true });
    setEvents(events.map(event => event.id === selectedEvent.id ? { ...event, results_published: true } : event));
    setMessage(t('ranking_published')); autoBackup('发布比赛成绩');
  };

  if (!isAdmin) return <Navigate to="/ranking" replace />;
  return <div className="page" style={{ paddingBottom: 90 }}>
    <div className="page-header"><h1 className="page-title">✍️ {t('scores_manage')}</h1></div>
    <select className="select" value={eventId} onChange={event => { setEventId(event.target.value); setEditMemberId(''); }}>
      {events.map(event => <option key={event.id} value={event.id}>{event.date} · {event.name}</option>)}
    </select>
    <h2 style={{ fontSize: 17, marginTop: 18 }}>{t('scores_batch')}</h2>
    {!participants.length && <div className="empty-state">{t('scores_no_players')}</div>}
    {participants.map(member => <div className="card" key={member.id} style={{ display: 'grid', gridTemplateColumns: '1fr 105px', gap: 10, alignItems: 'center' }}>
      <div><strong>{member.name}</strong><div style={{ color: '#888', fontSize: 11 }}>{member.licencia}</div></div>
      <input className="input" inputMode="numeric" min="0" max="100" type="number" placeholder="Stableford" value={results[member.id]?.stableford ?? ''} onChange={event => setScore(member.id, event.target.value)} />
    </div>)}
    {!!participants.length && <button className="btn btn-primary btn-block" onClick={saveAll}>{t('scores_save_all')}</button>}
    <div className="card" style={{ marginTop: 18 }}>
      <strong>{t('scores_edit_one')}</strong>
      <select className="select" style={{ marginTop: 10 }} value={editMemberId} onChange={event => setEditMemberId(event.target.value)}>
        <option value="">{t('scores_choose_member')}</option>
        {participants.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
      </select>
      {editMemberId && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input className="input" type="number" inputMode="numeric" min="0" max="100" value={results[editMemberId]?.stableford ?? ''} onChange={event => setScore(editMemberId, event.target.value)} />
        <button className="btn btn-primary" onClick={saveSelected}>{t('ranking_save')}</button>
      </div>}
    </div>
    {selectedEvent && !selectedEvent.results_published && <button className="btn btn-outline btn-block" onClick={publish}>{t('ranking_publish')}</button>}
    {message && <div style={{ textAlign: 'center', color: '#2E7D32', marginTop: 10 }}>{message}</div>}
  </div>;
}
