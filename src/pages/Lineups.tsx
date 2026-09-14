import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  autoBackup, getEventLineup, getEvents, getMembers, getRegistrations, getTeeAssignments,
  replaceEventLineup, saveTeeAssignment, type GolfEvent, type LineupEntry, type Member, type TeeAssignment,
} from '../db';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n/useT';
import { parseLineupFile, type ImportedLineupRow, type ResolvedLineupRow } from '../utils/lineupImport';

export default function Lineups() {
  const { isAdmin } = useAuth();
  const { t } = useT();
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventId, setEventId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Partial<TeeAssignment>>>({});
  const [savedMemberId, setSavedMemberId] = useState('');
  const [imported, setImported] = useState<ResolvedLineupRow[]>([]);
  const [unmatched, setUnmatched] = useState<ImportedLineupRow[]>([]);
  const [importMessage, setImportMessage] = useState('');
  const [completeLineup, setCompleteLineup] = useState<LineupEntry[]>([]);

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
    const [registrations, teeRows, lineupRows] = await Promise.all([
      getRegistrations(eventId), getTeeAssignments(eventId), getEventLineup(eventId),
    ]);
    setParticipantIds(registrations.map(row => row.member_id).filter(Boolean) as string[]);
    setAssignments(Object.fromEntries(teeRows.filter(row => row.member_id).map(row => [row.member_id as string, row])));
    setCompleteLineup(lineupRows);
  }, [eventId, isAdmin]);

  useEffect(() => { void loadLineup(); }, [loadLineup]);

  const participants = useMemo(
    () => members.filter(member => participantIds.includes(member.id) || assignments[member.id]),
    [members, participantIds, assignments],
  );

  const importFile = async (file?: File) => {
    if (!file) return;
    const result = await parseLineupFile(file, members);
    setImported(result.all); setUnmatched(result.unmatched);
    setImportMessage(`${t('lineup_found')} ${result.total} · ${t('lineup_matched')} ${result.matched.length} · ${t('lineup_unmatched')} ${result.unmatched.length}`);
  };

  const confirmImport = async () => {
    const saved = await replaceEventLineup(eventId, imported.map((row, index) => ({ member_id: row.member_id, name: row.member_name, licencia: row.licencia, group_name: row.group_name, tee: row.tee, tee_time: row.tee_time, sort_order: index })));
    autoBackup('导入比赛开球排组');
    setImportMessage(`${t('lineup_imported')} (${saved})`); setImported([]); setUnmatched([]);
    await loadLineup();
  };

  const save = async (memberId: string) => {
    const value = assignments[memberId] || {};
    await saveTeeAssignment({
      event_id: eventId,
      member_id: memberId,
      group_name: value.group_name || '',
      tee: value.tee || '',
      tee_time: value.tee_time || null,
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
    <div className="card">
      <strong>{t('lineup_import')}</strong>
      <p style={{ color: '#777', fontSize: 12 }}>{t('lineup_import_hint')}</p>
      <label className="btn btn-outline btn-block" style={{ cursor: 'pointer' }}>
        {t('lineup_choose_excel')}
        <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={event => importFile(event.target.files?.[0])} />
      </label>
      {importMessage && <div style={{ marginTop: 10, fontSize: 13, color: '#2E7D32' }}>{importMessage}</div>}
      {!!imported.length && <div style={{ marginTop: 10 }}>
        {imported.slice(0, 8).map((row, index) => <div key={`${row.member_id}-${index}`} style={{ fontSize: 12, padding: '4px 0' }}>{row.tee_time || '—'} · {row.member_name} {row.member_id ? '' : `(${t('lineup_guest')})`} · {row.group_name || '—'} · Tee {row.tee || '—'}</div>)}
        {imported.length > 8 && <div style={{ color: '#888', fontSize: 12 }}>+ {imported.length - 8}</div>}
        <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={confirmImport}>{t('lineup_confirm_import')}</button>
      </div>}
      {!!unmatched.length && <details style={{ marginTop: 8, fontSize: 12 }}><summary>{t('lineup_guests_found')} ({unmatched.length})</summary>{unmatched.map((row, index) => <div key={index}>{row.name || row.licencia} · {t('lineup_row')} {row.source_row}</div>)}</details>}
    </div>
    {!!completeLineup.length && <CompleteLineup
      rows={completeLineup}
      title={t('lineup_complete')}
      guestLabel={t('lineup_guest')}
      groupsLabel={t('lineup_groups_count')}
      playersLabel={t('lineup_players_count')}
      membersLabel={t('lineup_members_count')}
      guestsLabel={t('lineup_guests_count')}
    />}
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

function CompleteLineup({ rows, title, guestLabel, groupsLabel, playersLabel, membersLabel, guestsLabel }: {
  rows: LineupEntry[];
  title: string;
  guestLabel: string;
  groupsLabel: string;
  playersLabel: string;
  membersLabel: string;
  guestsLabel: string;
}) {
  const groups = rows.reduce<Record<string, LineupEntry[]>>((result, row) => {
    const key = `${row.tee_time || ''}|${row.group_name || ''}|${row.tee || ''}`;
    (result[key] ||= []).push(row); return result;
  }, {});
  const guestCount = rows.filter(row => row.is_guest).length;
  const memberCount = rows.length - guestCount;
  return <div style={{ marginTop: 18 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '5px 12px', marginBottom: 10 }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
      <span style={{ color: '#666', fontSize: 13 }}>
        {groupsLabel} {Object.keys(groups).length} · {playersLabel} {rows.length} · {membersLabel} {memberCount} · {guestsLabel} {guestCount}
      </span>
    </div>
    {Object.entries(groups).map(([key, players], index) => <div className="card" key={key} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ background: '#1B5E20', color: 'white', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>{players[0].tee_time?.slice(0, 5) || '—'} · {players[0].group_name || `Grupo ${index + 1}`}</span>
        <span>{players[0].tee ? `Tee ${players[0].tee}` : ''}</span>
      </div>
      {players.map(player => <div key={player.id} style={{ display: 'grid', gridTemplateColumns: '1fr 105px', gap: 8, padding: '9px 12px', borderBottom: '1px solid #eee' }}>
        <strong>{player.member_name} {player.is_guest && <span style={{ color: '#999', fontWeight: 400 }}>({guestLabel})</span>}</strong>
        <span style={{ color: '#777', textAlign: 'right' }}>{player.licencia || '—'}</span>
      </div>)}
    </div>)}
  </div>;
}
