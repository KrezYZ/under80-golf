import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  autoBackup, getEvents, getMembers, getRegistrations, getTeeAssignments,
  saveTeeAssignment, type GolfEvent, type Member, type TeeAssignment,
} from '../db';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';

export default function Lineups() {
  const { isAdmin } = useAuth();
  const { t } = useT();
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventId, setEventId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Partial<TeeAssignment>>>({});
  const [savedMemberId, setSavedMemberId] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([getEvents('admin'), getMembers()]).then(([eventRows, memberRows]) => {
      setEvents(eventRows);
      setMembers(memberRows);
      if (!eventId && eventRows.length) setEventId(eventRows[0].id);
    });
  }, [isAdmin, eventId]);

  const loadLineup = useCallback(async () => {
    if (!eventId || !isAdmin) return;
    const [registrations, teeRows] = await Promise.all([
      getRegistrations(eventId), getTeeAssignments(eventId),
    ]);
    setParticipantIds(registrations.map(row => row.member_id).filter(Boolean) as string[]);
    setAssignments(Object.fromEntries(teeRows.map(row => [row.member_id, row])));
  }, [eventId, isAdmin]);

  useEffect(() => { void loadLineup(); }, [loadLineup]);

  const participants = useMemo(
    () => members.filter(member => participantIds.includes(member.id)),
    [members, participantIds],
  );

  const save = async (memberId: string) => {
    const value = assignments[memberId] || {};
    await saveTeeAssignment({
      event_id: eventId,
      member_id: memberId,
      group_name: value.group_name || '',
      tee: value.tee || '',
      tee_time: value.tee_time || '',
      notes: value.notes || '',
    });
    setSavedMemberId(memberId);
    autoBackup('编辑比赛开球排组');
    await loadLineup();
  };

  if (!isAdmin) return <Navigate to="/events" replace />;

  return <div className="page" style={{ paddingBottom: 90 }}>
    <div className="page-header"><h1 className="page-title">⛳ {t('lineup_manage')}</h1></div>
    <select className="select" value={eventId} onChange={event => setEventId(event.target.value)}>
      {events.map(event => <option key={event.id} value={event.id}>{event.date} · {event.name}</option>)}
    </select>

    <p style={{ color: '#777', fontSize: 12 }}>{t('lineup_admin_hint')}</p>
    {!participants.length && <div className="empty-state">{t('lineup_no_players')}</div>}
    {participants.map(member => {
      const value = assignments[member.id] || {};
      return <div className="card" key={member.id}>
        <strong>{member.name}</strong>
        <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>{member.licencia}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <input className="input" placeholder={t('lineup_group')} value={value.group_name || ''}
            onChange={event => setAssignments({ ...assignments, [member.id]: { ...value, group_name: event.target.value } })} />
          <input className="input" placeholder="Tee" value={value.tee || ''}
            onChange={event => setAssignments({ ...assignments, [member.id]: { ...value, tee: event.target.value } })} />
          <input className="input" type="time" value={value.tee_time || ''}
            onChange={event => setAssignments({ ...assignments, [member.id]: { ...value, tee_time: event.target.value } })} />
          <button className="btn btn-primary" onClick={() => save(member.id)}>
            {savedMemberId === member.id ? t('ranking_saved') : t('ranking_save')}
          </button>
        </div>
      </div>;
    })}
  </div>;
}
