// licenses.js

let currentPage    = 1;
let totalPages     = 1;
let detailLicenseId = null;

debounceSearch = debounce(() => { currentPage = 1; loadLicenses(); }, 400);

document.addEventListener('DOMContentLoaded', loadLicenses);

async function loadLicenses() {
  const search = document.getElementById('search').value.trim();
  const status = document.getElementById('filter-status').value;

  let url = `/api/admin/licenses?page=${currentPage}&limit=20`;
  if (status) url += `&status=${status}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const tbody = document.getElementById('licenses-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Carregando...</td></tr>`;

  const data = await apiFetch(url);
  if (!data || !data.success) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--danger)">Erro ao carregar licenças</td></tr>`;
    return;
  }

  const { data: licenses, pagination } = data;
  totalPages = pagination.pages;

  // Paginacao
  const pagEl = document.getElementById('pagination');
  const info  = document.getElementById('pagination-info');
  if (pagination.total > 0) {
    pagEl.style.display = 'flex';
    info.textContent = `${(currentPage-1)*pagination.limit + 1}–${Math.min(currentPage*pagination.limit, pagination.total)} de ${pagination.total}`;
    document.getElementById('btn-prev').disabled = currentPage <= 1;
    document.getElementById('btn-next').disabled = currentPage >= totalPages;
  } else {
    pagEl.style.display = 'none';
  }

  if (licenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Nenhuma licença encontrada</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = licenses.map(l => `
    <tr>
      <td>
        <strong>${escHtml(l.customer_name)}</strong><br>
        <span style="font-size:0.75rem;color:var(--text-muted)">${escHtml(l.customer_email)}</span>
      </td>
      <td><span class="license-key">${escHtml(l.license_key)}</span></td>
      <td><span class="badge badge-${l.status}">${statusLabel(l.status)}</span></td>
      <td style="font-size:0.75rem;color:var(--text-muted)">${l.hardware_id ? l.hardware_id.substring(0,12)+'...' : '—'}</td>
      <td style="font-size:0.8rem">${formatDateOnly(l.activated_at)}</td>
      <td style="font-size:0.8rem;color:${isExpiringSoon(l.expires_at) ? 'var(--warning)' : 'inherit'}">
        ${formatDateOnly(l.expires_at)}
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openDetail('${l.id}')">Ver</button>
          ${l.status !== 'REVOKED' && l.status !== 'EXPIRED'
            ? `<button class="btn btn-danger btn-sm" onclick="confirmRevoke('${l.id}','${escHtml(l.customer_name)}')">Revogar</button>`
            : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function changePage(dir) {
  const next = currentPage + dir;
  if (next < 1 || next > totalPages) return;
  currentPage = next;
  loadLicenses();
}

async function openDetail(id) {
  detailLicenseId = id;
  document.getElementById('detail-modal').style.display = 'flex';
  document.getElementById('detail-body').innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner"></span></div>';

  const data = await apiFetch(`/api/admin/licenses/${id}`);
  if (!data || !data.success) {
    document.getElementById('detail-body').innerHTML = '<p style="color:var(--danger)">Erro ao carregar detalhes</p>';
    return;
  }

  const l = data.data;
  const revokeBtn = document.getElementById('btn-revoke-detail');
  revokeBtn.style.display = (l.status === 'REVOKED' || l.status === 'EXPIRED') ? 'none' : '';

  document.getElementById('detail-body').innerHTML = `
    <div style="display:grid;gap:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px">Cliente</div>
          <div style="font-weight:600">${escHtml(l.customer_name)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${escHtml(l.customer_email)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px">Status</div>
          <span class="badge badge-${l.status}">${statusLabel(l.status)}</span>
        </div>
      </div>

      <div>
        <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px">Chave de Licença</div>
        <div class="license-key" style="font-size:1rem">${escHtml(l.license_key)}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px">Ativado em</div>
          <div style="font-size:0.85rem">${formatDate(l.activated_at)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px">Expira em</div>
          <div style="font-size:0.85rem;color:${isExpiringSoon(l.expires_at)?'var(--warning)':'inherit'}">${formatDate(l.expires_at)}</div>
        </div>
      </div>

      ${l.hardware_id ? `
      <div>
        <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:4px">Hardware ID</div>
        <div style="font-family:monospace;font-size:0.75rem;color:var(--text-secondary);word-break:break-all">${escHtml(l.hardware_id)}</div>
      </div>` : ''}

      <div>
        <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);margin-bottom:8px">Últimas Validações</div>
        ${l.logs && l.logs.length > 0
          ? l.logs.slice(0,5).map(log => `
            <div class="log-item">
              <span class="log-time">${formatDate(log.created_at)}</span>
              <span class="log-action" style="color:${logColor(log.action)}">${log.action}</span>
              ${log.reason ? `<span style="color:var(--text-muted);font-size:0.75rem">${escHtml(log.reason)}</span>` : ''}
            </div>`).join('')
          : '<p style="color:var(--text-muted);font-size:0.8rem">Nenhum log ainda</p>'
        }
      </div>
    </div>
  `;
}

function closeDetailModal() {
  document.getElementById('detail-modal').style.display = 'none';
  detailLicenseId = null;
}

async function revokeFromDetail() {
  if (!detailLicenseId) return;
  if (!confirm('Confirma a revogação desta licença? O cliente perderá acesso imediatamente.')) return;
  await doRevoke(detailLicenseId);
  closeDetailModal();
}

async function confirmRevoke(id, name) {
  if (!confirm(`Revogar licença de "${name}"?\nO cliente perderá acesso imediatamente.`)) return;
  await doRevoke(id);
}

async function doRevoke(id) {
  const data = await apiFetch(`/api/admin/licenses/${id}/revoke`, { method: 'PATCH' });
  if (data && data.success) {
    showToast('Licença revogada com sucesso', 'success');
    loadLicenses();
  } else {
    showToast('Erro ao revogar licença', 'error');
  }
}

function openNewModal() { document.getElementById('new-modal').style.display = 'flex'; }
function closeNewModal() {
  document.getElementById('new-modal').style.display = 'none';
  document.getElementById('new-name').value  = '';
  document.getElementById('new-email').value = '';
}

async function createManualLicense() {
  const name  = document.getElementById('new-name').value.trim();
  const email = document.getElementById('new-email').value.trim();
  const btn   = document.getElementById('btn-create');

  if (!name || !email) { showToast('Nome e email são obrigatórios', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Criando...';

  const data = await apiFetch('/api/admin/licenses/manual', {
    method: 'POST',
    body:   JSON.stringify({ name, email }),
  });

  if (data && data.success) {
    showToast(`Licença criada e email enviado para ${email}`, 'success');
    closeNewModal();
    loadLicenses();
  } else {
    showToast(data?.error || 'Erro ao criar licença', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = 'Criar e Enviar Email';
}

// Helpers
function statusLabel(s) {
  return { ACTIVE:'Ativa', PENDING:'Aguardando', EXPIRED:'Expirada', REVOKED:'Revogada' }[s] || s;
}

function logColor(action) {
  return { ACTIVATE:'var(--green-400)', VALIDATE:'var(--text-secondary)', REJECT:'var(--danger)', REVOKE:'var(--danger)', EXPIRE:'var(--warning)' }[action] || 'var(--text-muted)';
}

function isExpiringSoon(iso) {
  if (!iso) return false;
  const days = (new Date(iso) - new Date()) / (1000 * 60 * 60 * 24);
  return days > 0 && days < 30;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
