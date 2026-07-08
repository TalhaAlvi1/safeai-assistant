// Login Logic - Handles SSO, Magic Code, and Registration
const API_URL = 'http://localhost:3000'; // Default backend URL

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const modeParam = params.get('mode');
    const isNewUser = params.get('isNewUser');

    // Initialize UI based on mode
    initUI(emailParam, modeParam, isNewUser);

    // Setup event listeners
    setupEventListeners();
});

function initUI(email, mode, isNewUser) {
    if (email) {
        document.getElementById('login-email').value = email;
        document.getElementById('register-email').value = email;
        document.getElementById('magic-email').value = email;
    }

    if (isNewUser === 'true') {
        showRegisterView();
    } else if (mode === 'MAGIC_CODE') {
        showMagicCodeView();
    } else if (mode === 'SSO') {
        showSSOView();
    } else {
        // Default login view (email/password)
        showLoginView();
    }
}

function showLoginView() {
    hideAllViews();
    document.getElementById('login-form').style.display = 'block';
}

function showRegisterView() {
    hideAllViews();
    document.getElementById('register-form').style.display = 'block';
}

function showMagicCodeView() {
    hideAllViews();
    document.getElementById('magic-code-view').style.display = 'block';

    // Auto-send magic code if email is present
    const email = document.getElementById('magic-email').value;
    if (email) {
        sendMagicCode();
    }
}

function showSSOView() {
    hideAllViews();
    document.getElementById('sso-view').style.display = 'block';
}

function hideAllViews() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('magic-code-view').style.display = 'none';
    document.getElementById('sso-view').style.display = 'none';
}

function setupEventListeners() {
    // Mode switching
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterView();
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginView();
    });

    // Login button
    document.getElementById('login-btn')?.addEventListener('click', loginWithPassword);

    // Register button
    document.getElementById('register-btn')?.addEventListener('click', registerFirm);

    // Magic code buttons
    document.getElementById('resend-code-btn')?.addEventListener('click', sendMagicCode);
    document.getElementById('verify-code-btn')?.addEventListener('click', verifyMagicCode);

    // SSO buttons
    document.getElementById('google-sso-btn')?.addEventListener('click', () => loginWithSSO('GOOGLE'));
    document.getElementById('microsoft-sso-btn')?.addEventListener('click', () => loginWithSSO('MICROSOFT'));
}

async function loginWithPassword() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        setLoading('login-btn', true);
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');

        handleAuthSuccess(data);
    } catch (e) {
        showError(e.message);
    } finally {
        setLoading('login-btn', false);
    }
}

async function registerFirm() {
    const firmName = document.getElementById('firm-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const region = document.getElementById('region').value;

    try {
        setLoading('register-btn', true);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firmName, email, password, region })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');

        showSuccess(window.i18n.t('registrationSuccess'));
        setTimeout(showLoginView, 2000);
    } catch (e) {
        showError(e.message);
    } finally {
        setLoading('register-btn', false);
    }
}

async function sendMagicCode() {
    const email = document.getElementById('magic-email').value;
    try {
        const response = await fetch(`${API_URL}/auth/magic-code/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        showSuccess(window.i18n.t('codeSentSuccess'));
    } catch (e) {
        showError(e.message);
    }
}

async function verifyMagicCode() {
    const email = document.getElementById('magic-email').value;
    const code = document.getElementById('magic-code').value;

    try {
        setLoading('verify-code-btn', true);
        const response = await fetch(`${API_URL}/auth/magic-code/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Verification failed');

        handleAuthSuccess(data);
    } catch (e) {
        showError(e.message);
    } finally {
        setLoading('verify-code-btn', false);
    }
}

function loginWithSSO(type) {
    // In a real app, redirect to backend SSO route
    // Here we'll just show an informative message since SSO requires infra
    showError(`${type} SSO integration requested. In production, this would redirect to ${type} auth.`);
}

function handleAuthSuccess(data) {
    // Store in storage.local for extension
    chrome.storage.local.set({
        authToken: data.token,
        userData: data.user
    }, () => {
        showSuccess(window.i18n.t('connectSuccessCloseTab'));
        // Optionally close tab automatically after a delay
        setTimeout(() => {
            window.close();
        }, 2000);
    });
}

function showError(msg) {
    const err = document.getElementById('error-message');
    err.textContent = msg;
    err.style.display = 'block';
    setTimeout(() => { err.style.display = 'none'; }, 5000);
}

function showSuccess(msg) {
    const succ = document.getElementById('success-message');
    succ.textContent = msg;
    succ.style.display = 'block';
    setTimeout(() => { succ.style.display = 'none'; }, 5000);
}

function setLoading(id, loading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = window.i18n.t('processingText');
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText;
    }
}
