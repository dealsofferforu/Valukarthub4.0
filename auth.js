(() => {
  const config = window.ValueKartConfig;
  const TOKEN_KEY = 'valuekart_admin_token_v3';
  const USER_KEY = 'valuekart_admin_user_v3';

  function token() { return sessionStorage.getItem(TOKEN_KEY) || ''; }
  function username() { return sessionStorage.getItem(USER_KEY) || 'valuekart_admin'; }
  function sanitizeNext(value) { return value === 'admin.html' ? value : 'admin.html'; }
  function loginUrl(next = 'admin.html') { return `admin-login.html?${new URLSearchParams({ next })}`; }
  function validatePassword(password) {
    const issues = [];
    if (String(password || '').length < 10) issues.push('Use at least 10 characters.');
    if (!/[a-z]/.test(password)) issues.push('Add a lowercase letter.');
    if (!/[A-Z]/.test(password)) issues.push('Add an uppercase letter.');
    if (!/\d/.test(password)) issues.push('Add a number.');
    return issues;
  }

  async function api(action, body = {}, requireAuth = true) {
    const headers = { 'Content-Type': 'application/json', apikey: config.supabasePublishableKey };
    if (requireAuth && token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(config.adminFunctionUrl, {
      method: 'POST', headers, body: JSON.stringify({ action, ...body })
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) {
      if (response.status === 401 && requireAuth) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      }
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  async function login(user, password) {
    try {
      const data = await api('login', { username: String(user || '').trim(), password: String(password || '') }, false);
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, data.username || String(user || '').trim());
      return { ok: true, username: data.username };
    } catch (error) {
      return { ok: false, reason: 'invalid', message: error.message };
    }
  }

  function guard() {
    if (!token()) {
      location.replace(loginUrl('admin.html'));
      return false;
    }
    return true;
  }

  async function verifySession() {
    if (!token()) return false;
    try {
      const data = await api('session');
      if (data.username) sessionStorage.setItem(USER_KEY, data.username);
      return true;
    } catch {
      return false;
    }
  }

  async function logout() {
    try { if (token()) await api('logout'); } catch {}
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    location.replace(loginUrl('admin.html'));
  }

  async function changePassword(currentPassword, newPassword) {
    const data = await api('change_password', { currentPassword, newPassword });
    return data;
  }

  function bindAdminSession() {
    document.querySelectorAll('[data-admin-username]').forEach(node => { node.textContent = username(); });
    verifySession().then(ok => {
      if (!ok) location.replace(loginUrl('admin.html'));
      else document.querySelectorAll('[data-admin-username]').forEach(node => { node.textContent = username(); });
    });
  }

  window.ValueKartAuth = {
    TOKEN_KEY,
    sanitizeNext,
    validatePassword,
    guard,
    login,
    logout,
    changePassword,
    bindAdminSession,
    verifySession,
    api,
    getProfile: () => ({ username: username() }),
    getLockState: () => ({ remainingMs: 0 })
  };
})();
