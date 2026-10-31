// ============================================================
// BARBELL LOG -- Google Apps Script
// Paste entire file into Apps Script editor, save, deploy as Web App
// Execute as: Me | Who has access: Anyone
// ============================================================

const SHEETS = {
  LOG:        'Log',
  MEETS:      'Meets',
  BODYWEIGHT: 'Bodyweight',
  PBS:        'PBs',
};

const HEADERS = {
  LOG:        ['Date','Session','Base Lift','Position','Receiving','Grip','Technique','Weight (kg)','Sets','Reps','Quality','Notes','ID','Structure JSON','Workout ID'],
  MEETS:      ['ID','Name','Date','Location','Full Title','Bodyweight (kg)','Sn A1 Wt','Sn A1 Made','Sn A2 Wt','Sn A2 Made','Sn A3 Wt','Sn A3 Made','CJ A1 Wt','CJ A1 Made','CJ A2 Wt','CJ A2 Made','CJ A3 Wt','CJ A3 Made','Best Snatch','Best CJ','Total','Sinclair','Notes'],
  BODYWEIGHT: ['Date','Weight (kg)','Note'],
  PBS:        ['Date','Lift','Weight (kg)','Weight (lbs)'],
};

// ── ROUTING ──────────────────────────────────────────────────────────────────
function doPost(e) {
  let lock;
  try {
    lock=LockService.getScriptLock();lock.waitLock(30000);
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let result = {};

    switch(data.action) {
      case 'saveState': result=saveAppState(ss,data.record); break;
      case 'deleteMeet': deleteMeetById(ss,data.id); break;
      case 'log':        appendLogEntry(ss, data.entry); break;
      case 'syncAll':    syncAllEntries(ss, data.entries); break;
      case 'saveMeet':   saveMeet(ss, data.meet); break;
      case 'syncMeets':  syncMeets(ss, data.meets); break;
      case 'logBW':      appendBW(ss, data.entry); break;
      case 'syncBW':     syncBW(ss, data.entries); break;
      case 'syncPBs':    syncPBs(ss, data.pbs); break;
      case 'syncFull':   syncFull(ss, data); break;
      case 'updateEntry': updateEntry(ss, data.entry); break;
      case 'deleteEntry': deleteEntry(ss, data.id); break;
      default: throw new Error('Unknown action: '+data.action);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {if(lock)lock.releaseLock();}
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getAll') {
    try {
      const entries = getAllLogEntries(ss);
      const meets   = getAllMeets(ss);
      const bw      = getAllBW(ss);
      return ContentService
        .createTextOutput(JSON.stringify({ entries, meets, bw, apiVersion:3, appState:getAppState(ss) }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService
        .createTextOutput(JSON.stringify({ entries: [], meets: [], bw: [], error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Barbell Log API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET HELPERS ─────────────────────────────────────────────────────────────
function getOrCreate(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (name === 'Log') {
    // Check if header needs updating (old layout missing Grip column)
    const existingHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!existingHeader.includes('Grip')) {
      // Insert Grip column at position 6 (after Receiving, before Technique)
      sheet.insertColumnAfter(5); // insert after col 5 (Receiving)
      sheet.getRange(1, 6).setValue('Grip').setFontWeight('bold');
      // Also ensure ID column header exists
      const newLastCol = sheet.getLastColumn();
      const newHeader = sheet.getRange(1, 1, 1, newLastCol).getValues()[0];
      if (!newHeader.includes('ID')) {
        sheet.getRange(1, newLastCol + 1).setValue('ID').setFontWeight('bold');
      }
    }
  }
  if(name===SHEETS.LOG){if(sheet.getMaxColumns&&sheet.getMaxColumns()<HEADERS.LOG.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),HEADERS.LOG.length-sheet.getMaxColumns());const current=sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),13)).getValues()[0];['ID','Structure JSON','Workout ID'].forEach(h=>{if(!current.includes(h)){sheet.getRange(1,sheet.getLastColumn()+1).setValue(h).setFontWeight('bold');current.push(h);}});}
  return sheet;
}

function clearData(sheet) {
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).clearContent();
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } catch(e) { return String(d); }
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function entryToRow(e) {
  return [
    e.date || '',
    e.session || '',
    e.base || '',
    (e.position || []).join(' + '),
    e.receiving || '',
    (e.grip || []).join(' + '),
    (e.technique || []).join(' + '),
    e.weight || '',
    e.sets || '',
    e.reps || '',
    e.quality || '',
    e.notes || '',
    e.id || '',
    e.structure?JSON.stringify(e.structure):'',
    e.workoutId||'',
  ];
}

function appendLogEntry(ss, entry) {
  const sheet = getOrCreate(ss, SHEETS.LOG, HEADERS.LOG);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    // Read actual headers to find column positions
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idCol   = headers.indexOf('ID');
    const dateCol = headers.indexOf('Date');
    const baseCol = headers.indexOf('Base Lift');
    const wtCol   = headers.indexOf('Weight (kg)');
    for (const row of data) {
      // Dedup by ID
      if (entry.id && idCol >= 0 && row[idCol] === entry.id) return;

    }
  }
  sheet.appendRow(entryToRow(entry));
}

function syncAllEntries(ss, entries) {
  const sheet = getOrCreate(ss, SHEETS.LOG, HEADERS.LOG);
  clearData(sheet);
  if (entries && entries.length) {
    sheet.getRange(2, 1, entries.length, HEADERS.LOG.length).setValues(entries.map(entryToRow));
  }
}

function getAllLogEntries(ss) {
  const sheet = ss.getSheetByName(SHEETS.LOG);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  // Read actual headers to handle both old (11-col, no Grip) and new (13-col) layouts
  const numCols = Math.max(sheet.getLastColumn(), 1);
  const headerRow = sheet.getRange(1, 1, 1, numCols).getValues()[0];

  // Build column index map from actual headers
  const col = {};
  headerRow.forEach((h, i) => { if (h) col[h.toString().trim()] = i; });

  // Fallback indices for old layout (no Grip column)
  const hasGrip = col['Grip'] !== undefined;
  const idxDate      = col['Date']         !== undefined ? col['Date']         : 0;
  const idxSession   = col['Session']      !== undefined ? col['Session']      : 1;
  const idxBase      = col['Base Lift']    !== undefined ? col['Base Lift']    : 2;
  const idxPosition  = col['Position']     !== undefined ? col['Position']     : 3;
  const idxReceiving = col['Receiving']    !== undefined ? col['Receiving']    : 4;
  const idxGrip      = col['Grip']         !== undefined ? col['Grip']         : -1;
  const idxTechnique = col['Technique']    !== undefined ? col['Technique']    : (hasGrip ? 6 : 5);
  const idxWeight    = col['Weight (kg)']  !== undefined ? col['Weight (kg)']  : (hasGrip ? 7 : 6);
  const idxSets      = col['Sets']         !== undefined ? col['Sets']         : (hasGrip ? 8 : 7);
  const idxReps      = col['Reps']         !== undefined ? col['Reps']         : (hasGrip ? 9 : 8);
  const idxQuality   = col['Quality']      !== undefined ? col['Quality']      : (hasGrip ? 10 : 9);
  const idxNotes     = col['Notes']        !== undefined ? col['Notes']        : (hasGrip ? 11 : 10);
  const idxId        = col['ID']           !== undefined ? col['ID']           : (hasGrip ? 12 : 11);

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();

  return rows.filter(r => r[idxDate] || r[idxWeight]).map(r => ({
    id:        r[idxId] || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
    date:      r[idxDate] ? fmtDate(r[idxDate]) : '',
    session:   r[idxSession] || '',
    base:      r[idxBase] || '',
    position:  r[idxPosition] ? r[idxPosition].toString().split(' + ').filter(Boolean) : [],
    receiving: r[idxReceiving] || '',
    grip:      idxGrip >= 0 && r[idxGrip] ? r[idxGrip].toString().split(' + ').filter(Boolean) : [],
    technique: r[idxTechnique] ? r[idxTechnique].toString().split(' + ').filter(Boolean) : [],
    weight:    parseFloat(r[idxWeight]) || null,
    sets:      r[idxSets] ? parseInt(r[idxSets]) : null,
    reps:      r[idxReps] ? parseInt(r[idxReps]) : null,
    quality:   r[idxQuality] ? parseInt(r[idxQuality]) : null,
    notes:     r[idxNotes] || '',
    ...(col['Structure JSON']!==undefined&&r[col['Structure JSON']]?{structure:JSON.parse(r[col['Structure JSON']])}:{}),
    ...(col['Workout ID']!==undefined&&r[col['Workout ID']]?{workoutId:r[col['Workout ID']]}:{}),
  }));
}

// ── MEETS ─────────────────────────────────────────────────────────────────────
function buildTitle(name, date, location) {
  if (!name) return '';
  const parts = [name];
  if (date) {
    const d = new Date(date);
    parts.push(d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}));
  }
  if (location) parts.push(location);
  return parts.join(' · ');
}

function meetToRow(m) {
  const sn = m.snatch || [];
  const cj = m.cj || [];
  const bestSn = sn.filter(a => a.made && a.weight).reduce((mx, a) => a.weight > mx ? a.weight : mx, 0) || '';
  const bestCJ = cj.filter(a => a.made && a.weight).reduce((mx, a) => a.weight > mx ? a.weight : mx, 0) || '';
  const total  = bestSn && bestCJ ? bestSn + bestCJ : '';
  // Sinclair inline (A=0.722762521, b=175.508)
  let sc = '';
  if (total && m.bw && m.bw < 175.508) {
    sc = Math.round(total * Math.pow(10, 0.722762521 * Math.pow(Math.log10(m.bw / 175.508), 2)) * 10) / 10;
  } else if (total && m.bw) {
    sc = total;
  }
  return [
    m.id || '',
    m.name || '',
    m.date || '',
    m.location || '',
    buildTitle(m.name, m.date, m.location),
    m.bw || '',
    sn[0]?.weight || '', sn[0]?.made ? 'Yes' : (sn[0]?.weight ? 'No' : ''),
    sn[1]?.weight || '', sn[1]?.made ? 'Yes' : (sn[1]?.weight ? 'No' : ''),
    sn[2]?.weight || '', sn[2]?.made ? 'Yes' : (sn[2]?.weight ? 'No' : ''),
    cj[0]?.weight || '',  cj[0]?.made ? 'Yes' : (cj[0]?.weight ? 'No' : ''),
    cj[1]?.weight || '',  cj[1]?.made ? 'Yes' : (cj[1]?.weight ? 'No' : ''),
    cj[2]?.weight || '',  cj[2]?.made ? 'Yes' : (cj[2]?.weight ? 'No' : ''),
    bestSn, bestCJ, total, sc,
    m.notes || '',
  ];
}

function saveMeet(ss, meet) {
  const sheet = getOrCreate(ss, SHEETS.MEETS, HEADERS.MEETS);
  if(meet.id&&sheet.getLastRow()>1){const ids=sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();for(let i=0;i<ids.length;i++)if(ids[i][0]===meet.id){sheet.getRange(i+2,1,1,HEADERS.MEETS.length).setValues([meetToRow(meet)]);return;}}
  sheet.appendRow(meetToRow(meet));
}

function syncMeets(ss, meets) {
  const sheet = getOrCreate(ss, SHEETS.MEETS, HEADERS.MEETS);
  clearData(sheet);
  if (meets && meets.length) {
    sheet.getRange(2, 1, meets.length, HEADERS.MEETS.length).setValues(meets.map(meetToRow));
  }
}

function getAllMeets(ss) {
  const sheet = ss.getSheetByName(SHEETS.MEETS);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.MEETS.length).getValues();
  return rows.filter(r => r[1]).map(r => ({
    id:       r[0] || '',
    name:     r[1] || '',
    date:     r[2] ? fmtDate(r[2]) : '',
    location: r[3] || '',
    // r[4] is Full Title (computed, skip)
    bw:       parseFloat(r[5]) || null,
    snatch: [
      { weight: parseFloat(r[6])  || null, made: r[7]  === 'Yes' },
      { weight: parseFloat(r[8])  || null, made: r[9]  === 'Yes' },
      { weight: parseFloat(r[10]) || null, made: r[11] === 'Yes' },
    ],
    cj: [
      { weight: parseFloat(r[12]) || null, made: r[13] === 'Yes' },
      { weight: parseFloat(r[14]) || null, made: r[15] === 'Yes' },
      { weight: parseFloat(r[16]) || null, made: r[17] === 'Yes' },
    ],
    notes: r[22] || '',
  }));
}

// ── BODYWEIGHT ────────────────────────────────────────────────────────────────
function bwToRow(e) {
  return [e.date || '', e.weight || '', e.note || ''];
}

function appendBW(ss, entry) {
  const sheet = getOrCreate(ss, SHEETS.BODYWEIGHT, HEADERS.BODYWEIGHT);
  sheet.appendRow(bwToRow(entry));
}

function syncBW(ss, entries) {
  const sheet = getOrCreate(ss, SHEETS.BODYWEIGHT, HEADERS.BODYWEIGHT);
  clearData(sheet);
  if (entries && entries.length) {
    sheet.getRange(2, 1, entries.length, HEADERS.BODYWEIGHT.length).setValues(entries.map(bwToRow));
  }
}

function getAllBW(ss) {
  const sheet = ss.getSheetByName(SHEETS.BODYWEIGHT);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.BODYWEIGHT.length).getValues();
  return rows.filter(r => r[0]).map(r => ({
    date:   r[0] ? fmtDate(r[0]) : '',
    weight: parseFloat(r[1]) || null,
    note:   r[2] || '',
  }));
}

// ── PBs ───────────────────────────────────────────────────────────────────────
function syncPBs(ss, pbs) {
  const sheet = getOrCreate(ss, SHEETS.PBS, HEADERS.PBS);
  clearData(sheet);
  if (pbs && pbs.length) {
    const rows = pbs.map(p => [
      p.date || '',
      p.lift || '',
      p.weight || '',
      p.weight ? Math.round(p.weight * 2.20462 * 10) / 10 : '',
    ]);
    sheet.getRange(2, 1, rows.length, HEADERS.PBS.length).setValues(rows);
  }
}

// ── UPDATE SINGLE ENTRY (edit + push) ────────────────────────────────────────
function updateEntry(ss, entry) {
  if (!entry || !entry.id) return;
  const sheet = getOrCreate(ss, SHEETS.LOG, HEADERS.LOG);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    sheet.appendRow(entryToRow(entry));
    return;
  }
  const ids = sheet.getRange(2, 13, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === entry.id) {
      sheet.getRange(i + 2, 1, 1, HEADERS.LOG.length).setValues([entryToRow(entry)]);
      return;
    }
  }
  // ID not found -- append as new row
  sheet.appendRow(entryToRow(entry));
}

// ── DELETE SINGLE ENTRY ──────────────────────────────────────────────────────
function deleteEntry(ss, id) {
  if (!id) return;
  const sheet = getOrCreate(ss, SHEETS.LOG, HEADERS.LOG);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const ids = sheet.getRange(2, 13, lastRow - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

// ── FULL SYNC ─────────────────────────────────────────────────────────────────
// Single call to sync everything at once
function syncFull(ss, data) {
  if (data.entries) syncAllEntries(ss, data.entries);
  if (data.meets)   syncMeets(ss, data.meets);
  if (data.bw)      syncBW(ss, data.bw);
  if (data.pbs)     syncPBs(ss, data.pbs);
}


// Append-only plan/settings backups. Existing sheet rows are never cleared.
const STATE_HEADERS=['ID','Key','Updated At','Part','Parts','JSON'];
function saveAppState(ss,record){
  if(!record||typeof record.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(record.id)||typeof record.key!=='string'||!/^[-a-zA-Z0-9_/]{1,120}$/.test(record.key)||record.value===undefined)throw new Error('Invalid state record');
  const text=JSON.stringify(record.value);if(text.length>500000)throw new Error('State backup too large');
  const sheet=getOrCreate(ss,'AppState',STATE_HEADERS);
  if(sheet.getLastRow()>1&&sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues().some(r=>r[0]===record.id))return{saved:true,id:record.id};
  const parts=Math.max(1,Math.ceil(text.length/40000)),updated=new Date().toISOString();
  const rows=Array.from({length:parts},(_,i)=>[record.id,record.key,updated,i+1,parts,text.slice(i*40000,(i+1)*40000)]);
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,6).setValues(rows);
  return{saved:true,id:record.id};
}
function getAppState(ss){
  const sheet=ss.getSheetByName('AppState');if(!sheet||sheet.getLastRow()<2)return{};
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,6).getValues(),groups={};
  rows.forEach((r,index)=>{if(!r[0]||!r[1])return;const item=groups[r[0]]||(groups[r[0]]={id:r[0],key:r[1],updatedAt:r[2],parts:Number(r[4]),chunks:[],index});item.chunks[Number(r[3])-1]=String(r[5]);item.index=index;});
  const result={};Object.values(groups).sort((a,b)=>a.index-b.index).forEach(g=>{if(g.chunks.filter(x=>x!==undefined).length!==g.parts)return;try{result[g.key]={id:g.id,key:g.key,updatedAt:typeof g.updatedAt==='string'?g.updatedAt:g.updatedAt.toISOString(),value:JSON.parse(g.chunks.join(''))};}catch(error){console.warn('Unreadable state version '+g.id);}});return result;
}
function deleteMeetById(ss,id){if(!id)throw new Error('Meet ID required');const sheet=ss.getSheetByName(SHEETS.MEETS);if(!sheet||sheet.getLastRow()<2)return;const ids=sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();for(let i=ids.length-1;i>=0;i--)if(ids[i][0]===id)sheet.deleteRow(i+2);}
