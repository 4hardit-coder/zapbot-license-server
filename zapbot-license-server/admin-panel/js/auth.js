// auth.js — gerencia token JWT do admin

function getToken() {
  return localStorage.getItem('admin_token');
}

function logout() {
  localStorage.removeItem('admin_token');
  window.location.href = 'index.html';
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }

  // Verificar expiracao do token (sem chamar servidor)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logout();
      return false;
    }
    const emailEl = document.getElementById('admin-email');
    if (emailEl) emailEl.textContent = payload.email || '';
  } catch {
    logout();
    return false;
  }

  return true;
}

// Executar guard em todas as paginas exceto login
if (!window.location.pathname.includes('index.html') &&
    window.location.pathname !== '/' &&
    window.location.pathname !== '/admin/' &&
    window.location.pathname !== '/admin') {
  requireAuth();
}
