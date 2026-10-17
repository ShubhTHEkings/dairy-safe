'use strict';

/* DairySafe software-only prototype.
 * The rule ranges below are illustrative UI demonstration triggers only.
 * They are not regulatory thresholds, a validated classifier, or proof of purity/adulteration.
 */
const DEMO_RULES = {
  ph: { min: 6.4, max: 6.8, label: 'pH', unit: '' },
  temperature: { min: 0, max: 10, label: 'Temperature', unit: '°C' },
  density: { min: 1.026, max: 1.034, label: 'Density', unit: 'g/mL' },
  fat: { min: 0, max: 10, label: 'Fat', unit: '%' },
  snf: { min: 0, max: 12, label: 'SNF', unit: '%' },
  conductivity: { min: 0, max: 10000, label: 'Electrical conductivity', unit: 'µS/cm' }
};
const STORAGE_KEYS = { samples: 'dairysafe_samples_v1', batches: 'dairysafe_batches_v1', investigations: 'dairysafe_investigations_v1' };
const $ = (id) => document.getElementById(id);
const getList = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch (error) { console.warn('Could not read LocalStorage list:', key, error); return []; }
};
const setList = (key, list) => { try { localStorage.setItem(key, JSON.stringify(list)); return true; } catch (error) { toast('Browser storage is unavailable or full. Export important records before continuing.', 'error'); return false; } };
const samples = () => getList(STORAGE_KEYS.samples);
const batches = () => getList(STORAGE_KEYS.batches);
const investigations = () => getList(STORAGE_KEYS.investigations);
const makeId = (prefix) => `${prefix}-${new Date().toISOString().slice(2,10).replaceAll('-', '')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
const today = () => new Date().toISOString().slice(0,10);
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fmtDate = (value) => { if (!value) return '—'; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? escapeHtml(value) : d.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'}); };
const fmtDateTime = (value) => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); };

function toast(message, type = '') {
  const region = $('toastRegion'); if (!region) return;
  const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message; region.appendChild(el);
  window.setTimeout(() => el.remove(), 3300);
}
function navigate(page) {
  document.querySelectorAll('.page').forEach((el) => el.classList.toggle('active', el.id === `page-${page}`));
  document.querySelectorAll('.nav-link').forEach((el) => el.classList.toggle('active', el.dataset.page === page));
  const names = { dashboard:'Dashboard', analysis:'Milk Quality Analysis', history:'Analysis History', traceability:'Batch Traceability', risk:'Risk & Recall Support', about:'About Project' };
  $('pageTitle').textContent = names[page] || 'DairySafe';
  $('sidebar').classList.remove('open');
  if (page === 'dashboard') renderDashboard();
  if (page === 'history') renderHistory();
  if (page === 'traceability') { refreshBatchSelects(); renderBatchList(); }
  if (page === 'risk') { refreshInvestigationSelects(); renderInvestigations(); }
  window.scrollTo({top:0, behavior:'smooth'});
}
function showSampleId() { if ($('sampleId')) $('sampleId').value = makeId('SMP'); }
function showBatchId() { if ($('batchId')) $('batchId').value = makeId('BAT'); }
function refreshBatchSelects() {
  const list = batches();
  const sampleSelect = $('sampleBatch'); const investBatch = $('investBatch');
  if (sampleSelect) {
    const current = sampleSelect.value;
    sampleSelect.innerHTML = '<option value="">No batch linked</option>' + list.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.id)} — ${escapeHtml(b.source)}</option>`).join('');
    if (list.some(b => b.id === current)) sampleSelect.value = current;
  }
  if (investBatch) {
    const current = investBatch.value;
    investBatch.innerHTML = '<option value="">Select a batch</option>' + list.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.id)} — ${escapeHtml(b.source)}</option>`).join('');
    if (list.some(b => b.id === current)) investBatch.value = current;
  }
}
function refreshInvestigationSelects() {
  const select = $('investSample'); if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">None selected</option>' + samples().map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.id)} — ${escapeHtml(s.source)}</option>`).join('');
  if (samples().some(s => s.id === current)) select.value = current;
  refreshBatchSelects();
}
function num(value) { return value === '' ? NaN : Number(value); }
function validateAnalysisInput(data) {
  const errors = [];
  ['ph','temperature','density','fat','snf','conductivity'].forEach((key) => {
    const n = data[key]; if (!Number.isFinite(n)) errors.push(`${DEMO_RULES[key].label} must be a number.`);
  });
  if (Number.isFinite(data.ph) && (data.ph < 0 || data.ph > 14)) errors.push('pH must be between 0 and 14.');
  if (Number.isFinite(data.temperature) && (data.temperature < -50 || data.temperature > 100)) errors.push('Temperature must be between -50°C and 100°C for input validation.');
  if (Number.isFinite(data.density) && (data.density < .5 || data.density > 2)) errors.push('Density must be between 0.5 and 2 g/mL for input validation.');
  if (Number.isFinite(data.fat) && (data.fat < 0 || data.fat > 100)) errors.push('Fat percentage must be between 0 and 100.');
  if (Number.isFinite(data.snf) && (data.snf < 0 || data.snf > 100)) errors.push('SNF percentage must be between 0 and 100.');
  if (Number.isFinite(data.conductivity) && (data.conductivity < 0 || data.conductivity > 100000)) errors.push('Conductivity must be between 0 and 100000 µS/cm.');
  if (!data.source.trim()) errors.push('Milk source / dairy name is required.');
  if (!data.milkType) errors.push('Please select a milk type.');
  if (!data.date) errors.push('Sample date is required.');
  return errors;
}
function runDemoScreen(data) {
  const flags = [];
  Object.entries(DEMO_RULES).forEach(([key, rule]) => {
    const value = data[key];
    if (value < rule.min || value > rule.max) flags.push(`${rule.label} (${value} ${rule.unit}) is outside the prototype's illustrative review range (${rule.min}–${rule.max} ${rule.unit}).`);
  });
  return {
    status: flags.length ? 'Review Required' : 'No Demo Flags',
    mode: 'Demonstration Mode — No Validated Model',
    flags,
    explanation: flags.length ? 'One or more entered values triggered an illustrative review rule. This is not evidence of adulteration; verify the measurement and use appropriate laboratory testing.' : 'No values triggered the configured demonstration rules. This does not establish purity or safety; use appropriate laboratory testing.',
    recommendation: flags.length ? 'Verify the entered readings, document the sample, and refer it for laboratory review as appropriate.' : 'Record the readings and follow the dairy’s normal quality-control and laboratory procedures.',
    createdAt: new Date().toISOString()
  };
}
function readAnalysisForm() {
  return {
    id: $('sampleId').value || makeId('SMP'), source: $('sampleSource').value.trim(), milkType: $('milkType').value,
    batchId: $('sampleBatch').value, date: $('sampleDate').value, analyst: $('analystName').value.trim(),
    ph: num($('ph').value), temperature: num($('temperature').value), density: num($('density').value), fat: num($('fat').value), snf: num($('snf').value), conductivity: num($('conductivity').value), remarks: $('sampleRemarks').value.trim()
  };
}
function renderSampleResult(record, target = $('analysisResult')) {
  if (!target) return;
  const values = [ ['pH',record.ph,''], ['Temperature',record.temperature,'°C'], ['Density',record.density,'g/mL'], ['Fat',record.fat,'%'], ['SNF',record.snf,'%'], ['Conductivity',record.conductivity,'µS/cm'] ];
  const flags = record.flags || [];
  target.innerHTML = `<article class="result-card"><div class="result-top"><div><span class="section-kicker">SAMPLE RESULT · ${escapeHtml(record.id)}</span><h3>${escapeHtml(record.status)}</h3><p>Analyzed ${escapeHtml(fmtDateTime(record.createdAt))} · ${escapeHtml(record.mode || 'Demonstration mode')}</p></div><span class="status-badge ${record.status === 'Review Required' ? 'review' : 'normal'}">${escapeHtml(record.status)}</span></div><div class="result-body"><div class="result-params">${values.map(([name,value,unit]) => `<div class="parameter-tile"><span>${name}</span><strong>${escapeHtml(value)}<small> ${unit}</small></strong></div>`).join('')}</div><div class="result-cols"><div class="result-info"><h4>Screening explanation</h4><p>${escapeHtml(record.explanation)}</p>${flags.length ? `<ul>${flags.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}</div><div class="result-info"><h4>Recommended next action</h4><p>${escapeHtml(record.recommendation)}</p><p style="margin-top:8px"><b>Source:</b> ${escapeHtml(record.source)}<br><b>Milk type:</b> ${escapeHtml(record.milkType)}<br><b>Batch:</b> ${escapeHtml(record.batchId || 'Not linked')}<br><b>Analyst:</b> ${escapeHtml(record.analyst || 'Not recorded')}</p></div></div><div class="notice" style="margin-top:15px;margin-bottom:0"><strong>Demonstration limitation</strong>This result uses illustrative JavaScript rules. It is not a trained AI prediction, does not identify an adulterant and does not prove that milk is pure or safe.</div><div class="result-actions"><button class="btn btn-secondary" data-print-sample="${escapeHtml(record.id)}">Print / Save PDF</button><button class="btn btn-primary" data-go="traceability">Open traceability →</button></div></div></article>`;
  target.classList.remove('hidden');
  target.querySelector('[data-print-sample]')?.addEventListener('click', () => printSample(record.id));
  target.querySelector('[data-go="traceability"]')?.addEventListener('click', () => navigate('traceability'));
}
function submitAnalysis(event) {
  event.preventDefault();
  const data = readAnalysisForm(); const errors = validateAnalysisInput(data);
  if (errors.length) { toast(errors[0], 'error'); return; }
  const result = runDemoScreen(data); const record = {...data, ...result};
  const records = samples(); const existingIndex = records.findIndex(s => s.id === record.id);
  if (existingIndex >= 0) records[existingIndex] = record; else records.unshift(record);
  if (!setList(STORAGE_KEYS.samples, records)) return;
  renderSampleResult(record); refreshInvestigationSelects(); renderDashboard();
  toast('Analysis saved in this browser.', 'success');
  $('analysisResult').scrollIntoView({behavior:'smooth', block:'start'});
  showSampleId();
}
function renderDashboard() {
  const allSamples = samples(), allBatches = batches(), allInvest = investigations();
  $('statSamples').textContent = allSamples.length;
  $('statFlagged').textContent = allSamples.filter(s => s.status === 'Review Required').length;
  $('statBatches').textContent = allBatches.length;
  $('statInvestigations').textContent = allInvest.filter(i => !['Closed','Cleared After Review'].includes(i.status)).length;
  const holder = $('recentAnalysis');
  if (!allSamples.length) { holder.className = 'empty-state'; holder.innerHTML = '<div class="empty-icon">◉</div><strong>No samples yet</strong><p>Enter the six milk parameters to start a demonstration analysis.</p><button class="btn btn-secondary btn-small" data-go="analysis">Open analysis form</button>'; holder.querySelector('[data-go]').addEventListener('click', () => navigate('analysis')); return; }
  holder.className = 'table-scroll';
  holder.innerHTML = `<table><thead><tr><th>Sample</th><th>Source</th><th>Status</th></tr></thead><tbody>${allSamples.slice(0,5).map(s => `<tr><td><span class="table-id">${escapeHtml(s.id)}</span><br><small>${escapeHtml(fmtDate(s.date))}</small></td><td>${escapeHtml(s.source)}</td><td><span class="status-badge ${s.status === 'Review Required' ? 'review' : 'normal'}">${escapeHtml(s.status)}</span></td></tr>`).join('')}</tbody></table>`;
}
function renderHistory() {
  const q = ($('historySearch').value || '').trim().toLowerCase(); const status = $('historyStatus').value;
  const list = samples().filter(s => (!status || s.status === status) && [s.id,s.source,s.batchId].some(x => String(x || '').toLowerCase().includes(q)));
  $('historyBody').innerHTML = list.map(s => `<tr><td class="table-id">${escapeHtml(s.id)}</td><td>${escapeHtml(fmtDate(s.date))}</td><td>${escapeHtml(s.source)}</td><td>${escapeHtml(s.batchId || '—')}</td><td><span class="status-badge ${s.status === 'Review Required' ? 'review' : 'normal'}">${escapeHtml(s.status)}</span></td><td><div class="table-actions"><button class="small-action" data-view-sample="${escapeHtml(s.id)}">View</button><button class="small-action" data-print-sample="${escapeHtml(s.id)}">PDF</button><button class="small-action danger" data-delete-sample="${escapeHtml(s.id)}">Delete</button></div></td></tr>`).join('');
  $('historyEmpty').classList.toggle('hidden', list.length !== 0);
  $('historyBody').querySelectorAll('[data-view-sample]').forEach(btn => btn.addEventListener('click', () => { const record = samples().find(s => s.id === btn.dataset.viewSample); if (!record) return; navigate('analysis'); renderSampleResult(record); }));
  $('historyBody').querySelectorAll('[data-print-sample]').forEach(btn => btn.addEventListener('click', () => printSample(btn.dataset.printSample)));
  $('historyBody').querySelectorAll('[data-delete-sample]').forEach(btn => btn.addEventListener('click', () => { const id = btn.dataset.deleteSample; if (!confirm(`Delete sample ${id}?`)) return; setList(STORAGE_KEYS.samples, samples().filter(s => s.id !== id)); renderHistory(); renderDashboard(); refreshInvestigationSelects(); toast('Sample deleted.', 'success'); }));
}
function clearAnalysisForm() {
  $('analysisForm').reset(); showSampleId(); $('sampleDate').value = today(); $('analysisResult').classList.add('hidden'); $('analysisResult').innerHTML = '';
}
function submitBatch(event) {
  event.preventDefault();
  const record = {
    id: $('batchId').value || makeId('BAT'), source: $('batchSource').value.trim(), collectionCentre: $('collectionCentre').value.trim(),
    collectionDate: $('collectionDate').value, quantity: Number($('quantity').value), processingUnit: $('processingUnit').value.trim(),
    productName: $('productName').value.trim(), productId: $('productId').value.trim(), productQuantity: $('productQuantity').value.trim(),
    distributor: $('distributor').value.trim(), retailer: $('retailer').value.trim(), status: $('batchStatus').value,
    notes: $('batchNotes').value.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  if (!record.source || !record.collectionDate || !Number.isFinite(record.quantity) || record.quantity <= 0) { toast('Enter the source, collection date and a quantity greater than zero.', 'error'); return; }
  const list = batches(); if (list.some(b => b.id === record.id)) { toast('This batch ID already exists. Generate a new batch ID.', 'error'); return; }
  list.unshift(record); if (!setList(STORAGE_KEYS.batches, list)) return;
  $('batchForm').reset(); showBatchId(); $('collectionDate').value = today(); $('batchStatus').value = 'Recorded';
  refreshBatchSelects(); refreshInvestigationSelects(); renderBatchList(); renderDashboard();
  toast('Batch saved successfully.', 'success');
}
function renderBatchList() {
  const list = batches(); const holder = $('batchList');
  if (!list.length) { holder.innerHTML = '<div class="empty-message">No batches recorded yet. Create your first batch above.</div>'; return; }
  holder.innerHTML = list.slice(0,8).map(b => `<div class="batch-item"><div><strong>${escapeHtml(b.id)}</strong><small>${escapeHtml(b.source)} · ${escapeHtml(b.quantity)} L<br>${escapeHtml(b.productName || 'Product not recorded')}</small></div><button data-show-batch="${escapeHtml(b.id)}">View trace →</button></div>`).join('');
  holder.querySelectorAll('[data-show-batch]').forEach(btn => btn.addEventListener('click', () => { $('traceSearch').value = btn.dataset.showBatch; showTrace('forward'); }));
}
function makeTimeline(items) {
  return `<div class="timeline">${items.map((item,index) => `<div class="timeline-item"><div class="timeline-dot">${index+1}</div><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail || 'Not recorded')}</small></div></div>`).join('')}</div>`;
}
function showTrace(direction) {
  const query = $('traceSearch').value.trim().toLowerCase(); const holder = $('traceResult');
  if (!query) { toast('Enter a batch ID or product ID first.', 'error'); $('traceSearch').focus(); return; }
  const allBatches = batches(); let batch = allBatches.find(b => b.id.toLowerCase() === query || (b.productId || '').toLowerCase() === query);
  if (!batch) batch = allBatches.find(b => b.id.toLowerCase().includes(query) || (b.productId || '').toLowerCase().includes(query));
  if (!batch) { holder.className = 'trace-result empty-state compact'; holder.innerHTML = '<div class="empty-icon">?</div><strong>No matching record</strong><p>Check the ID, or create a batch first.</p>'; return; }
  const linkedSamples = samples().filter(s => s.batchId === batch.id);
  const product = batch.productName ? `${batch.productName}${batch.productId ? ` (${batch.productId})` : ''}` : 'Product not recorded';
  let items;
  if (direction === 'forward') items = [
    {title:'Milk source / supplier',detail:batch.source}, {title:'Collection centre',detail:batch.collectionCentre || 'Not recorded'},
    {title:'Milk batch',detail:`${batch.id} · ${batch.quantity} litres · ${fmtDate(batch.collectionDate)}`},
    {title:'Processing unit',detail:batch.processingUnit || 'Not recorded'}, {title:'Product / lot',detail:`${product} · Qty: ${batch.productQuantity || 'Not recorded'}`},
    {title:'Distributor',detail:batch.distributor || 'Not recorded'}, {title:'Retailer',detail:batch.retailer || 'Not recorded'}
  ];
  else items = [
    {title:'Product / lot',detail:`${product} · Qty: ${batch.productQuantity || 'Not recorded'}`}, {title:'Retailer',detail:batch.retailer || 'Not recorded'},
    {title:'Distributor',detail:batch.distributor || 'Not recorded'}, {title:'Processing unit',detail:batch.processingUnit || 'Not recorded'},
    {title:'Original milk batch',detail:`${batch.id} · ${batch.quantity} litres`}, {title:'Collection centre',detail:batch.collectionCentre || 'Not recorded'}, {title:'Milk source / supplier',detail:batch.source}
  ];
  holder.className = 'trace-result';
  holder.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:start;margin-bottom:13px"><div><strong style="font-size:12px;color:#2d505c">${direction === 'forward' ? 'Forward trace' : 'Backward trace'}</strong><div style="font-size:10px;color:#70818b;margin-top:3px">Batch ${escapeHtml(batch.id)} · ${escapeHtml(batch.status)}</div></div><button class="small-action" id="tracePrint">Print / PDF</button></div>${makeTimeline(items)}<div class="notice" style="margin:10px 0 0">${linkedSamples.length} linked analysis record(s). Only recorded relationships are shown; missing details must be confirmed.</div>`;
  $('tracePrint').addEventListener('click', () => printTrace(batch, direction, linkedSamples));
}
function refreshBatchOnStatus(batchId, status) {
  const list = batches().map(b => b.id === batchId ? {...b,status,updatedAt:new Date().toISOString()} : b); setList(STORAGE_KEYS.batches,list); renderBatchList(); renderDashboard();
}
function refreshInvestigationForm() { refreshInvestigationSelects(); }
function createInvestigation(event) {
  event.preventDefault(); const batchId = $('investBatch').value; const batch = batches().find(b => b.id === batchId);
  if (!batch) { toast('Select an existing batch.', 'error'); return; }
  const record = { id:makeId('INV'), sampleId:$('investSample').value, batchId, priority:$('investPriority').value, notes:$('investNotes').value.trim(), status:'Open', labStatus:'Awaiting laboratory verification', followupNotes:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  if (!record.notes) { toast('Add the reason for investigation.', 'error'); return; }
  const list = investigations(); list.unshift(record); if (!setList(STORAGE_KEYS.investigations,list)) return;
  $('investigationForm').reset(); $('investigationForm').classList.add('hidden'); refreshInvestigationSelects(); renderInvestigations(); renderDashboard();
  if (batch.status === 'Recorded') refreshBatchOnStatus(batch.id,'Under Investigation');
  toast(`Investigation ${record.id} created.`, 'success');
}
function renderInvestigations() {
  const filter = $('investStatusFilter').value; const list = investigations().filter(i => !filter || i.status === filter); const holder = $('investigationList');
  if (!list.length) { holder.innerHTML = '<div class="empty-state"><div class="empty-icon">⚑</div><strong>No investigations found</strong><p>Create a case linked to an existing batch to begin documenting a review.</p></div>'; return; }
  holder.innerHTML = list.map(i => {
    const b = batches().find(x => x.id === i.batchId); const s = samples().find(x => x.id === i.sampleId);
    return `<article class="investigation-card"><div class="investigation-card-top"><div><h4>${escapeHtml(i.id)} · Batch ${escapeHtml(i.batchId)}</h4><p>${escapeHtml(b ? `${b.source} · ${b.productName || 'Product not recorded'}` : 'Batch details not found')}</p></div><span class="status-badge ${i.status === 'On Hold' ? 'hold' : i.status === 'Closed' || i.status === 'Cleared After Review' ? 'normal' : 'review'}">${escapeHtml(i.status)}</span></div><div class="invest-meta"><span class="meta-chip">${escapeHtml(i.priority)}</span><span class="meta-chip">Created ${escapeHtml(fmtDateTime(i.createdAt))}</span>${s ? `<span class="meta-chip">Sample ${escapeHtml(s.id)} · ${escapeHtml(s.status)}</span>` : ''}</div><p><b>Initial notes:</b> ${escapeHtml(i.notes)}</p><div class="investigation-controls"><label>Case status<select data-case-status="${escapeHtml(i.id)}">${['Open','Under Investigation','Awaiting Laboratory Verification','Cleared After Review','On Hold','Closed'].map(x=>`<option ${i.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Laboratory status<select data-lab-status="${escapeHtml(i.id)}">${['Awaiting laboratory verification','Sample submitted to laboratory','Laboratory confirmed issue','No issue found by laboratory','Not recorded'].map(x=>`<option ${i.labStatus===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="full-control">Follow-up notes<textarea rows="2" data-followup="${escapeHtml(i.id)}" placeholder="Verification details or actions">${escapeHtml(i.followupNotes || '')}</textarea></label><button class="btn btn-secondary btn-small" data-save-invest="${escapeHtml(i.id)}">Save updates</button><button class="small-action" data-print-invest="${escapeHtml(i.id)}">Print / PDF</button></div></article>`;
  }).join('');
  holder.querySelectorAll('[data-save-invest]').forEach(btn => btn.addEventListener('click', () => {
    const id=btn.dataset.saveInvest; const status=holder.querySelector(`[data-case-status="${CSS.escape(id)}"]`).value; const labStatus=holder.querySelector(`[data-lab-status="${CSS.escape(id)}"]`).value; const followupNotes=holder.querySelector(`[data-followup="${CSS.escape(id)}"]`).value.trim();
    const updated = investigations().map(i => i.id === id ? {...i,status,labStatus,followupNotes,updatedAt:new Date().toISOString()} : i); setList(STORAGE_KEYS.investigations,updated);
    const saved=updated.find(i=>i.id===id); if (saved && saved.status==='On Hold') refreshBatchOnStatus(saved.batchId,'On Hold'); else if (saved && saved.status==='Cleared After Review') refreshBatchOnStatus(saved.batchId,'Cleared After Review');
    renderInvestigations(); renderDashboard(); toast('Investigation updated.', 'success');
  }));
  holder.querySelectorAll('[data-print-invest]').forEach(btn => btn.addEventListener('click', () => printInvestigation(btn.dataset.printInvest)));
}
function printableWindow(title, content) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast('Allow pop-ups to open the printable report.', 'error'); return; }
  win.document.open(); win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#233d48;margin:32px;line-height:1.5}h1{color:#123c48;font-size:22px}h2{font-size:16px;color:#176f68;margin-top:25px}.muted{color:#687f89;font-size:12px}.warning{padding:12px;border:1px solid #d7e8e5;background:#f0f9f7;margin:20px 0;font-size:12px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #dce5e8;padding:8px;text-align:left;font-size:12px}th{background:#eef5f7}.foot{border-top:1px solid #ddd;padding-top:12px;margin-top:25px;font-size:11px;color:#637b83}@media print{button{display:none}}</style></head><body>${content}<div class="foot">DairySafe Intelligence Platform · Software demonstration · Not a laboratory certificate</div><script>window.onload=()=>window.print();<\/script></body></html>`); win.document.close();
}
function printSample(id) {
  const s = samples().find(x => x.id === id); if (!s) { toast('Sample record not found.', 'error'); return; }
  const params = [['pH',s.ph],['Temperature (°C)',s.temperature],['Density (g/mL)',s.density],['Fat (%)',s.fat],['SNF (%)',s.snf],['Conductivity (µS/cm)',s.conductivity]];
  printableWindow(`DairySafe Sample ${s.id}`, `<h1>DairySafe Milk Analysis Report</h1><p class="muted">Sample ID: ${escapeHtml(s.id)} · Created ${escapeHtml(fmtDateTime(s.createdAt))}</p><h2>Sample information</h2><p>Source: ${escapeHtml(s.source)}<br>Milk type: ${escapeHtml(s.milkType)}<br>Sample date: ${escapeHtml(fmtDate(s.date))}<br>Batch ID: ${escapeHtml(s.batchId || 'Not linked')}<br>Analyst: ${escapeHtml(s.analyst || 'Not recorded')}</p><h2>Parameter readings</h2><table><tr><th>Parameter</th><th>Entered value</th></tr>${params.map(([a,b])=>`<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`).join('')}</table><h2>Demonstration result: ${escapeHtml(s.status)}</h2><p>${escapeHtml(s.explanation)}</p><p><b>Suggested next action:</b> ${escapeHtml(s.recommendation)}</p><p><b>Remarks:</b> ${escapeHtml(s.remarks || 'None')}</p><div class="warning"><b>Disclaimer:</b> ${escapeHtml(s.mode)}. This result is not a trained AI prediction, a laboratory confirmation, or proof of purity, adulteration or safety.</div>`);
}
function printTrace(batch,direction,linkedSamples) {
  const fields = [['Source / supplier',batch.source],['Collection centre',batch.collectionCentre],['Collection date',fmtDate(batch.collectionDate)],['Quantity',`${batch.quantity} litres`],['Processing unit',batch.processingUnit],['Product / lot',batch.productName],['Product ID',batch.productId],['Product quantity',batch.productQuantity],['Distributor',batch.distributor],['Retailer',batch.retailer],['Status',batch.status],['Notes',batch.notes]];
  printableWindow(`DairySafe Trace ${batch.id}`,`<h1>DairySafe Batch Traceability Report</h1><p class="muted">${direction==='forward'?'Forward trace':'Backward trace'} · Batch ID: ${escapeHtml(batch.id)}</p><table><tr><th>Field</th><th>Recorded value</th></tr>${fields.map(([a,b])=>`<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b || 'Not recorded')}</td></tr>`).join('')}</table><h2>Linked analysis samples</h2><p>${linkedSamples.length ? linkedSamples.map(s=>`${escapeHtml(s.id)} (${escapeHtml(s.status)})`).join('<br>') : 'No analysis sample linked to this batch.'}</p><div class="warning">Traceability shows only information recorded in this prototype. Verify all relationships before making an operational decision.</div>`);
}
function printInvestigation(id) {
  const i = investigations().find(x=>x.id===id); if(!i) return;
  const b=batches().find(x=>x.id===i.batchId); const s=samples().find(x=>x.id===i.sampleId);
  printableWindow(`DairySafe Investigation ${i.id}`,`<h1>DairySafe Risk Investigation Report</h1><p class="muted">Case ID: ${escapeHtml(i.id)} · Created ${escapeHtml(fmtDateTime(i.createdAt))}</p><h2>Case details</h2><table><tr><th>Field</th><th>Value</th></tr><tr><td>Batch ID</td><td>${escapeHtml(i.batchId)}</td></tr><tr><td>Source</td><td>${escapeHtml(b?.source || 'Not found')}</td></tr><tr><td>Product</td><td>${escapeHtml(b?.productName || 'Not recorded')}</td></tr><tr><td>Sample</td><td>${escapeHtml(s?.id || 'Not linked')}</td></tr><tr><td>Screening result</td><td>${escapeHtml(s?.status || 'No sample linked')}</td></tr><tr><td>Priority</td><td>${escapeHtml(i.priority)}</td></tr><tr><td>Case status</td><td>${escapeHtml(i.status)}</td></tr><tr><td>Laboratory status</td><td>${escapeHtml(i.labStatus)}</td></tr><tr><td>Initial notes</td><td>${escapeHtml(i.notes)}</td></tr><tr><td>Follow-up notes</td><td>${escapeHtml(i.followupNotes || 'None')}</td></tr></table><div class="warning">This report is for investigation support only. It is not a recall order or laboratory certificate. Final decisions remain with authorized personnel.</div>`);
}
function init() {
  document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
  document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.go)));
  $('mobileMenu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('dismissBanner').addEventListener('click', () => $('dismissBanner').closest('.alert-banner').remove());
  $('analysisForm').addEventListener('submit', submitAnalysis);
  $('clearAnalysis').addEventListener('click', clearAnalysisForm);
  $('historySearch').addEventListener('input', renderHistory); $('historyStatus').addEventListener('change', renderHistory);
  $('batchForm').addEventListener('submit', submitBatch); $('clearBatch').addEventListener('click', () => { $('batchForm').reset(); showBatchId(); $('collectionDate').value=today(); });
  $('traceForward').addEventListener('click', () => showTrace('forward')); $('traceBackward').addEventListener('click', () => showTrace('backward'));
  $('traceSearch').addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();showTrace('forward');} });
  $('openInvestigationBtn').addEventListener('click', () => { refreshInvestigationForm(); $('investigationForm').classList.remove('hidden'); $('investigationForm').scrollIntoView({behavior:'smooth',block:'start'}); });
  $('closeInvestigation').addEventListener('click', () => $('investigationForm').classList.add('hidden')); $('cancelInvestigation').addEventListener('click', () => $('investigationForm').classList.add('hidden'));
  $('investigationForm').addEventListener('submit', createInvestigation); $('investStatusFilter').addEventListener('change', renderInvestigations);
  showSampleId(); showBatchId(); $('sampleDate').value=today(); $('collectionDate').value=today();
  refreshBatchSelects(); refreshInvestigationSelects(); renderDashboard(); renderBatchList(); renderHistory(); renderInvestigations();
}
document.addEventListener('DOMContentLoaded', init);
