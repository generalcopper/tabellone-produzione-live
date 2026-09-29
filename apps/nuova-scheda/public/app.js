import { defaults } from './shortcuts.js';

const key = 'lg-new-tab.shortcuts.v1';
const $ = (id) => document.getElementById(id);
const grid = $('shortcuts');
const dialog = $('shortcut-dialog');
const menu = $('shortcut-menu');
const nameInput = $('shortcut-name');
const urlInput = $('shortcut-url');
const customDialog = $('customize-dialog');
const iconNames = new Set(defaults.map(item => item.icon));
let shortcuts = load();
let editingId = null;
let menuId = null;
let toastTimer;
let undoAction;
let recognition;

function normalizeUrl(value) {
  let text = value.trim();
  if (!text || /\s/.test(text)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = 'https://' + text;
  try {
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

function parseState(raw) {
  if (raw === null) return structuredClone(defaults);
  const state = JSON.parse(raw);
  if (state.version !== 1 || !Array.isArray(state.shortcuts)) throw new Error('Invalid state');
  const ids = new Set();
  return state.shortcuts.map(item => {
    const url = typeof item.url === 'string' && normalizeUrl(item.url);
    if (!url || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120 || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('Invalid shortcut');
    ids.add(item.id);
    return { id:item.id, name:item.name, url, icon:iconNames.has(item.icon) ? item.icon : '' };
  });
}

function load() {
  try { return parseState(localStorage.getItem(key)); }
  catch { return structuredClone(defaults); }
}

function notify(message, undo = null) {
  clearTimeout(toastTimer);
  $('toast-message').textContent = message;
  undoAction = undo;
  $('undo-button').hidden = !undo;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; undoAction = null; }, 7000);
}

function save(next, message, allowUndo = false) {
  const previous = structuredClone(shortcuts);
  try { localStorage.setItem(key, JSON.stringify({ version:1, shortcuts:next })); }
  catch { notify('Impossibile salvare le modifiche nel browser.'); return false; }
  shortcuts = next;
  closeMenu();
  render();
  notify(message, allowUndo ? () => save(previous, 'Modifica annullata.') : null);
  return true;
}

function svg(symbol) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#' + symbol);
  el.setAttribute('aria-hidden', 'true');
  el.append(use);
  return el;
}

function circle(item) {
  const el = document.createElement('span');
  el.className = 'shortcut-circle';
  el.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('span');
  fallback.className = 'initial';
  fallback.textContent = item.name.trim().charAt(0).toUpperCase();
  if (item.icon === 'blank') return el;
  if (item.icon === 'test' || item.icon === 'trading') { fallback.textContent = item.icon === 'test' ? 'C' : 'L'; el.append(fallback); return el; }
  const img = document.createElement('img');
  img.alt = '';
  img.width = 24;
  img.height = 24;
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.src = item.icon ? 'assets/' + item.icon + '.png' : 'https://www.google.com/s2/favicons?sz=64&domain_url=' + encodeURIComponent(new URL(item.url).origin);
  img.addEventListener('error', () => img.replaceWith(fallback), { once:true });
  el.append(img);
  return el;
}

function render() {
  const fragment = document.createDocumentFragment();
  for (const item of shortcuts) {
    const tile = document.createElement('div');
    tile.className = 'shortcut';
    tile.dataset.id = item.id;
    const link = document.createElement('a');
    link.className = 'shortcut-link';
    link.href = item.url;
    link.title = item.name + '\n' + item.url;
    link.setAttribute('aria-label', item.name);
    const label = document.createElement('span');
    label.className = 'shortcut-label';
    const title = document.createElement('span');
    title.textContent = item.name;
    label.append(title);
    link.append(circle(item), label);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'shortcut-more icon-button';
    more.setAttribute('aria-label', 'Opzioni: ' + item.name);
    more.setAttribute('aria-haspopup', 'menu');
    more.append(svg('dots-icon'));
    more.addEventListener('click', () => openMenu(item.id, more));
    tile.addEventListener('contextmenu', event => { event.preventDefault(); openMenu(item.id, more); });
    tile.append(link, more);
    fragment.append(tile);
  }
  const tile = document.createElement('div');
  tile.className = 'shortcut';
  const add = document.createElement('button');
  add.id = 'add-shortcut';
  add.type = 'button';
  add.className = 'add-shortcut';
  add.setAttribute('aria-label', 'Aggiungi scorciatoia');
  const icon = document.createElement('span');
  icon.className = 'shortcut-circle';
  icon.append(svg('plus-icon'));
  const label = document.createElement('span');
  label.className = 'shortcut-label';
  const title = document.createElement('span');
  title.textContent = 'Aggiungi scorciatoia';
  label.append(title);
  add.append(icon, label);
  add.addEventListener('click', () => openEditor());
  tile.append(add);
  fragment.append(tile);
  grid.replaceChildren(fragment);
}

function closeMenu() { if (menu.matches(':popover-open')) menu.hidePopover(); }
function openMenu(id, button) {
  closeMenu();
  menuId = id;
  const rect = button.getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(rect.right - 205, innerWidth - 213)) + 'px';
  menu.style.top = Math.max(8, Math.min(rect.bottom + 4, innerHeight - 108)) + 'px';
  menu.showPopover();
  $('menu-edit').focus();
}

function validate(showError = false) {
  const validUrl = normalizeUrl(urlInput.value);
  const invalid = urlInput.value.trim() && !validUrl;
  $('url-error').textContent = showError && invalid ? 'Inserisci un indirizzo http o https valido.' : '';
  urlInput.setAttribute('aria-invalid', String(Boolean(showError && invalid)));
  $('dialog-save').disabled = !nameInput.value.trim() || !validUrl;
  return Boolean(nameInput.value.trim() && validUrl);
}

function openEditor(id = null) {
  closeMenu();
  editingId = id;
  const item = shortcuts.find(value => value.id === id);
  $('dialog-title').textContent = item ? 'Modifica scorciatoia' : 'Aggiungi scorciatoia';
  nameInput.value = item?.name || '';
  urlInput.value = item?.url || '';
  $('dialog-remove').hidden = !item;
  validate();
  dialog.showModal();
  nameInput.focus();
}

function remove(id) {
  const item = shortcuts.find(value => value.id === id);
  if (!item || !window.confirm('Eliminare la scorciatoia “' + item.name + '”?')) return;
  if (save(shortcuts.filter(value => value.id !== id), 'Scorciatoia rimossa.', true)) {
    if (dialog.open) dialog.close();
    $('add-shortcut').focus();
  }
}

$('shortcut-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!validate(true)) return;
  const url = normalizeUrl(urlInput.value);
  const old = shortcuts.find(item => item.id === editingId);
  if (editingId && !old) { notify('La scorciatoia è stata rimossa in un’altra scheda.'); dialog.close(); return; }
  const item = { id:editingId || crypto.randomUUID(), name:nameInput.value.trim(), url, icon:old?.url === url ? old.icon : '' };
  const next = old ? shortcuts.map(value => value.id === old.id ? item : value) : [...shortcuts, item];
  if (save(next, old ? 'Scorciatoia modificata.' : 'Scorciatoia aggiunta.')) dialog.close();
});
nameInput.addEventListener('input', () => validate());
urlInput.addEventListener('input', () => validate());
urlInput.addEventListener('blur', () => validate(true));
$('dialog-cancel').addEventListener('click', () => dialog.close());
$('dialog-remove').addEventListener('click', () => remove(editingId));
$('menu-edit').addEventListener('click', () => openEditor(menuId));
$('menu-remove').addEventListener('click', () => remove(menuId));
$('undo-button').addEventListener('click', () => undoAction?.());
$('customize-button').addEventListener('click', () => customDialog.showModal());
$('customize-close').addEventListener('click', () => customDialog.close());
$('customize-add').addEventListener('click', () => { customDialog.close(); openEditor(); });
$('restore-button').addEventListener('click', () => {
  if (window.confirm('Ripristinare le 41 scorciatoie iniziali? Le modifiche personali verranno sostituite.')) {
    if (save(structuredClone(defaults), 'Scorciatoie ripristinate.', true)) customDialog.close();
  }
});
for (const modal of document.querySelectorAll('dialog')) {
  let outside = false;
  modal.addEventListener('pointerdown', event => { outside = event.target === modal && isOutside(event, modal); });
  modal.addEventListener('click', event => { if (outside && event.target === modal && isOutside(event, modal)) modal.close(); outside = false; });
}
function isOutside(event, element) { const r = element.getBoundingClientRect(); return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom; }
window.addEventListener('resize', closeMenu);
window.addEventListener('scroll', closeMenu);
window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  try { shortcuts = parseState(event.key === null ? null : event.newValue); closeMenu(); render(); } catch { /* Keep the last usable state. */ }
});

function search(text, ai = false) {
  const value = text.trim();
  if (!value && !ai) { $('search-input').focus(); return; }
  const isAddress = /^(https?:\/\/|localhost(?::|\/|$)|(?:[\w-]+\.)+[a-z]{2,}(?::|\/|$))/i.test(value);
  const url = isAddress && normalizeUrl(value);
  if (url && !ai) { window.location.assign(url); return; }
  const target = new URL('https://www.google.com/search');
  if (value) target.searchParams.set('q', value);
  if (ai) target.searchParams.set('udm', '50');
  window.location.assign(target.href);
}
$('search-form').addEventListener('submit', event => { event.preventDefault(); search($('search-input').value); });
$('ai-button').addEventListener('click', () => search($('search-input').value, true));
$('voice-button').addEventListener('click', () => {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { notify('La ricerca vocale non è disponibile in questo browser.'); return; }
  recognition = new Speech();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.onresult = event => { const text = event.results[0][0].transcript; $('search-input').value = text; $('voice-dialog').close(); search(text); };
  recognition.onerror = event => { if (event.error !== 'aborted') notify(event.error === 'not-allowed' ? 'Consenti il microfono per usare la ricerca vocale.' : 'Ricerca vocale non disponibile. Riprova.'); $('voice-dialog').close(); };
  recognition.onend = () => { if ($('voice-dialog').open) $('voice-dialog').close(); recognition = null; };
  try { $('voice-dialog').showModal(); recognition.start(); } catch { $('voice-dialog').close(); notify('Ricerca vocale non disponibile. Riprova.'); }
});
$('voice-close').addEventListener('click', () => $('voice-dialog').close());
$('voice-dialog').addEventListener('close', () => recognition?.abort());
render();
