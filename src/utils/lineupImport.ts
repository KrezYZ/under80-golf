import * as XLSX from 'xlsx';
import type { Member } from '../db';

export interface ImportedLineupRow {
  name: string;
  licencia: string;
  group_name: string;
  tee: string;
  tee_time: string;
  source_row: number;
}

export interface MatchedLineupRow extends ImportedLineupRow {
  member_id: string;
  member_name: string;
}

const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const compact = (value: unknown) => normalize(value).replace(/\s+/g, '');
const isHeader = (value: unknown, terms: string[]) => terms.some(term => normalize(value).includes(term));

function formatTime(value: unknown): string {
  if (value instanceof Date) return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const match = text.match(/(?:^|\s)(\d{1,2})[:.]([0-5]\d)(?::\d{2})?/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function parseRows(buffer: ArrayBuffer): ImportedLineupRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const output: ImportedLineupRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headerIndexes = rows.map((row, index) => row.some(cell => isHeader(cell, ['JUGADOR', 'NOMBRE', 'PLAYER', 'NAME'])) ? index : -1).filter(index => index >= 0);
    for (const [headerPosition, headerIndex] of headerIndexes.entries()) {
      const header = rows[headerIndex];
      const endRow = headerIndexes[headerPosition + 1] ?? rows.length;
      const playerColumns = header.map((cell, index) => isHeader(cell, ['JUGADOR', 'NOMBRE', 'PLAYER', 'NAME']) ? index : -1).filter(index => index >= 0);

      playerColumns.forEach((playerCol, segmentIndex) => {
        const segmentStart = Math.max(0, playerCol - 3);
        const segmentEnd = playerColumns[segmentIndex + 1] ? Math.max(playerCol + 1, playerColumns[segmentIndex + 1] - 3) : Math.min(header.length, playerCol + 8);
        const findColumn = (terms: string[]) => {
          for (let column = segmentStart; column < segmentEnd; column++) if (isHeader(header[column], terms)) return column;
          return -1;
        };
        const surnameCol = findColumn(['APELLIDO', 'SURNAME', 'LAST NAME']);
        const licenseCol = findColumn(['LICENCIA', 'LICENSE', 'LICENCE']);
        const timeCol = findColumn(['HORA', 'TIME']);
        const groupCol = findColumn(['GRUPO', 'EQUIPO', 'PARTIDA', 'GROUP']);
        const teeCol = findColumn(['TEE SALIDA', 'HOYO', 'TEE', 'SALIDA']);
        let carriedTime = '';
        let carriedTee = '';
        let carriedGroup = '';

        for (let rowIndex = headerIndex + 1; rowIndex < endRow; rowIndex++) {
          const row = rows[rowIndex] || [];
          const firstName = String(row[playerCol] ?? '').trim();
          const surname = surnameCol >= 0 && surnameCol !== playerCol ? String(row[surnameCol] ?? '').trim() : '';
          const name = surname ? `${surname} ${firstName}`.trim() : firstName;
          const licencia = licenseCol >= 0 ? String(row[licenseCol] ?? '').trim() : '';
          if (!name && !licencia) continue;
          const parsedTime = timeCol >= 0 ? formatTime(row[timeCol]) : '';
          const parsedTee = teeCol >= 0 ? String(row[teeCol] ?? '').trim() : '';
          const parsedGroup = groupCol >= 0 ? String(row[groupCol] ?? '').trim() : '';
          if (parsedTime) carriedTime = parsedTime;
          if (parsedTee) carriedTee = parsedTee;
          if (parsedGroup) carriedGroup = parsedGroup;
          output.push({
            name, licencia, tee_time: parsedTime || carriedTime,
            tee: parsedTee || carriedTee,
            group_name: parsedGroup || carriedGroup || parsedTime || carriedTime,
            source_row: rowIndex + 1,
          });
        }
      });
    }
  }
  const seen = new Set<string>();
  return output.filter(row => {
    const key = `${compact(row.licencia)}|${compact(row.name)}|${row.tee_time}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function nameScore(importedName: string, member: Member) {
  const imported = new Set(normalize(importedName).split(' ').filter(Boolean));
  const memberName = new Set(normalize(`${member.last_name || ''} ${member.first_name || ''} ${member.name}`).split(' ').filter(Boolean));
  if (!imported.size || !memberName.size) return 0;
  const overlap = [...imported].filter(token => memberName.has(token)).length;
  return overlap / Math.max(imported.size, memberName.size);
}

export async function parseLineupFile(file: File, members: Member[]) {
  const rows = parseRows(await file.arrayBuffer());
  const matched: MatchedLineupRow[] = [];
  const unmatched: ImportedLineupRow[] = [];
  for (const row of rows) {
    const licenseMatches = row.licencia ? members.filter(member => compact(member.licencia) === compact(row.licencia)) : [];
    let member = licenseMatches.length === 1 ? licenseMatches[0] : undefined;
    if (!member && licenseMatches.length > 1) member = licenseMatches.sort((a, b) => nameScore(row.name, b) - nameScore(row.name, a))[0];
    if (!member) {
      const candidates = members.map(item => ({ item, score: nameScore(row.name, item) })).sort((a, b) => b.score - a.score);
      if (candidates[0]?.score >= 0.65) member = candidates[0].item;
    }
    if (member) matched.push({ ...row, member_id: member.id, member_name: member.name });
    else unmatched.push(row);
  }
  const uniqueMatched = [...new Map(matched.map(row => [row.member_id, row])).values()];
  return { matched: uniqueMatched, unmatched, total: rows.length };
}
