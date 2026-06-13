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
  const sc = allShortcuts.find(s => s.id === id);
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

  const dup = allShortcuts.find(sc => sc.shortcut === shortcut && sc.id !== editingId);
  if (dup) { showToast(`El atajo "${shortcut}" ya existe`); shake(inputShortcut); return; }

  if (editingId !== null) {
    const idx = allShortcuts.findIndex(sc => sc.id === editingId);
    if (idx !== -1) allShortcuts[idx] = { ...allShortcuts[idx], shortcut, text };
  } else {
    allShortcuts.push({ id: Date.now(), shortcut, text });
  }

  persist(() => {
    closeModal(modalOverlay);
    showToast(editingId ? 'Shortcut actualizado ✓' : 'Shortcut creado ✓');
    editingId = null;
  });
}

function openDelete(id) {
  const sc = allShortcuts.find(s => s.id === id);
  if (!sc) return;
  deleteId = id;
  deleteShortcutName.textContent = sc.shortcut;
  openModal(deleteOverlay);
}

btnConfirmDelete.addEventListener('click', () => {
  allShortcuts = allShortcuts.filter(sc => sc.id !== deleteId);
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

// ── Import & Drag/Drop ────────────────────────────────────────────────────────
const dropZone = $('dropZone');

function processFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.json')) {
    showToast('Solo se aceptan archivos .json');
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      let raw = [];

      // Detección de formato (Array, Objeto con 'shortcuts', o Diccionario plano)
      if (Array.isArray(parsed)) {
        raw = parsed;
      } else if (parsed.shortcuts && Array.isArray(parsed.shortcuts)) {
        raw = parsed.shortcuts;
      } else if (typeof parsed === 'object' && parsed !== null) {
        const values = Object.values(parsed);
        if (values.length && typeof values[0] === 'object' && values[0].trigger) {
          raw = values.map(e => ({ shortcut: e.trigger, text: e.body }));
        } else {
          raw = Object.entries(parsed).map(([key, val]) => ({
            shortcut: key,
            text: String(val)
          }));
        }
      }

      const valid = raw.filter(sc => sc.shortcut && sc.text).map(sc => ({
        id: sc.id || Date.now() + Math.random(),
        shortcut: String(sc.shortcut).trim(),
        text: String(sc.text),
      }));

      if (!valid.length) throw new Error('Sin shortcuts válidos');

      // Actualizar el array global y persistir
      valid.forEach(imp => {
        const idx = allShortcuts.findIndex(s => s.shortcut === imp.shortcut);
        if (idx !== -1) allShortcuts[idx] = Object.assign(allShortcuts[idx], imp);
        else allShortcuts.push(imp);
      });

      persist(() => {
        showToast(`${valid.length} shortcuts importados ✓`);
        // Invocamos la función de refresco global
        if (typeof render === 'function') {
          render();
        }
      });
    } catch (err) {
      showToast('Error: ' + err.message);
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
