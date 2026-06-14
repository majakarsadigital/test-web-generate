/* async function generateToken() {

  const username =
    document.getElementById(
      "username"
    ).value;

  const response =
    await fetch(
      "/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          username
        })
      }
    );

  const data =
    await response.json();

  document.getElementById(
    "result"
  ).textContent =
    JSON.stringify(
      data,
      null,
      2
    );
} */

// ─────────────────────────────────────────────
//  TOKEN DASHBOARD — app.js
//  POST /api/generate  → create & store token
//  GET  /api/tokens    → list all from Redis
//  DELETE /api/tokens/:username → revoke token
// ─────────────────────────────────────────────

/** In-memory cache of the last fetched tokens */
let _allTokens = [];

// ──────────────────────────────────────────────
//  GENERATE TOKEN  (POST /api/generate)
// ──────────────────────────────────────────────
async function generateToken() {
  const username = document.getElementById('username').value.trim();
  const role     = document.getElementById('role').value;
  const expires  = parseInt(document.getElementById('expires').value, 10) || 30;
  const note     = document.getElementById('note').value.trim();

  if (!username) {
    showToast('⚠ Username wajib diisi');
    document.getElementById('username').focus();
    return;
  }

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role, expires, note }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Show result block
    document.getElementById('token-text').textContent    = data.token;
    document.getElementById('token-expires').textContent = formatDate(data.expiresAt);
    document.getElementById('token-role').textContent    = data.role || role;
    document.getElementById('result-block').classList.add('show');

    showToast('✅ Token berhasil dibuat!');

    // Refresh table agar token baru muncul
    await loadTokens();

  } catch (err) {
    showToast(`❌ ${err.message}`);
    console.error('[generateToken]', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Generate Token';
  }
}

// ──────────────────────────────────────────────
//  LOAD ALL TOKENS  (GET /api/tokens)
// ──────────────────────────────────────────────
async function loadTokens() {
  const tbody = document.getElementById('tokens-body');
  tbody.innerHTML = `<tr><td colspan="6">
    <div class="empty-state">
      <span class="empty-icon"><span class="spinner" style="width:24px;height:24px;border-width:3px;"></span></span>
      <p>Memuat data dari Redis…</p>
    </div>
  </td></tr>`;

  try {
    const response = await fetch('/api/tokens', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    // Support both { tokens: [...] } and plain array
    _allTokens = Array.isArray(data) ? data : (data.tokens || []);

    renderTable(_allTokens);
    updateStats(_allTokens);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <p>Gagal memuat data: ${escHtml(err.message)}</p>
      </div>
    </td></tr>`;
    showToast(`❌ Gagal load: ${err.message}`);
    console.error('[loadTokens]', err);
  }
}

// ──────────────────────────────────────────────
//  REVOKE / DELETE TOKEN  (DELETE /api/tokens/:username)
// ──────────────────────────────────────────────
async function revokeToken(username) {
  if (!confirm(`Hapus token untuk "${username}"?`)) return;

  try {
    const response = await fetch(`/api/tokens/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${response.status}`);
    }

    showToast(`🗑 Token "${username}" dihapus`);
    await loadTokens();

  } catch (err) {
    showToast(`❌ ${err.message}`);
    console.error('[revokeToken]', err);
  }
}

// ──────────────────────────────────────────────
//  RENDER TABLE
// ──────────────────────────────────────────────
function renderTable(tokens) {
  const tbody = document.getElementById('tokens-body');

  if (!tokens.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>Belum ada token tersimpan</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = tokens.map(t => {
    const active  = isActive(t.expiresAt);
    const status  = active ? 'active' : 'expired';
    const roleCls = t.role === 'admin' ? 'badge-admin' : 'badge-user';

    return `<tr>
      <td class="td-mono">${escHtml(t.username)}</td>
      <td class="td-token" title="${escHtml(t.token)}">${escHtml(truncate(t.token, 24))}</td>
      <td><span class="badge ${roleCls}">${escHtml(t.role || 'user')}</span></td>
      <td class="td-mono" style="font-size:0.75rem;">${formatDate(t.expiresAt)}</td>
      <td><span class="badge badge-${status}">${status}</span></td>
      <td>
        <button class="btn btn-danger" onclick="revokeToken('${escAttr(t.username)}')">
          Revoke
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ──────────────────────────────────────────────
//  FILTER TABLE (client-side)
// ──────────────────────────────────────────────
function filterTable() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const role   = document.getElementById('filter-role').value;
  const status = document.getElementById('filter-status').value;

  const filtered = _allTokens.filter(t => {
    const matchSearch = !search ||
      t.username.toLowerCase().includes(search) ||
      (t.token || '').toLowerCase().includes(search);

    const matchRole   = !role   || t.role === role;
    const matchStatus = !status || (isActive(t.expiresAt) ? 'active' : 'expired') === status;

    return matchSearch && matchRole && matchStatus;
  });

  renderTable(filtered);
}

// ──────────────────────────────────────────────
//  UPDATE STATS
// ──────────────────────────────────────────────
function updateStats(tokens) {
  const active  = tokens.filter(t => isActive(t.expiresAt)).length;
  const expired = tokens.length - active;

  document.getElementById('stat-total').textContent   = tokens.length;
  document.getElementById('stat-active').textContent  = active;
  document.getElementById('stat-expired').textContent = expired;
}

// ──────────────────────────────────────────────
//  COPY TOKEN
// ──────────────────────────────────────────────
function copyToken() {
  const text = document.getElementById('token-text').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('📋 Token disalin!'));
}

// ──────────────────────────────────────────────
//  TOAST NOTIFICATION
// ──────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), duration);
}

// ──────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────
function isActive(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(str, n) {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(s) {
  return String(s ?? '').replace(/'/g, "\\'");
}

const overlay  = document.getElementById('auth-overlay');
const dialog   = document.getElementById('login-dialog');
const content  = document.getElementById('main-content');
const errMsg   = document.getElementById('error-msg');
const input    = document.getElementById('token');
const btn      = document.getElementById('login-btn');

function closeDialog() {
  dialog.classList.add('closing');
  dialog.addEventListener('animationend', () => {
    overlay.classList.add('hidden');
    content.classList.add('unlocked');
  }, { once: true });
}

function setError(msg) {
  errMsg.textContent      = '⚠️ ' + msg;
  errMsg.style.display    = 'block';
  input.style.borderColor = '#E24B4A';
  input.style.boxShadow   = '3px 3px 0 #E24B4A';
}

function resetError() {
  errMsg.style.display    = 'none';
  input.style.borderColor = '#1a1a1a';
  input.style.boxShadow   = '3px 3px 0 #1a1a1a';
}

async function verifyToken() {
  const tokenVal = input.value.trim();

  if (!tokenVal) {
    setError('Token tidak boleh kosong!');
    return;
  }

  resetError();
  btn.textContent = '⏳ Memverifikasi...';
  btn.disabled    = true;

  try{
    const response =
      await fetch(
        "/api/verify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            token: tokenVal
          }),
        }
      );
    const data = await response.json();
    if (response.ok && data.success) {
      btn.textContent      = '✅ Berhasil! Membuka...';
      btn.style.background = '#0F6E56';
      btn.style.color      = '#E1F5EE';
      btn.style.boxShadow  = '4px 4px 0 #085041';

      setTimeout(() => closeDialog(), 800);
    } else {
      throw new Error(data.message || 'Token tidak valid');
    }
  } catch (err) {
    errMsg.textContent     = '⚠️ ' + err.message;
    errMsg.style.display   = 'block';
    btn.textContent        = '🚀 Login';
    btn.disabled           = false;
  }
}

input.addEventListener('keydown', e => {
    if (e.key === 'Enter') verifyToken();
});

btn.addEventListener('click', () => {
  verifyToken()
});