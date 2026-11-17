/* Obras BMS — PWA sin servidor. Datos en localStorage del dispositivo. */
'use strict';

const KEY = 'obras-bms-v1';
const STATUSES = ['Activo', 'Puesta en marcha', 'Garantía', 'Cerrado'];
const SYSTEMS = ['EcoStruxure EBO', 'Desigo CC', 'Desigo Optic', 'ABT Site / PXC', 'Otro'];
const PROTOCOLS = ['Modbus TCP', 'Modbus RTU', 'BACnet IP', 'BACnet MS/TP', 'DALI', 'KNX', 'LON', 'Otro'];
const TEMPLATE = {
  'Preparación': ['Revisar documentación y listado de puntos', 'Confirmar direcciones IP / VLAN con cliente', 'Backup del proyecto antes de cambios'],
  'Comunicaciones': ['Comunicación con controladores OK', 'Integraciones Modbus/BACnet leyendo valores', 'Sincronización horaria (NTP)'],
  'Puntos y lógica': ['Prueba punto a punto de entradas/salidas', 'Alarmas configuradas y probadas', 'Históricos / trends configurados', 'Programas horarios cargados'],
  'Gráficos': ['Pantallas TGML / gráficos con binds revisados', 'Navegación y permisos de usuario'],
  'Entrega': ['Formación al cliente', 'Documentación as-built entregada', 'Backup final guardado'],
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/* ---------- almacenamiento ---------- */
let db = load();
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { version: 1, projects: [] }; }
  catch { return { version: 1, projects: [] }; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('No se pudo guardar: ' + e.message); }
}
const getP = id => db.projects.find(p => p.id === id);
function touch(p) { p.updated = new Date().toISOString(); save(); }

function newChecklist() {
  return Object.entries(TEMPLATE).flatMap(([group, items]) => items.map(text => ({ id: uid(), group, text, done: false })));
}

/* ---------- utilidades UI ---------- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
const sheet = $('#sheet'), sheetForm = $('#sheetForm');
function openSheet(html, onSubmit) {
  sheetForm.innerHTML = html;
  sheetForm.onsubmit = e => {
    const btn = e.submitter;
    if (btn && btn.value === 'cancel') return;
    if (btn && btn.value === 'delete') { onSubmit(null, 'delete'); return; }
    const data = Object.fromEntries(new FormData(sheetForm).entries());
    onSubmit(data, 'save');
  };
  sheet.showModal();
  const first = sheetForm.querySelector('input,textarea,select');
  if (first && first.type !== 'checkbox') setTimeout(() => first.focus(), 50);
}
const opts = (list, val) => list.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
const field = (label, name, val = '', type = 'text', extra = '') =>
  `<label>${label}<input type="${type}" name="${name}" value="${esc(val)}" ${extra}></label>`;
const area = (label, name, val = '', ph = '') =>
  `<label>${label}<textarea name="${name}" placeholder="${esc(ph)}">${esc(val)}</textarea></label>`;
const actions = canDelete => `<div class="actions">
  ${canDelete ? '<button class="btn danger" value="delete" formnovalidate>Borrar</button>' : ''}
  <button class="btn" value="cancel" formnovalidate>Cancelar</button>
  <button class="btn primary" value="save">Guardar</button></div>`;

/* ---------- estado de navegación ---------- */
let filter = 'Todos', query = '';
function route() {
  const [, kind, id, tab] = location.hash.split('/');
  if (kind === 'p' && getP(id)) return renderProject(getP(id), tab || 'resumen');
  renderList();
}
window.addEventListener('hashchange', route);
$('#backBtn').onclick = () => { location.hash = '#/'; };

/* ---------- lista de proyectos ---------- */
function progress(p) {
  const n = p.checklist.length; if (!n) return 0;
  return Math.round(100 * p.checklist.filter(c => c.done).length / n);
}
function renderList() {
  $('#title').textContent = 'Obras BMS';
  $('#backBtn').hidden = true;
  $('#fab').onclick = () => editProject();
  $('#fab').textContent = '+';
  $('#view').innerHTML = `
    <input class="search" type="search" id="q" placeholder="Buscar obra, cliente, equipo, IP, nota…" value="${esc(query)}">
    <div class="chips">${['Todos', ...STATUSES].map(s => `<button class="chip ${s === filter ? 'on' : ''}" data-f="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <div id="items"></div>`;
  $('#q').oninput = e => { query = e.target.value; renderItems(); };
  $('#view').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; renderList(); });
  renderItems();
}
function renderItems() {
  const q = query.toLowerCase();
  const items = db.projects
    .filter(p => filter === 'Todos' || p.status === filter)
    .filter(p => !q || [p.code, p.name, p.client, p.site, p.system, p.notes, p.network,
      ...p.devices.map(d => [d.name, d.model, d.address, d.notes].join(' ')), ...p.visits.map(v => v.title + ' ' + v.text + ' ' + v.pending)]
      .join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const box = $('#items');
  box.innerHTML = items.length ? items.map(p => {
      const pend = p.visits.filter(v => v.pending && v.pending.trim()).length;
      return `<div class="card link" data-id="${p.id}">
        <div class="row"><h3>${p.code ? esc(p.code) + ' · ' : ''}${esc(p.name)}</h3>
        <span class="badge ${esc(p.status.split(' ')[0])}">${esc(p.status)}</span></div>
        <div class="meta">${esc([p.client, p.system].filter(Boolean).join(' · '))}</div>
        <div class="meta">${p.devices.length} equipos · ${p.visits.length} visitas${pend ? ` · ${pend} con pendientes` : ''}</div>
        <div class="progress"><i style="width:${progress(p)}%"></i></div></div>`;
    }).join('') : `<div class="empty">${db.projects.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay obras.<br>Pulsa <b>+</b> para crear la primera.'}</div>`;
  box.querySelectorAll('[data-id]').forEach(c => c.onclick = () => { location.hash = `#/p/${c.dataset.id}`; });
}

function editProject(p) {
  const isNew = !p;
  p = p || { status: 'Activo', system: SYSTEMS[0] };
  openSheet(`<h2>${isNew ? 'Nueva obra' : 'Editar obra'}</h2>
    ${field('Código de proyecto', 'code', p.code, 'text', 'placeholder="P254"')}
    ${field('Nombre *', 'name', p.name, 'text', 'required')}
    ${field('Cliente', 'client', p.client)}
    ${field('Ubicación / dirección', 'site', p.site)}
    <label>Sistema<select name="system">${opts(SYSTEMS, p.system)}</select></label>
    <label>Estado<select name="status">${opts(STATUSES, p.status)}</select></label>
    ${area('Contactos', 'contact', p.contact, 'Jefe de obra, mantenedor, teléfonos…')}
    ${area('Red / accesos', 'network', p.network, 'IPs servidor, VLAN, VPN, usuarios…')}
    ${area('Notas generales', 'notes', p.notes)}
    ${actions(!isNew)}`, (data, act) => {
    if (act === 'delete') {
      if (!confirm('¿Borrar la obra y todo su contenido?')) return;
      db.projects = db.projects.filter(x => x.id !== p.id); save(); location.hash = '#/'; route(); return;
    }
    if (isNew) {
      const np = { id: uid(), created: new Date().toISOString(), visits: [], devices: [], checklist: newChecklist(), ...data };
      db.projects.push(np); touch(np); location.hash = `#/p/${np.id}`;
    } else { Object.assign(p, data); touch(p); route(); }
  });
}

/* ---------- ficha de proyecto ---------- */
const TABS = { resumen: 'Resumen', visitas: 'Visitas', checklist: 'Checklist', equipos: 'Equipos' };
function renderProject(p, tab) {
  $('#title').textContent = p.code ? `${p.code} · ${p.name}` : p.name;
  $('#backBtn').hidden = false;
  const fabs = { resumen: () => editProject(p), visitas: () => editVisit(p), checklist: () => editCheck(p), equipos: () => editDevice(p) };
  $('#fab').onclick = fabs[tab];
  $('#fab').textContent = tab === 'resumen' ? '✎' : '+';

  const tabsHtml = `<nav class="tabs">${Object.entries(TABS).map(([k, v]) =>
    `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</nav>`;
  let body = '';

  if (tab === 'resumen') {
    const pend = p.visits.filter(v => v.pending && v.pending.trim()).sort((a, b) => b.date.localeCompare(a.date));
    const kv = [['Cliente', p.client], ['Ubicación', p.site], ['Sistema', p.system], ['Estado', p.status]]
      .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    body = `<div class="card"><dl class="kv">${kv}</dl>
        <div class="progress"><i style="width:${progress(p)}%"></i></div>
        <div class="meta" style="margin-top:4px">Checklist ${progress(p)}% completado</div></div>
      ${p.contact ? `<div class="card"><div class="group-title" style="margin-top:0">Contactos</div><div class="pre">${linkify(p.contact)}</div></div>` : ''}
      ${p.network ? `<div class="card"><div class="group-title" style="margin-top:0">Red / accesos</div><div class="pre">${esc(p.network)}</div></div>` : ''}
      ${p.notes ? `<div class="card"><div class="group-title" style="margin-top:0">Notas</div><div class="pre">${esc(p.notes)}</div></div>` : ''}
      ${pend.length ? `<div class="card"><div class="group-title" style="margin-top:0">Pendientes de visitas</div>
        ${pend.map(v => `<div style="margin-bottom:8px"><div class="meta">${fmtDate(v.date)} · ${esc(v.title || 'Visita')}</div><div class="pre">${esc(v.pending)}</div></div>`).join('')}</div>` : ''}
      <button class="btn" id="shareBtn" style="width:100%">Compartir resumen de la obra</button>`;
  }

  if (tab === 'visitas') {
    const vs = [...p.visits].sort((a, b) => b.date.localeCompare(a.date));
    body = vs.length ? vs.map(v => `<div class="card link" data-v="${v.id}">
        <div class="row"><h3>${esc(v.title || 'Visita')}</h3><span class="meta">${fmtDate(v.date)}</span></div>
        <div class="pre">${esc(v.text)}</div>
        ${v.pending ? `<div class="group-title">Pendiente</div><div class="pre">${esc(v.pending)}</div>` : ''}</div>`).join('')
      : `<div class="empty">Sin notas de visita.<br>Pulsa <b>+</b> para añadir la de hoy.</div>`;
  }

  if (tab === 'checklist') {
    const groups = [...new Set(p.checklist.map(c => c.group))];
    body = p.checklist.length ? groups.map(g => `<div class="group-title">${esc(g)}</div><div class="card">
        ${p.checklist.filter(c => c.group === g).map(c => `<div class="check ${c.done ? 'done' : ''}">
          <input type="checkbox" data-c="${c.id}" ${c.done ? 'checked' : ''}><span>${esc(c.text)}</span>
          <button class="mini" data-ce="${c.id}" aria-label="Editar">✎</button></div>`).join('')}</div>`).join('')
      : `<div class="empty">Checklist vacío.</div>`;
  }

  if (tab === 'equipos') {
    body = p.devices.length ? p.devices.map(d => `<div class="card link" data-d="${d.id}">
        <div class="row"><h3>${esc(d.name)}</h3><span class="badge">${esc(d.protocol)}</span></div>
        <div class="meta">${esc([d.model, d.address && 'Dir: ' + d.address, d.slave && 'ID/Inst: ' + d.slave].filter(Boolean).join(' · '))}</div>
        ${d.notes ? `<div class="pre" style="margin-top:6px">${esc(d.notes)}</div>` : ''}</div>`).join('')
      : `<div class="empty">Sin equipos.<br>Añade controladores, SAI, enfriadoras, pasarelas…</div>`;
  }

  $('#view').innerHTML = tabsHtml + body;
  $('#view').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { location.hash = `#/p/${p.id}/${b.dataset.tab}`; });
  $('#view').querySelectorAll('[data-v]').forEach(c => c.onclick = () => editVisit(p, p.visits.find(v => v.id === c.dataset.v)));
  $('#view').querySelectorAll('[data-d]').forEach(c => c.onclick = () => editDevice(p, p.devices.find(d => d.id === c.dataset.d)));
  $('#view').querySelectorAll('[data-c]').forEach(cb => cb.onchange = () => {
    p.checklist.find(c => c.id === cb.dataset.c).done = cb.checked; touch(p);
    cb.closest('.check').classList.toggle('done', cb.checked);
  });
  $('#view').querySelectorAll('[data-ce]').forEach(b => b.onclick = () => editCheck(p, p.checklist.find(c => c.id === b.dataset.ce)));
  const sb = $('#shareBtn'); if (sb) sb.onclick = () => shareText(projectSummary(p), p.name);
}

function linkify(s) {
  return esc(s).replace(/(\+?\d[\d\s]{7,}\d)/g, m => `<a href="tel:${m.replace(/\s/g, '')}">${m}</a>`)
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');
}

function editVisit(p, v) {
  const isNew = !v; v = v || { date: today() };
  openSheet(`<h2>${isNew ? 'Nueva visita' : 'Editar visita'}</h2>
    ${field('Fecha', 'date', v.date, 'date', 'required')}
    ${field('Título', 'title', v.title, 'text', 'placeholder="Puesta en marcha zona 1, revisión alarmas…"')}
    ${area('Qué se hizo', 'text', v.text)}
    ${area('Pendiente', 'pending', v.pending, 'Lo que queda por hacer o pedir al cliente')}
    ${!isNew ? '<button class="btn" value="share" type="button" id="shareVisit">Compartir informe de visita</button>' : ''}
    ${actions(!isNew)}`, (data, act) => {
    if (act === 'delete') { p.visits = p.visits.filter(x => x.id !== v.id); }
    else if (isNew) p.visits.push({ id: uid(), ...data });
    else Object.assign(v, data);
    touch(p); route();
  });
  const sv = $('#shareVisit');
  if (sv) sv.onclick = () => shareText(
    `${p.code ? p.code + ' · ' : ''}${p.name}\nVisita ${fmtDate(v.date)}${v.title ? ' — ' + v.title : ''}\n\nRealizado:\n${v.text || '-'}\n\nPendiente:\n${v.pending || '-'}`, 'Informe de visita');
}

function editCheck(p, c) {
  const isNew = !c; c = c || { group: 'Otros' };
  const groups = [...new Set([...p.checklist.map(x => x.group), ...Object.keys(TEMPLATE), 'Otros'])];
  openSheet(`<h2>${isNew ? 'Nuevo punto de checklist' : 'Editar punto'}</h2>
    ${field('Tarea *', 'text', c.text, 'text', 'required')}
    <label>Grupo<input type="text" name="group" value="${esc(c.group)}" list="groups"></label>
    <datalist id="groups">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist>
    ${actions(!isNew)}`, (data, act) => {
    if (act === 'delete') p.checklist = p.checklist.filter(x => x.id !== c.id);
    else if (isNew) p.checklist.push({ id: uid(), done: false, ...data, group: data.group || 'Otros' });
    else Object.assign(c, data);
    touch(p); route();
  });
}

function editDevice(p, d) {
  const isNew = !d; d = d || { protocol: PROTOCOLS[0] };
  openSheet(`<h2>${isNew ? 'Nuevo equipo' : 'Editar equipo'}</h2>
    ${field('Nombre *', 'name', d.name, 'text', 'required placeholder="SAI Zigor DVC, Enfriadora 1…"')}
    ${field('Marca / modelo', 'model', d.model)}
    <label>Protocolo<select name="protocol">${opts(PROTOCOLS, d.protocol)}</select></label>
    ${field('Dirección IP / puerto / bus', 'address', d.address, 'text', 'placeholder="192.168.1.50:502"')}
    ${field('Slave ID / instancia', 'slave', d.slave)}
    ${area('Notas (registros, mapa de puntos, usuario…)', 'notes', d.notes)}
    ${actions(!isNew)}`, (data, act) => {
    if (act === 'delete') p.devices = p.devices.filter(x => x.id !== d.id);
    else if (isNew) p.devices.push({ id: uid(), ...data });
    else Object.assign(d, data);
    touch(p); route();
  });
}

/* ---------- compartir / exportar ---------- */
function projectSummary(p) {
  const done = p.checklist.filter(c => c.done).length;
  const pend = p.visits.filter(v => v.pending && v.pending.trim());
  return [
    `${p.code ? p.code + ' · ' : ''}${p.name}`,
    [p.client, p.site, p.system, p.status].filter(Boolean).join(' | '),
    `Checklist: ${done}/${p.checklist.length}`,
    p.devices.length ? '\nEquipos:\n' + p.devices.map(d => `- ${d.name} (${d.protocol}${d.address ? ', ' + d.address : ''}${d.slave ? ', ID ' + d.slave : ''})`).join('\n') : '',
    pend.length ? '\nPendientes:\n' + pend.map(v => `- [${fmtDate(v.date)}] ${v.pending}`).join('\n') : '',
  ].filter(Boolean).join('\n');
}
async function shareText(text, title) {
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch { return; } }
  try { await navigator.clipboard.writeText(text); toast('Copiado al portapapeles'); }
  catch { prompt('Copia el texto:', text); }
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `obras-bms-${today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  localStorage.setItem(KEY + '-lastbackup', today());
}
$('#importFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.projects)) throw new Error('formato no válido');
    const merge = confirm(`Copia con ${data.projects.length} obras.\nAceptar = combinar con las actuales\nCancelar = reemplazar todo`);
    if (merge) {
      const ids = new Set(db.projects.map(p => p.id));
      data.projects.forEach(p => ids.has(p.id) ? Object.assign(getP(p.id), p) : db.projects.push(p));
    } else db = data;
    save(); toast('Copia importada'); location.hash = '#/'; route();
  } catch (err) { toast('Error al importar: ' + err.message); }
  e.target.value = '';
};

$('#menuBtn').onclick = () => {
  const last = localStorage.getItem(KEY + '-lastbackup');
  openSheet(`<h2>Menú</h2><div class="menu-list">
    <button type="button" id="mExport">⬇️ Exportar copia de seguridad</button>
    <button type="button" id="mImport">⬆️ Importar copia de seguridad</button>
    </div><p class="meta">Los datos se guardan solo en este dispositivo. Última copia: ${last ? fmtDate(last) : 'nunca'}.<br>
    ${db.projects.length} obras guardadas.</p>
    <div class="actions"><button class="btn" value="cancel">Cerrar</button></div>`, () => {});
  $('#mExport').onclick = () => { sheet.close(); exportBackup(); };
  $('#mImport').onclick = () => { sheet.close(); $('#importFile').click(); };
};

/* ---------- arranque ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
route();
