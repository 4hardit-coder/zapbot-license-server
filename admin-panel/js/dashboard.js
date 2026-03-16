// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  loadStats();

  // URLs do servidor
  const base = window.location.origin;
  const el = (id) => document.getElementById(id);
  if (el('server-url'))   el('server-url').textContent   = base;
  if (el('webhook-url'))  el('webhook-url').textContent  = `${base}/api/webhook/hotmart`;
  if (el('activate-url')) el('activate-url').textContent = `${base}/api/license/activate`;
});

async function loadStats() {
  const data = await apiFetch('/api/admin/stats');
  if (!data || !data.success) { showToast('Erro ao carregar stats', 'error'); return; }

  const s = data.data;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('s-total',   s.total);
  set('s-active',  s.active);
  set('s-pending', s.pending);
  set('s-expired', s.expired);
  set('s-revoked', s.revoked);
  set('s-today',   s.activatedToday);

  const upd = document.getElementById('last-update');
  if (upd) upd.textContent = `Atualizado: ${new Date().toLocaleTimeString('pt-BR')}`;
}
