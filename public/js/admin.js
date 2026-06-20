/* ═══════════════════════════════════════════════
   Grandstand — Admin Panel Logic
   admin.js
   Requires: config.js (window.GRANDSTAND_CONFIG), Supabase CDN
═══════════════════════════════════════════════ */

'use strict';

/* ── Supabase client ── */
const { createClient } = window.supabase;
let sb; // initialised after auth check

/* ── DOM helpers ── */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ── State ── */
let currentTab     = 'competitions';
let competitions   = [];
let modPage        = 0;
let userPage       = 0;
const PAGE_SIZE    = 25;
let confirmCallback = null;

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const cfg = window.GRANDSTAND_CONFIG;
  if (!cfg?.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR_')) {
    showGuard('Supabase is not configured. Update config.js before using the admin panel.');
    return;
  }

  sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // Check auth
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showGuard(); return; }

  // Check admin flag
  const { data: profile } = await sb.from('profiles')
    .select('username, is_admin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_admin) {
    showGuard('Your account does not have admin access.');
    return;
  }

  // Show admin UI
  $('#adminAuthGuard').hidden = true;
  $('#adminMain').hidden = false;
  $('#adminUserName').textContent = profile.username || session.user.email;

  bindTabs();
  bindCompetitionModal();
  bindConfirmModal();
  loadCompetitions();
});

/* ══════════════════════════════════════
   AUTH GUARD
══════════════════════════════════════ */
function showGuard(msg) {
  $('#adminAuthGuard').hidden = false;
  $('#adminMain').hidden = true;
  if (msg) {
    const p = document.createElement('p');
    p.textContent = msg;
    p.style.cssText = 'color:var(--text-secondary);font-size:.85rem;margin-top:.5rem';
    $('.auth-guard-card').appendChild(p);
  }

  $('#guardSignInBtn')?.addEventListener('click', () => {
    const cfg = window.GRANDSTAND_CONFIG;
    if (!sb) sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
  });
}

/* ══════════════════════════════════════
   TABS
══════════════════════════════════════ */
function bindTabs() {
  $$('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === currentTab) return;

      $$('.admin-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');

      $$('.admin-section').forEach(s => s.classList.add('hidden'));
      $(`#tab-${tab}`)?.classList.remove('hidden');

      currentTab = tab;

      // Lazy-load tab data
      if (tab === 'users')      loadUsers();
      if (tab === 'moderation') loadModeration();
      if (tab === 'analytics')  loadAnalytics();
    });
  });
}

/* ══════════════════════════════════════
   COMPETITIONS
══════════════════════════════════════ */
async function loadCompetitions() {
  const tbody = $('#competitionsTbody');
  tbody.innerHTML = '<tr class="table-loading"><td colspan="8">Loading…</td></tr>';

  const { data, error } = await sb.from('competitions')
    .select('*')
    .order('label', { ascending: true });

  if (error) { tbody.innerHTML = `<tr class="table-loading"><td colspan="8">Error: ${error.message}</td></tr>`; return; }
  competitions = data || [];
  renderCompetitions();
}

function renderCompetitions() {
  const tbody      = $('#competitionsTbody');
  const search     = ($('#compSearch').value || '').toLowerCase();
  const showInact  = $('#showInactiveComps').checked;

  const filtered = competitions.filter(c => {
    const matchSearch = !search || c.label.toLowerCase().includes(search) || c.sport_slug?.toLowerCase().includes(search);
    const matchActive = showInact || c.is_active;
    return matchSearch && matchActive;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="table-loading"><td colspan="8">No competitions found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr data-id="${c.id}">
      <td><strong>${escHtml(c.label)}</strong></td>
      <td><code>${escHtml(c.sport_slug || '—')}</code></td>
      <td><code>${escHtml(c.league_slug || '—')}</code></td>
      <td>
        <span class="color-swatch" style="background:${escHtml(c.color || '#6366f1')}"></span>
        <code>${escHtml(c.color || '—')}</code>
      </td>
      <td>${c.finals_qualifying || 0}${c.finals_qualifying_label ? ` <small>(${escHtml(c.finals_qualifying_label)})</small>` : ''}</td>
      <td>${c.finals_protected || 0}${c.finals_protected_label ? ` <small>(${escHtml(c.finals_protected_label)})</small>` : ''}</td>
      <td><span class="admin-badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Edit" onclick="editCompetition('${c.id}')">✏️</button>
          <button class="btn-icon" title="Toggle active" onclick="toggleCompActive('${c.id}', ${c.is_active})">${c.is_active ? '⏸' : '▶'}</button>
          <button class="btn-icon danger" title="Delete" onclick="deleteCompetition('${c.id}', '${escHtml(c.label)}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

$('#compSearch')?.addEventListener('input', renderCompetitions);
$('#showInactiveComps')?.addEventListener('change', renderCompetitions);

/* ── Competition Modal ── */
function bindCompetitionModal() {
  $('#addCompBtn')?.addEventListener('click', () => openCompModal());
  $('#closeCompModal')?.addEventListener('click', closeCompModal);
  $('#cancelCompBtn')?.addEventListener('click', closeCompModal);
  $('#saveCompBtn')?.addEventListener('click', saveCompetition);

  // Close on backdrop click
  $('#competitionModal')?.addEventListener('click', e => {
    if (e.target === $('#competitionModal')) closeCompModal();
  });

  // Sync color picker ↔ text
  $('#compColorPicker')?.addEventListener('input', e => {
    $('#compColor').value = e.target.value;
    updateApiPreview();
  });
  $('#compColor')?.addEventListener('input', e => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) $('#compColorPicker').value = v;
    updateApiPreview();
  });

  // API preview live update
  ['#compSportSlug','#compLeagueSlug'].forEach(sel => {
    $(sel)?.addEventListener('input', updateApiPreview);
  });

  $('#testApiBtn')?.addEventListener('click', testApi);
}

function openCompModal(comp = null) {
  $('#compId').value          = comp?.id || '';
  $('#compLabel').value        = comp?.label || '';
  $('#compColor').value        = comp?.color || '#6366f1';
  $('#compColorPicker').value  = comp?.color || '#6366f1';
  $('#compSportSlug').value    = comp?.sport_slug || '';
  $('#compLeagueSlug').value   = comp?.league_slug || '';
  $('#compFinalsQual').value   = comp?.finals_qualifying || 0;
  $('#compFinalsProtected').value = comp?.finals_protected || 0;
  $('#compFinalsQualLabel').value = comp?.finals_qualifying_label || '';
  $('#compFinalsProtectedLabel').value = comp?.finals_protected_label || '';
  $('#compIsActive').checked   = comp?.is_active ?? true;
  $('#compModalTitle').textContent = comp ? 'Edit Competition' : 'Add Competition';
  $('#compFormError').classList.add('hidden');
  $('#apiTestResult').classList.add('hidden');

  updateApiPreview();
  $('#competitionModal').hidden = false;
  $('#compLabel').focus();
}

function closeCompModal() {
  $('#competitionModal').hidden = true;
}

window.editCompetition = function(id) {
  const comp = competitions.find(c => c.id === id);
  if (comp) openCompModal(comp);
};

window.toggleCompActive = async function(id, currentlyActive) {
  const { error } = await sb.from('competitions')
    .update({ is_active: !currentlyActive })
    .eq('id', id);
  if (error) { toast('Failed to update: ' + error.message, 'error'); return; }
  await loadCompetitions();
  toast(`Competition ${currentlyActive ? 'deactivated' : 'activated'}`);
};

window.deleteCompetition = function(id, label) {
  openConfirm(
    `Delete "${label}"?`,
    'This competition will be permanently removed. Existing chat messages referencing it will remain.',
    async () => {
      const { error } = await sb.from('competitions').delete().eq('id', id);
      if (error) { toast('Delete failed: ' + error.message, 'error'); return; }
      await loadCompetitions();
      toast('Competition deleted');
    }
  );
};

async function saveCompetition() {
  const id    = $('#compId').value.trim();
  const label = $('#compLabel').value.trim();
  const sport = $('#compSportSlug').value.trim();
  const league= $('#compLeagueSlug').value.trim();

  if (!label || !sport || !league) {
    showFormError('Label, Sport Slug, and League Slug are required.');
    return;
  }

  const payload = {
    label,
    sport_slug:              sport,
    league_slug:             league,
    color:                   $('#compColor').value.trim() || '#6366f1',
    finals_qualifying:       parseInt($('#compFinalsQual').value) || 0,
    finals_protected:        parseInt($('#compFinalsProtected').value) || 0,
    finals_qualifying_label: $('#compFinalsQualLabel').value.trim() || null,
    finals_protected_label:  $('#compFinalsProtectedLabel').value.trim() || null,
    is_active:               $('#compIsActive').checked,
  };

  let error;
  if (id) {
    ({ error } = await sb.from('competitions').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('competitions').insert(payload));
  }

  if (error) { showFormError(error.message); return; }

  closeCompModal();
  await loadCompetitions();
  toast(id ? 'Competition updated' : 'Competition added', 'success');
}

function updateApiPreview() {
  const sport  = $('#compSportSlug')?.value.trim();
  const league = $('#compLeagueSlug')?.value.trim();
  const url    = sport && league
    ? `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`
    : '—';
  const el = $('#apiPreviewUrl');
  if (el) el.textContent = url;
}

async function testApi() {
  const sport  = $('#compSportSlug')?.value.trim();
  const league = $('#compLeagueSlug')?.value.trim();
  if (!sport || !league) { showApiTestResult('Enter sport and league slugs first.', false); return; }

  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
  $('#testApiBtn').textContent = '…';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const games = data.events?.length ?? 0;
    showApiTestResult(`✓ API OK — ${games} event(s) found`, true);
  } catch (e) {
    showApiTestResult(`✗ ${e.message}`, false);
  } finally {
    $('#testApiBtn').textContent = 'Test API';
  }
}

function showApiTestResult(msg, success) {
  const el = $('#apiTestResult');
  el.textContent = msg;
  el.className = `api-test-result ${success ? 'success' : 'error'}`;
  el.classList.remove('hidden');
}

function showFormError(msg) {
  const el = $('#compFormError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

/* ══════════════════════════════════════
   USERS
══════════════════════════════════════ */
async function loadUsers() {
  const tbody = $('#usersTbody');
  tbody.innerHTML = '<tr class="table-loading"><td colspan="6">Loading…</td></tr>';

  const search    = ($('#userSearch').value || '').toLowerCase();
  const roleFilter= $('#userRoleFilter').value;
  const from      = userPage * PAGE_SIZE;

  let query = sb.from('profiles').select('*', { count: 'exact' }).range(from, from + PAGE_SIZE - 1).order('updated_at', { ascending: false });
  if (roleFilter === 'admin') query = query.eq('is_admin', true);
  if (roleFilter === 'user')  query = query.eq('is_admin', false);
  if (search) query = query.ilike('username', `%${search}%`);

  const { data, error, count } = await query;
  if (error) { tbody.innerHTML = `<tr class="table-loading"><td colspan="6">Error: ${error.message}</td></tr>`; return; }

  $('#userCount').textContent = `${count ?? 0} user${count !== 1 ? 's' : ''}`;

  if (!data?.length) {
    tbody.innerHTML = '<tr class="table-loading"><td colspan="6">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(u => `
    <tr>
      <td>
        <strong>${escHtml(u.username || '—')}</strong>
        ${u.is_admin ? '<span class="badge-admin">ADMIN</span>' : ''}
      </td>
      <td>${escHtml(u.id.slice(0,8))}…</td>
      <td>${u.updated_at ? relativeTime(u.updated_at) : '—'}</td>
      <td>${formatPreferredComps(u.preferred_competitions)}</td>
      <td>
        <label class="toggle-label">
          <input type="checkbox" ${u.is_admin ? 'checked' : ''} onchange="toggleAdmin('${u.id}', this.checked)" />
        </label>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon danger" title="Delete user" onclick="deleteUser('${u.id}', '${escHtml(u.username || u.id)}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination('#userPagination', count, userPage, PAGE_SIZE, n => { userPage = n; loadUsers(); });
}

$('#userSearch')?.addEventListener('input', debounce(() => { userPage = 0; loadUsers(); }, 300));
$('#userRoleFilter')?.addEventListener('change', () => { userPage = 0; loadUsers(); });

window.toggleAdmin = async function(userId, makeAdmin) {
  const { error } = await sb.from('profiles').update({ is_admin: makeAdmin }).eq('id', userId);
  if (error) { toast('Failed: ' + error.message, 'error'); await loadUsers(); }
  else toast(`Admin ${makeAdmin ? 'granted' : 'revoked'}`);
};

window.deleteUser = function(userId, username) {
  openConfirm(
    `Delete user "${username}"?`,
    'This will permanently delete their profile and preferences. Their chat messages will remain but show as anonymous.',
    async () => {
      const { error } = await sb.from('profiles').delete().eq('id', userId);
      if (error) { toast('Delete failed: ' + error.message, 'error'); return; }
      await loadUsers();
      toast('User deleted');
    }
  );
};

function formatPreferredComps(prefs) {
  if (!prefs || !Array.isArray(prefs) || !prefs.length) return '<span style="color:var(--text-secondary)">—</span>';
  const shown = prefs.slice(0, 3).map(p => `<code>${escHtml(String(p))}</code>`).join(', ');
  return shown + (prefs.length > 3 ? ` +${prefs.length - 3}` : '');
}

/* ══════════════════════════════════════
   MODERATION
══════════════════════════════════════ */
async function loadModeration() {
  const tbody = $('#moderationTbody');
  tbody.innerHTML = '<tr class="table-loading"><td colspan="6">Loading…</td></tr>';

  const status = $('#modStatusFilter').value;
  const from   = modPage * PAGE_SIZE;

  let query = sb.from('chat_messages')
    .select(`
      id, game_id, message, is_deleted, created_at,
      profiles!chat_messages_user_id_fkey(username)
    `, { count: 'exact' })
    .range(from, from + PAGE_SIZE - 1)
    .order('created_at', { ascending: false });

  if (status === 'active')  query = query.eq('is_deleted', false);
  if (status === 'deleted') query = query.eq('is_deleted', true);

  const { data, error, count } = await query;
  if (error) { tbody.innerHTML = `<tr class="table-loading"><td colspan="6">Error: ${error.message}</td></tr>`; return; }

  if (!data?.length) {
    tbody.innerHTML = '<tr class="table-loading"><td colspan="6">No messages found.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(m => {
    const username = m.profiles?.username || 'unknown';
    const time = new Date(m.created_at).toLocaleString('en-NZ', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <tr ${m.is_deleted ? 'style="opacity:.55"' : ''}>
        <td style="white-space:nowrap;font-size:.8rem">${time}</td>
        <td><code style="font-size:.75rem">${escHtml(m.game_id || '—')}</code></td>
        <td>${escHtml(username)}</td>
        <td><span class="message-preview" title="${escHtml(m.message)}">${escHtml(m.message)}</span></td>
        <td><span class="admin-badge ${m.is_deleted ? 'badge-deleted' : 'badge-active'}">${m.is_deleted ? 'Deleted' : 'Active'}</span></td>
        <td>
          <div class="action-btns">
            ${!m.is_deleted
              ? `<button class="btn-icon danger" onclick="moderateDelete('${m.id}')">🗑 Delete</button>`
              : `<button class="btn-icon" onclick="moderateRestore('${m.id}')">↩ Restore</button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination('#modPagination', count, modPage, PAGE_SIZE, n => { modPage = n; loadModeration(); });
}

$('#modStatusFilter')?.addEventListener('change', () => { modPage = 0; loadModeration(); });
$('#refreshModBtn')?.addEventListener('click', () => loadModeration());

window.moderateDelete = async function(msgId) {
  const { error } = await sb.from('chat_messages').update({ is_deleted: true }).eq('id', msgId);
  if (error) { toast('Failed: ' + error.message, 'error'); return; }
  toast('Message deleted');
  loadModeration();
};

window.moderateRestore = async function(msgId) {
  const { error } = await sb.from('chat_messages').update({ is_deleted: false }).eq('id', msgId);
  if (error) { toast('Failed: ' + error.message, 'error'); return; }
  toast('Message restored');
  loadModeration();
};

/* ══════════════════════════════════════
   ANALYTICS
══════════════════════════════════════ */
async function loadAnalytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel fetches
  const [
    { count: totalUsers },
    { count: totalMessages },
    { count: activeComps },
    { count: deletedMessages },
    { data: recentUsers },
    { data: topGames },
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', since),
    sb.from('competitions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('chat_messages').select('*', { count: 'exact', head: true }).eq('is_deleted', true).gte('created_at', since),
    sb.from('profiles').select('username, updated_at').order('updated_at', { ascending: false }).limit(8),
    sb.from('chat_messages').select('game_id').eq('is_deleted', false).gte('created_at', since).limit(500),
  ]);

  // Stats
  $('#statTotalUsers').textContent     = totalUsers ?? '—';
  $('#statTotalMessages').textContent  = totalMessages ?? '—';
  $('#statActiveComps').textContent    = activeComps ?? '—';
  $('#statDeletedMessages').textContent= deletedMessages ?? '—';

  // Top games chart
  const gameCount = {};
  (topGames || []).forEach(m => {
    if (m.game_id) gameCount[m.game_id] = (gameCount[m.game_id] || 0) + 1;
  });
  const sorted = Object.entries(gameCount).sort((a,b) => b[1]-a[1]).slice(0,10);
  const maxVal = sorted[0]?.[1] || 1;
  const topGamesEl = $('#topGamesChart');
  if (!sorted.length) {
    topGamesEl.innerHTML = '<p class="admin-empty">No chat activity in the last 30 days.</p>';
  } else {
    topGamesEl.innerHTML = sorted.map(([gameId, count]) => `
      <div class="top-game-row">
        <span style="font-size:.8rem;color:var(--text-secondary);min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(gameId)}">${escHtml(gameId)}</span>
        <div class="top-game-bar-wrap">
          <div class="top-game-bar" style="width:${Math.round(count/maxVal*100)}%"></div>
        </div>
        <span class="top-game-count">${count}</span>
      </div>
    `).join('');
  }

  // Recent signups
  const signupsEl = $('#recentSignups');
  if (!recentUsers?.length) {
    signupsEl.innerHTML = '<p class="admin-empty">No users yet.</p>';
  } else {
    signupsEl.innerHTML = recentUsers.map(u => {
      const initials = (u.username || '?').slice(0,2).toUpperCase();
      return `
        <div class="signup-row">
          <div class="signup-avatar">${initials}</div>
          <span class="signup-name">${escHtml(u.username || 'Unknown')}</span>
          <span class="signup-date">${relativeTime(u.updated_at)}</span>
        </div>
      `;
    }).join('');
  }
}

/* ══════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════ */
function bindConfirmModal() {
  $('#closeConfirmModal')?.addEventListener('click', closeConfirm);
  $('#cancelConfirmBtn')?.addEventListener('click', closeConfirm);
  $('#confirmActionBtn')?.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });
  $('#confirmModal')?.addEventListener('click', e => {
    if (e.target === $('#confirmModal')) closeConfirm();
  });
}

function openConfirm(title, message, callback) {
  $('#confirmTitle').textContent   = title;
  $('#confirmMessage').textContent = message;
  confirmCallback = callback;
  $('#confirmModal').hidden = false;
}

function closeConfirm() {
  $('#confirmModal').hidden = true;
  confirmCallback = null;
}

/* ══════════════════════════════════════
   PAGINATION
══════════════════════════════════════ */
function renderPagination(containerSel, total, page, pageSize, onPage) {
  const el    = $(containerSel);
  if (!el) return;
  const pages = Math.ceil((total || 0) / pageSize);
  if (pages <= 1) { el.innerHTML = ''; return; }

  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, total);

  el.innerHTML = `
    <span>${from}–${to} of ${total}</span>
    <button class="btn btn-sm btn-ghost" ${page === 0 ? 'disabled' : ''} onclick="(${onPage.toString()})(${page - 1})">‹ Prev</button>
    <button class="btn btn-sm btn-ghost" ${page >= pages - 1 ? 'disabled' : ''} onclick="(${onPage.toString()})(${page + 1})">Next ›</button>
  `;
}

/* ══════════════════════════════════════
   UTILITIES
══════════════════════════════════════ */
function toast(msg, type = '') {
  const el = $('#adminToast');
  el.textContent = msg;
  el.className   = `admin-toast${type ? ' toast-' + type : ''} show`;
  setTimeout(() => el.classList.remove('show'), 2800);
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-NZ', { dateStyle: 'medium' });
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
