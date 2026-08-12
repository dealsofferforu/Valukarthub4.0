(() => {
  const PROFILE_KEY = 'valuekart_admin_auth_v1';
  const ATTEMPT_KEY = 'valuekart_admin_attempts_v1';
  const SESSION_KEY = 'valuekart_admin_session_v1';
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
  const PBKDF2_ITERATIONS = 210000;
  const MAX_FAILURES = 5;
  const LOCK_MS = 60 * 1000;

  const textEncoder = new TextEncoder();

  function now() { return Date.now(); }
  function safeJson(raw, fallback = null) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }
  function getProfile() { return safeJson(localStorage.getItem(PROFILE_KEY)); }
  function getSession() { return safeJson(sessionStorage.getItem(SESSION_KEY)); }
  function hasProfile() { return Boolean(getProfile()?.hash && getProfile()?.salt); }
  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }
  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  function randomBytes(length = 16) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  function validatePassword(password) {
    const issues = [];
    if (password.length < 10) issues.push('Use at least 10 characters.');
    if (!/[a-z]/.test(password)) issues.push('Add a lowercase letter.');
    if (!/[A-Z]/.test(password)) issues.push('Add an uppercase letter.');
    if (!/\d/.test(password)) issues.push('Add a number.');
    return issues;
  }
  async function deriveHash(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
    if (!window.crypto?.subtle) throw new Error('Secure browser cryptography is unavailable. Serve the site over HTTPS or localhost.');
    const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
      key,
      256
    );
    return new Uint8Array(bits);
  }
  function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function clearAttempts() { localStorage.removeItem(ATTEMPT_KEY); }
  function getLockState() {
    const record = safeJson(localStorage.getItem(ATTEMPT_KEY), { count: 0, lockedUntil: 0 });
    if (record.lockedUntil && record.lockedUntil <= now()) {
      clearAttempts();
      return { count: 0, lockedUntil: 0, remainingMs: 0 };
    }
    return { ...record, remainingMs: Math.max(0, Number(record.lockedUntil || 0) - now()) };
  }
  function registerFailure() {
    const record = getLockState();
    const count = Number(record.count || 0) + 1;
    const next = count >= MAX_FAILURES ? { count: 0, lockedUntil: now() + LOCK_MS } : { count, lockedUntil: 0 };
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(next));
    return getLockState();
  }
  function createSession(username) {
    const timestamp = now();
    const session = {
      username,
      startedAt: timestamp,
      lastSeen: timestamp,
      token: bytesToBase64(randomBytes(24))
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }
  function sessionStatus() {
    const session = getSession();
    const profile = getProfile();
    if (!session || !profile || session.username !== profile.username) return { valid: false, reason: 'missing' };
    const timestamp = now();
    if (timestamp - Number(session.lastSeen || 0) > IDLE_TIMEOUT_MS) return { valid: false, reason: 'idle' };
    if (timestamp - Number(session.startedAt || 0) > MAX_SESSION_MS) return { valid: false, reason: 'max' };
    return { valid: true, session };
  }
  function touchSession() {
    const status = sessionStatus();
    if (!status.valid) return false;
    const session = { ...status.session, lastSeen: now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }
  function loginUrl(next = 'admin.html', setup = false) {
    const params = new URLSearchParams({ next });
    if (setup) params.set('setup', '1');
    return `admin-login.html?${params.toString()}`;
  }
  function sanitizeNext(value) {
    const allowed = new Set(['admin.html']);
    return allowed.has(value) ? value : 'admin.html';
  }
  function guard() {
    if (!hasProfile()) {
      location.replace(loginUrl('admin.html', true));
      return false;
    }
    const status = sessionStatus();
    if (!status.valid) {
      sessionStorage.removeItem(SESSION_KEY);
      location.replace(loginUrl('admin.html', false));
      return false;
    }
    touchSession();
    return true;
  }
  async function setup(username, password) {
    const cleanUsername = String(username || '').trim();
    if (hasProfile()) throw new Error('An admin account is already configured in this browser.');
    if (cleanUsername.length < 3 || cleanUsername.length > 60) throw new Error('Username must be between 3 and 60 characters.');
    const passwordIssues = validatePassword(String(password || ''));
    if (passwordIssues.length) throw new Error(passwordIssues[0]);
    const salt = randomBytes(16);
    const hash = await deriveHash(password, salt, PBKDF2_ITERATIONS);
    const profile = {
      version: 1,
      username: cleanUsername,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash),
      iterations: PBKDF2_ITERATIONS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    clearAttempts();
    createSession(cleanUsername);
    return profile;
  }
  async function verifyCredentials(username, password, { recordFailure = true } = {}) {
    const profile = getProfile();
    if (!profile) return { ok: false, reason: 'not-configured' };
    const lock = getLockState();
    if (lock.remainingMs > 0) return { ok: false, reason: 'locked', remainingMs: lock.remainingMs };
    const usernameMatches = String(username || '').trim().toLowerCase() === String(profile.username || '').toLowerCase();
    let derived;
    try {
      derived = await deriveHash(String(password || ''), base64ToBytes(profile.salt), Number(profile.iterations || PBKDF2_ITERATIONS));
    } catch (error) {
      return { ok: false, reason: 'crypto', message: error.message };
    }
    const passwordMatches = constantTimeEqual(derived, base64ToBytes(profile.hash));
    if (!usernameMatches || !passwordMatches) {
      const failure = recordFailure ? registerFailure() : getLockState();
      return { ok: false, reason: failure.remainingMs > 0 ? 'locked' : 'invalid', remainingMs: failure.remainingMs };
    }
    if (recordFailure) clearAttempts();
    return { ok: true, profile };
  }
  async function login(username, password) {
    const result = await verifyCredentials(username, password, { recordFailure: true });
    if (result.ok) createSession(result.profile.username);
    return result;
  }
  async function changePassword(currentPassword, newPassword) {
    const profile = getProfile();
    if (!profile) throw new Error('Admin account is not configured.');
    const current = await verifyCredentials(profile.username, currentPassword, { recordFailure: true });
    if (!current.ok) {
      if (current.reason === 'locked') throw new Error(`Too many failed attempts. Try again in ${Math.ceil(current.remainingMs / 1000)} seconds.`);
      throw new Error('Current password is incorrect.');
    }
    const issues = validatePassword(String(newPassword || ''));
    if (issues.length) throw new Error(issues[0]);
    const salt = randomBytes(16);
    const hash = await deriveHash(newPassword, salt, PBKDF2_ITERATIONS);
    const updated = {
      ...profile,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash),
      iterations: PBKDF2_ITERATIONS,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    clearAttempts();
    createSession(updated.username);
    return updated;
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.replace(loginUrl('admin.html', false));
  }
  function bindAdminSession() {
    const status = sessionStatus();
    if (!status.valid) return;
    const usernameNodes = document.querySelectorAll('[data-admin-username]');
    usernameNodes.forEach(node => { node.textContent = status.session.username; });
    let lastTouch = 0;
    const activity = () => {
      const timestamp = now();
      if (timestamp - lastTouch > 60 * 1000) {
        touchSession();
        lastTouch = timestamp;
      }
    };
    ['click', 'keydown', 'input', 'pointerdown'].forEach(eventName => document.addEventListener(eventName, activity, { passive: true }));
    setInterval(() => {
      const current = sessionStatus();
      if (!current.valid) logout();
    }, 60 * 1000);
  }

  window.ValueKartAuth = {
    PROFILE_KEY,
    hasProfile,
    getProfile,
    getLockState,
    validatePassword,
    sanitizeNext,
    guard,
    setup,
    login,
    logout,
    changePassword,
    sessionStatus,
    bindAdminSession,
    constants: { IDLE_TIMEOUT_MS, MAX_SESSION_MS, PBKDF2_ITERATIONS, MAX_FAILURES, LOCK_MS }
  };
})();
