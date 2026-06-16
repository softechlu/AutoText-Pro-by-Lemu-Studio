// AutoText Pro — Content Script v4
// Trigger: inmediato al terminar de escribir el atajo (sin Space ni Enter)

(function () {
  'use strict';

  if (window.__autotextProLoaded) return;
  window.__autotextProLoaded = true;

  let shortcuts = [];

  function load() {
    chrome.storage.sync.get(['shortcuts'], (r) => {
      shortcuts = Array.isArray(r.shortcuts) ? r.shortcuts : [];
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.shortcuts) shortcuts = changes.shortcuts.newValue || [];
  });

  load();

  function replaceInInput(el, trigger, expansion) {
    const pos   = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
    const val   = el.value;
    const start = pos - trigger.length;
    if (start < 0) return;

    // En INPUT de una línea los \n no aplican — los convertimos a espacio
    const safeExpansion = el.tagName === 'INPUT'
      ? expansion.replace(/\n+/g, ' ')
      : expansion;

    const newVal = val.substring(0, start) + safeExpansion + val.substring(pos);

    const proto  = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, newVal);
    else el.value = newVal;

    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    const newCursor = start + safeExpansion.length;
    el.setSelectionRange(newCursor, newCursor);
  }

  function replaceInContentEditable(el, trigger, expansion) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let node    = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text   = node.textContent;
    const offset = range.startOffset;
    const before = text.substring(0, offset);
    if (!before.endsWith(trigger)) return;

    const range2 = document.createRange();
    range2.setStart(node, before.length - trigger.length);
    range2.setEnd(node, offset);
    range2.deleteContents();

    const lines = expansion.split('\n');
    const frag  = document.createDocumentFragment();
    lines.forEach((line, i) => {
      if (i > 0) frag.appendChild(document.createElement('br'));
      if (line) frag.appendChild(document.createTextNode(line));
    });
    const lastNode = frag.lastChild;
    range2.insertNode(frag);

    const newRange = document.createRange();
    newRange.setStartAfter(lastNode || node);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  document.addEventListener('input', (e) => {
    const el = e.target;
    const isInput    = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
    const isEditable = el.isContentEditable;
    if (!isInput && !isEditable) return;
    if (!shortcuts.length) return;

    // Obtener texto antes del cursor
    let before = '';
    if (isInput) {
      const pos = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
      before = el.value.substring(0, pos);
    } else {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0).cloneRange();
      range.setStart(el, 0);
      before = range.toString();
    }

    if (!before) return;

    for (const sc of shortcuts) {
      if (!sc.shortcut || !sc.text) continue;
      if (before.endsWith(sc.shortcut)) {
        if (isInput) replaceInInput(el, sc.shortcut, sc.text);
        else replaceInContentEditable(el, sc.shortcut, sc.text);
        chrome.runtime.sendMessage({ type: 'INCREMENT_USES', shortcutId: sc.id });
        return;
      }
    }
  }, true);

})();