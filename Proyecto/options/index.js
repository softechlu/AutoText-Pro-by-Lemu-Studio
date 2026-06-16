// AutoText Pro — Options Page JS v3
'use strict';

const PAGE_SIZE = 25;
let allShortcuts   = [];
let filtered       = [];
let currentPage    = 1;
let searchQuery    = '';
let editingId      = null;
let deleteId       = null;

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const searchInput      = $('searchInput');
const btnClearSearch   = $('btnClearSearch');
const btnNew           = $('btnNew');
const btnExport        = $('btnExport');
const btnImport        = $('btnImport');
const btnDark          = $('btnDark');
const fileInput        = $('fileInput');
const listEl           = $('shortcutsList');
const emptyState       = $('emptyState');
const paginationEl     = $('pagination');
const statsTotal       = $('statsTotal');
const statsFiltered    = $('statsFiltered');

const modalOverlay     = $('modalOverlay');
const modalTitle       = $('modalTitle');
const inputShortcut    = $('inputShortcut');
const inputText        = $('inputText');
const charCount        = $('charCount');
const btnSaveModal     = $('btnSaveModal');
const btnCancelModal   = $('btnCancelModal');
const btnCloseModal    = $('btnCloseModal');

const deleteOverlay    = $('deleteOverlay');
const deleteShortcutName = $('deleteShortcutName');
const btnConfirmDelete = $('btnConfirmDelete');
const btnCancelDelete  = $('btnCancelDelete');
const btnCloseDelete   = $('btnCloseDelete');

const testArea         = $('testArea');
const btnClearTest     = $('btnClearTest');
const hintList         = $('hintList');
const toast            = $('toast');

// ── Init ──────────────────────────────────────────────────────────────────────
$('footerYear').textContent = new Date().getFullYear();

chrome.storage.sync.get(['shortcuts', 'darkMode'], (r) => {
  allShortcuts = r.shortcuts || [];
  if (r.darkMode) applyDark(true);
  applyFilter();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts) {
    allShortcuts = changes.shortcuts.newValue || [];
    applyFilter();
  }
});

// ── Search ────────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  btnClearSearch.style.display = searchQuery ? 'flex' : 'none';
  currentPage = 1;
  applyFilter();
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  btnClearSearch.style.display = 'none';
  currentPage = 1;
  applyFilter();
  searchInput.focus();
});

// ── Filter ────────────────────────────────────────────────────────────────────
function applyFilter() {
  filtered = searchQuery
    ? allShortcuts.filter(sc =>
        sc.shortcut.toLowerCase().includes(searchQuery) ||
        sc.text.toLowerCase().includes(searchQuery))
    : [...allShortcuts];

if (currentSort === 'az') filtered.sort((a, b) => a.shortcut.localeCompare(b.shortcut));
  else if (currentSort === 'za') filtered.sort((a, b) => b.shortcut.localeCompare(a.shortcut));

  if (showDupsOnly) {
    const textCount = {};
    allShortcuts.forEach(sc => {
      const key = sc.text.trim();
      textCount[key] = (textCount[key] || 0) + 1;
    });
    filtered = filtered.filter(sc => textCount[sc.text.trim()] > 1);
  }

  statsTotal.textContent = allShortcuts.length;

  if (searchQuery && filtered.length !== allShortcuts.length) {
    statsFiltered.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`;
    statsFiltered.style.display = 'inline';
  } else {
    statsFiltered.style.display = 'none';
  }

  renderPage();
  renderPagination();
  renderHints();
}

// ── Render list ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function hl(text, q) {
  if (!q) return esc(text);
  return esc(text).replace(
    new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'),
    '<span class="hl">$1</span>'
  );
}

function renderPage() {
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > maxPage) currentPage = maxPage;

  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (items.length === 0) {
    listEl.style.display   = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  listEl.style.display    = 'flex';
  emptyState.style.display = 'none';
  listEl.innerHTML = '';

  items.forEach(sc => {
    const row = document.createElement('div');
    row.className = 'sc-row';
    row.innerHTML = `
      <div class="sc-trigger">${hl(sc.shortcut, searchQuery)}</div>
      <div class="sc-text">${hl(sc.text.replace(/\n/g, ' ↵ '), searchQuery)}</div>
      <div class="sc-actions">
        <button class="action-btn edit" data-id="${sc.id}" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="action-btn del" data-id="${sc.id}" title="Eliminar">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll('.action-btn.edit').forEach(b =>
    b.addEventListener('click', () => openEdit(+b.dataset.id)));
  listEl.querySelectorAll('.action-btn.del').forEach(b =>
    b.addEventListener('click', () => openDelete(+b.dataset.id)));
}

// ── Pagination ────────────────────────────────────────────────────────────────
function renderPagination() {
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (maxPage <= 1) { paginationEl.innerHTML = ''; return; }

  const range = pageRange(currentPage, maxPage);
  let html = `<button class="page-btn" id="pgPrev" ${currentPage===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;

  range.forEach(p => {
    if (p === '…') html += `<span class="page-ellipsis">…</span>`;
    else html += `<button class="page-btn ${p===currentPage?'active':''}" data-p="${p}">${p}</button>`;
  });

  html += `<button class="page-btn" id="pgNext" ${currentPage===maxPage?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
  paginationEl.innerHTML = html;

  $('pgPrev')?.addEventListener('click', () => goPage(currentPage - 1));
  $('pgNext')?.addEventListener('click', () => goPage(currentPage + 1));
  paginationEl.querySelectorAll('[data-p]').forEach(b =>
    b.addEventListener('click', () => goPage(+b.dataset.p)));
}

function pageRange(cur, max) {
  if (max <= 7) return Array.from({length:max},(_,i)=>i+1);
  if (cur <= 4) return [1,2,3,4,5,'…',max];
  if (cur >= max-3) return [1,'…',max-4,max-3,max-2,max-1,max];
  return [1,'…',cur-1,cur,cur+1,'…',max];
}

function goPage(p) {
  const max = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.max(1, Math.min(p, max));
  renderPage();
  renderPagination();
  listEl.scrollIntoView({behavior:'smooth', block:'start'});
}

// ── Hint list (test panel) ────────────────────────────────────────────────────
function renderHints() {
  if (!allShortcuts.length) {
    hintList.innerHTML = '<p style="font-size:12px;color:var(--text-light)">Sin shortcuts aún</p>';
    return;
  }
  hintList.innerHTML = allShortcuts.slice(0, 10).map(sc => `
    <div class="hint-item">
      <span class="hint-trigger">${esc(sc.shortcut)}</span>
      <span class="hint-preview">${esc(sc.text.substring(0,30))}${sc.text.length>30?'…':''}</span>
    </div>
  `).join('');
}

// ── Test area: expand shortcuts inline ───────────────────────────────────────
testArea.addEventListener('input', () => {
  if (!allShortcuts.length) return;
  const pos    = testArea.selectionStart;
  const before = testArea.value.substring(0, pos);
  for (const sc of allShortcuts) {
    if (!sc.shortcut || !sc.text) continue;
    if (before.endsWith(sc.shortcut)) {
      const after  = testArea.value.substring(pos);
      const newVal = before.slice(0, -sc.shortcut.length) + sc.text + after;
      testArea.value = newVal;
      const newPos = pos - sc.shortcut.length + sc.text.length;
      testArea.setSelectionRange(newPos, newPos);
      return;
    }
  }
});

btnClearTest.addEventListener('click', () => {
  testArea.value = '';
  testArea.focus();
});

// ── CRUD ──────────────────────────────────────────────────────────────────────
btnNew.addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Nuevo shortcut';
  inputShortcut.value = '';
  inputText.value     = '';
  charCount.textContent = '0';
  openModal(modalOverlay);
  setTimeout(() => inputShortcut.focus(), 80);
});

function openEdit(id) {
  const sc = allShortcuts.find(s => String(s.id) === String(id));
  if (!sc) return;
  editingId = id;
  modalTitle.textContent  = 'Editar shortcut';
  inputShortcut.value     = sc.shortcut;
  inputText.value         = sc.text;
  charCount.textContent   = sc.text.length;
  openModal(modalOverlay);
  setTimeout(() => inputShortcut.focus(), 80);
}

inputText.addEventListener('input', () => {
  charCount.textContent = inputText.value.length;
});

btnSaveModal.addEventListener('click', saveShortcut);
inputShortcut.addEventListener('keydown', e => { if (e.key==='Enter') saveShortcut(); });

function saveShortcut() {
  const shortcut = inputShortcut.value.trim();
  const text     = inputText.value.trim();

  if (!shortcut) { shake(inputShortcut); inputShortcut.focus(); return; }
  if (!text)     { shake(inputText);     inputText.focus();     return; }

  const dup = allShortcuts.find(sc => sc.shortcut === shortcut && String(sc.id) !== String(editingId));
  if (dup) { showToast(`El atajo "${shortcut}" ya existe`); shake(inputShortcut); return; }

  if (editingId !== null) {
    const idx = allShortcuts.findIndex(sc => String(sc.id) === String(editingId));
    if (idx !== -1) allShortcuts[idx] = { ...allShortcuts[idx], shortcut, text };
  } else {
    allShortcuts.push({ id: String(Date.now()), shortcut, text });
  }

  persist(() => {
    closeModal(modalOverlay);
    showToast(editingId ? 'Shortcut actualizado ✓' : 'Shortcut creado ✓');
    editingId = null;
  });
}

function openDelete(id) {
  const sc = allShortcuts.find(s => String(s.id) === String(id));
  if (!sc) return;
  deleteId = id;
  deleteShortcutName.textContent = sc.shortcut;
  openModal(deleteOverlay);
}

btnConfirmDelete.addEventListener('click', () => {
  allShortcuts = allShortcuts.filter(sc => String(sc.id) !== String(deleteId));
  persist(() => {
    closeModal(deleteOverlay);
    showToast('Shortcut eliminado');
    deleteId = null;
  });
});

// ── Persist ───────────────────────────────────────────────────────────────────
function persist(cb) {
  chrome.storage.sync.set({ shortcuts: allShortcuts }, () => {
    applyFilter();
    if (cb) cb();
  });
}

// ── Delete All ────────────────────────────────────────────────────────────────
const btnDeleteAll = $('btnDeleteAll');

btnDeleteAll.addEventListener('click', () => {
  if (!allShortcuts.length) { showToast('No hay shortcuts para borrar'); return; }
  $('deleteAllCount').textContent = allShortcuts.length;
  openModal($('deleteAllOverlay1'));
});

// Paso 1 — No / cerrar: no hace nada
$('btnDeleteAllNo1').addEventListener('click',    () => closeModal($('deleteAllOverlay1')));
$('btnCloseDeleteAll1').addEventListener('click', () => closeModal($('deleteAllOverlay1')));

// Paso 1 — Sí: ir al paso 2
$('btnDeleteAllSi1').addEventListener('click', () => {
  closeModal($('deleteAllOverlay1'));
  openModal($('deleteAllOverlay2'));
});

// Paso 2 — No / cerrar: no hace nada
$('btnDeleteAllNo2').addEventListener('click',    () => closeModal($('deleteAllOverlay2')));
$('btnCloseDeleteAll2').addEventListener('click', () => closeModal($('deleteAllOverlay2')));

// Paso 2 — Confirmar: descarga el backup y abre paso 3
$('btnDeleteAllConfirm').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ version: 1, shortcuts: allShortcuts }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), {
    href: url,
    download: `autotext-pro-backup-${stamp()}.json`
  });
  a.click();
  URL.revokeObjectURL(url);

  closeModal($('deleteAllOverlay2'));
$('inputDeleteConfirm').value = '';
  $('btnDeleteAllFinal').disabled = false;
  openModal($('deleteAllOverlay3'));
});

// Paso 3 — No / cerrar: no hace nada
$('btnDeleteAllNo3').addEventListener('click',    () => closeModal($('deleteAllOverlay3')));
$('btnCloseDeleteAll3').addEventListener('click', () => closeModal($('deleteAllOverlay3')));

// Paso 3 — Final: validar palabra y borrar todo
$('btnDeleteAllFinal').addEventListener('click', () => {
  if ($('inputDeleteConfirm').value !== 'B0rr4r') {
    showToast('Palabra incorrecta — escribe exactamente B0rr4r');
    const overlay = $('deleteAllOverlay3');
    overlay.classList.remove('modal-shake');
    void overlay.offsetWidth;
    overlay.classList.add('modal-shake');
    setTimeout(() => overlay.classList.remove('modal-shake'), 500);
    return;
  }
  allShortcuts = [];
  persist(() => {
    closeModal($('deleteAllOverlay3'));
    showToast('Todos los shortcuts eliminados ✓');
  });
});

// ── Export ────────────────────────────────────────────────────────────────────
btnExport.addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ version: 1, shortcuts: allShortcuts }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), {
    href: url,
    download: `autotext-pro-${stamp()}.json`
  });
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${allShortcuts.length} shortcuts exportados ✓`);
});

// ── Sort & Filtros ────────────────────────────────────────────────────────────
let currentSort = 'created';
let showDupsOnly = false;

document.getElementById('btnShowDups').addEventListener('click', () => {
  showDupsOnly = true;
  document.getElementById('btnClearFilter').style.display = 'inline-flex';
  document.getElementById('btnShowDups').style.display = 'none';
  currentPage = 1;
  applyFilter();
});

document.getElementById('btnClearFilter').addEventListener('click', () => {
  showDupsOnly = false;
  document.getElementById('btnClearFilter').style.display = 'none';
  document.getElementById('btnShowDups').style.display = 'inline-flex';
  currentPage = 1;
  applyFilter();
});
document.addEventListener('click', e => {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentSort = btn.dataset.sort;
  currentPage = 1;
  applyFilter();
});

// ── Import & Drag/Drop ────────────────────────────────────────────────────────
const dropZone = $('dropZone');

function processFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['json','yaml','yml','xml','csv'].includes(ext)) {
    showToast('Formatos aceptados: .json, .yaml, .yml, .xml, .csv');
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const txt = ev.target.result;
      let raw = [];

      if (ext === 'json') {
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) {
          raw = parsed;
        } else if (parsed.shortcuts && Array.isArray(parsed.shortcuts)) {
          raw = parsed.shortcuts;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const values = Object.values(parsed);
          if (values.length && typeof values[0] === 'object' && values[0].trigger) {
            raw = values.map(e => ({ shortcut: e.trigger, text: e.body }));
          } else {
            raw = Object.entries(parsed).map(([key, val]) => ({ shortcut: key, text: String(val) }));
          }
        }
      }

      else if (ext === 'yaml' || ext === 'yml') {
        const matches = [...txt.matchAll(/- trigger:\s*['"]?(.+?)['"]?\s*\n\s+replace:\s*([\s\S]*?)(?=\n- trigger:|\n*$)/gm)];
        raw = matches.map(m => ({ shortcut: m[1].trim(), text: m[2].trim() }));
      }

      else if (ext === 'xml') {
        const doc = new DOMParser().parseFromString(txt, 'text/xml');
        doc.querySelectorAll('snippet').forEach(n => {
          const shortcut = n.querySelector('abbreviation')?.textContent?.trim();
          const text     = n.querySelector('string')?.textContent?.trim();
          if (shortcut && text) raw.push({ shortcut, text });
        });
        if (!raw.length) {
          doc.querySelectorAll('phrase').forEach(n => {
            const shortcut = n.querySelector('trigger')?.textContent?.trim();
            const text     = n.querySelector('insert')?.textContent?.trim();
            if (shortcut && text) raw.push({ shortcut, text });
          });
        }
      }

      else if (ext === 'csv') {
        const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
        const start = lines[0]?.toLowerCase().startsWith('shortcut') ? 1 : 0;
        lines.slice(start).forEach(line => {
          const comma = line.indexOf(',');
          if (comma === -1) return;
          const shortcut = line.slice(0, comma).trim().replace(/^"|"$/g, '');
          const text     = line.slice(comma + 1).trim().replace(/^"|"$/g, '');
          if (shortcut && text) raw.push({ shortcut, text });
        });
      }

      const valid = raw.filter(sc => sc.shortcut && sc.text).map(sc => ({
        id: String(Date.now() + Math.random()),
        shortcut: String(sc.shortcut).trim(),
        text: String(sc.text),
      }));

      if (!valid.length) throw new Error('Sin shortcuts válidos en el archivo');

      const duplicates = valid.filter(imp => allShortcuts.some(s => s.shortcut === imp.shortcut));
      const newOnes    = valid.filter(imp => !allShortcuts.some(s => s.shortcut === imp.shortcut));

      if (duplicates.length > 0) {
        const dupOverlay  = $('dupOverlay');
        const dupMessage  = $('dupMessage');
        dupMessage.textContent = duplicates.length === 1
          ? `"${duplicates[0].shortcut}" ya existe. ¿Qué deseas hacer?`
          : `${duplicates.length} shortcuts ya existen. ¿Qué deseas hacer?`;
        openModal(dupOverlay);

        const cleanup = () => {
          $('btnDupOverwrite').onclick = null;
          $('btnDupRename').onclick    = null;
          $('btnDupCancel').onclick    = null;
          $('btnCloseDup').onclick     = null;
          closeModal(dupOverlay);
        };

        $('btnDupOverwrite').onclick = () => {
          cleanup();
          newOnes.forEach(imp => allShortcuts.push(imp));
          duplicates.forEach(imp => {
            const idx = allShortcuts.findIndex(s => s.shortcut === imp.shortcut);
            if (idx !== -1) allShortcuts[idx] = Object.assign(allShortcuts[idx], imp);
          });
          persist(() => {
            const msg = [newOnes.length && `${newOnes.length} nuevos`, duplicates.length && `${duplicates.length} sobreescritos`].filter(Boolean).join(', ');
            showToast(`Importados: ${msg} ✓`);
          });
        };

        $('btnDupRename').onclick = () => {
          cleanup();
          newOnes.forEach(imp => allShortcuts.push(imp));
          duplicates.forEach(imp => {
            let base = imp.shortcut, n = 2, candidate = `${base[0]}${n}${base.slice(1)}`;
            while (allShortcuts.some(s => s.shortcut === candidate)) { n++; candidate = `${base[0]}${n}${base.slice(1)}`; }
            allShortcuts.push({ ...imp, shortcut: candidate, id: String(Date.now() + Math.random()) });
          });
          persist(() => {
            const msg = [newOnes.length && `${newOnes.length} nuevos`, duplicates.length && `${duplicates.length} renombrados`].filter(Boolean).join(', ');
            showToast(`Importados: ${msg} ✓`);
          });
        };

        $('btnDupCancel').onclick = () => { cleanup(); newOnes.forEach(imp => allShortcuts.push(imp)); persist(() => showToast(`${newOnes.length} nuevos agregados, ${duplicates.length} saltados ✓`)); };
        $('btnCloseDup').onclick  = () => { cleanup(); };
        return;
      }

      let added = 0, updated = 0;
      valid.forEach(imp => {
        const idx = allShortcuts.findIndex(s => s.shortcut === imp.shortcut);
        if (idx !== -1) { allShortcuts[idx] = Object.assign(allShortcuts[idx], imp); updated++; }
        else { allShortcuts.push(imp); added++; }
      });

      persist(() => {
        const msg = [added && `${added} nuevos`, updated && `${updated} actualizados`].filter(Boolean).join(', ');
        showToast(`Importados: ${msg} ✓`);
      });
    } catch (err) {
      showToast('Error al importar: ' + err.message);
    }
    fileInput.value = '';
  };
  reader.readAsText(file);
}

// Eventos de botones
btnImport.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => processFile(e.target.files[0]));

// Eventos de Drag & Drop
document.addEventListener('dragenter', e => {
  if (e.dataTransfer?.types?.includes('Files')) dropZone.style.display = 'flex';
});

document.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('over');
});

document.addEventListener('dragleave', e => {
  if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
    dropZone.style.display = 'none';
    dropZone.classList.remove('over');
  }
});

document.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.style.display = 'none';
  dropZone.classList.remove('over');
  processFile(e.dataTransfer?.files?.[0]);
});

// ── Dark mode ─────────────────────────────────────────────────────────────────
btnDark.addEventListener('click', () => {
  const isDark = !document.body.classList.contains('dark');
  applyDark(isDark);
  chrome.storage.sync.set({ darkMode: isDark });
});

function applyDark(on) {
  document.body.classList.toggle('dark', on);
  btnDark.innerHTML = on
    ? '<i class="fa-solid fa-sun"></i><span>Tema</span>'
    : '<i class="fa-solid fa-moon"></i><span>Tema</span>';
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(el)  { el.classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

btnCancelModal.addEventListener('click',  () => closeModal(modalOverlay));
btnCloseModal.addEventListener('click',   () => closeModal(modalOverlay));
btnCancelDelete.addEventListener('click', () => closeModal(deleteOverlay));
btnCloseDelete.addEventListener('click',  () => closeModal(deleteOverlay));

[modalOverlay, deleteOverlay].forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) closeModal(o); }));

// ── Utils ─────────────────────────────────────────────────────────────────────
let toastT;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove('show'), 2600);
}

function shake(el) {
  el.style.animation = 'none';
  el.getBoundingClientRect();
  el.style.animation = 'shake 0.3s ease';
  setTimeout(() => (el.style.animation = ''), 400);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
