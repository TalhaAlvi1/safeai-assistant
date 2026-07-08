// Panel JavaScript - Enhanced with all features
// Dynamically determine the API URL based on the current host
const API_URL = window.location.protocol === 'https:' ? 'https://safeaibackend-production.up.railway.app' : 'http://localhost:3000';

let currentText = '';
let analysisResult = null;

// Initialize panel
async function initPanel() {
    console.log('Initializing SafeAI panel...');

    // Check authentication
    const authenticated = await checkAuth();
    if (!authenticated) {
        switchView('auth-view');
        setupAuthEventListeners();
        return;
    }

    switchView('main-view');

    // Get current text from active tab
    await getCurrentText();

    // Setup event listeners
    setupEventListeners();

    // Listen for storage changes (e.g. from login tab)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.authToken) {
            initPanel();
        }
    });
}

// Switch between views
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// Check if user is authenticated
async function checkAuth() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authToken', 'userData'], async (result) => {
            if (result.authToken) {
                // Verify token with backend
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${result.authToken}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        updateUserInfoUI(data);
                        resolve(true);
                        return;
                    }
                } catch (e) {
                    console.error('Auth check failed', e);
                }
            }
            resolve(false);
        });
    });
}

// Update user info in UI
function updateUserInfoUI(data) {
    const userInfoText = document.getElementById('user-info-text');
    if (userInfoText && data.user && data.tenant) {
        userInfoText.textContent = window.i18n.t('connectedAs', { email: data.user.email, tenant: data.tenant.name });
    }
}

// Setup auth event listeners
function setupAuthEventListeners() {
    document.getElementById('connect-btn')?.addEventListener('click', connectAccount);
    document.getElementById('user-info-text')?.addEventListener('click', handleLogout);
}

function handleLogout() {
    if (confirm(window.i18n.t('logoutConfirm'))) {
        chrome.storage.local.remove(['authToken', 'userData'], () => {
            initPanel();
        });
    }
}

// Handle connect button
async function connectAccount() {
    const email = document.getElementById('work-email').value;
    const errorDiv = document.getElementById('auth-error');

    if (!email || !email.includes('@')) {
        errorDiv.textContent = window.i18n.t('invalidEmail');
        errorDiv.style.display = 'block';
        return;
    }

    try {
        errorDiv.style.display = 'none';
        document.getElementById('connect-btn').disabled = true;

        // Check auth mode
        const response = await fetch(`${API_URL}/auth/mode?email=${encodeURIComponent(email)}`);
        const data = await response.json();

        // Open login page in a tab with all parameters
        const queryParams = new URLSearchParams({
            email,
            ...data
        }).toString();
        const loginUrl = chrome.runtime.getURL(`login.html?${queryParams}`);
        chrome.tabs.create({ url: loginUrl });

        errorDiv.textContent = window.i18n.t('completeLoginNewTab');
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#e3f2fd';
        errorDiv.style.color = '#1565c0';

    } catch (e) {
        errorDiv.textContent = window.i18n.t('failedToConnect');
        errorDiv.style.display = 'block';
    } finally {
        document.getElementById('connect-btn').disabled = false;
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Analyze button (updated to match the correct ID)
    document.getElementById('persona-analyze-btn')?.addEventListener('click', analyzeText);

    // Feature cards
    document.getElementById('open-wizard')?.addEventListener('click', () => {
        chrome.tabs.create({ url: `${API_URL}/wizard` });
    });

    document.getElementById('open-dashboard')?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });

    document.getElementById('open-settings')?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });

    document.getElementById('view-help')?.addEventListener('click', () => {
        chrome.tabs.create({ url: `${API_URL}/help.html` });
    });

    // Cancel button in results
    document.getElementById('cancel-result-btn')?.addEventListener('click', () => {
        document.getElementById('results').classList.remove('show');
    });
}

// Get current text from active tab
async function getCurrentText() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const activeElement = document.activeElement;
                if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
                    return activeElement.value;
                } else if (activeElement.getAttribute('contenteditable') === 'true') {
                    return activeElement.textContent;
                }
                // Also try to find ChatGPT textarea
                const chatInput = document.querySelector('textarea[placeholder*="Message"]') ||
                    document.querySelector('textarea');
                if (chatInput) {
                    return chatInput.value || chatInput.textContent;
                }
                return '';
            }
        });

        currentText = result[0].result || '';
        console.log('Current text length:', currentText.length);

    } catch (error) {
        console.error('Get current text error:', error);
    }
}

// Check backend health
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_URL}/auth/mode?email=health@check.com`);
        return response.ok;
    } catch (e) {
        return false;
    }
}

// Analyze text with fail-open logic
async function analyzeText() {
    try {
        // Refresh current text
        await getCurrentText();

        if (!currentText || currentText.trim() === '') {
            showError(window.i18n.t('noTextToAnalyze'));
            return;
        }

        // Check health
        const isHealthy = await checkBackendHealth();
        if (!isHealthy) {
            showError(window.i18n.t('checksUnavailable'), 'warning');

            // Fail-open: Provide limited offline results
            analysisResult = {
                decision: 'ALLOW',
                riskLevel: 'UNKNOWN',
                categories: ['OFFLINE'],
                explanation: window.i18n.t('backendDownFailOpen'),
                sanitizedText: currentText, // No anonymization possible offline
                isOffline: true
            };
            displayResults();
            return;
        }

        const personaId = document.getElementById('persona-select').value;

        // Show loading
        document.getElementById('loading').classList.add('show');
        document.getElementById('results').classList.remove('show');
        document.getElementById('persona-analyze-btn').disabled = true;

        // Call backend analyzer
        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: currentText,
                platform: 'chatgpt',
                personaId: personaId
            })
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const data = await response.json();

        // Format result
        analysisResult = {
            decision: data.riskLevel === 'HIGH' ? 'WARN' : 'ALLOW',
            riskLevel: data.riskLevel,
            categories: data.findings.map(f => f.type).filter((v, i, a) => a.indexOf(v) === i),
            explanation: window.i18n.t('foundFindings', { count: data.findings.length }),
            sanitizedText: data.anonymized,
            persona: data.persona || null,
            findings: data.findings
        };

        displayResults();

    } catch (error) {
        console.error('Analyze error:', error);
        showError(window.i18n.t('analysisFailed'));
    } finally {
        document.getElementById('loading').classList.remove('show');
        document.getElementById('persona-analyze-btn').disabled = false;
    }
}

// Display results
function displayResults() {
    const { decision, riskLevel, categories, explanation, sanitizedText, persona } = analysisResult;

    // Risk badge
    const riskBadge = document.getElementById('risk-badge');
    riskBadge.textContent = `${riskLevel} ${window.i18n.t('riskLevel').toUpperCase()}`;
    riskBadge.className = `risk-badge ${riskLevel.toLowerCase()}`;

    // Categories
    const categoriesDiv = document.getElementById('categories');
    categoriesDiv.textContent = `${window.i18n.t('categoriesLabel')}${categories.join(', ') || 'None'}`;

    // Explanation
    let explanationText = explanation;
    if (persona) {
        explanationText += window.i18n.t('analyzedWithPersona', { persona: persona.name });
    }
    document.getElementById('explanation').textContent = explanationText;

    // Action buttons
    const actionButtons = document.getElementById('action-buttons');
    if (decision === 'BLOCK') {
        actionButtons.innerHTML = `<button class="btn btn-secondary" id="close-blocked-btn">Close</button>`;
        document.getElementById('close-blocked-btn').addEventListener('click', closePanel);
    } else {
        actionButtons.innerHTML = `
      <button class="btn btn-primary" id="use-safe-btn">${window.i18n.t('useSafeVersion')}</button>
      <button class="btn btn-secondary" id="cancel-result-btn">${window.i18n.t('cancel')}</button>
    `;
        document.getElementById('use-safe-btn').addEventListener('click', useSafeVersion);
        document.getElementById('cancel-result-btn').addEventListener('click', () => {
            document.getElementById('results').classList.remove('show');
        });
    }

    document.getElementById('results').classList.add('show');
}

// Record action telemetry
async function recordAction(actionType) {
    try {
        await fetch(`${API_URL}/telemetry/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actionType,
                detectors: analysisResult?.findings?.map(f => f.type) || [],
                tool: 'chatgpt',
                userId: (await chrome.storage.local.get('userData')).userData?.user?.id || 'anonymous'
            })
        });
    } catch (e) {
        console.error('Failed to record action', e);
    }
}

// Use safe version
async function useSafeVersion() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sanitizedText) => {
                const activeElement = document.activeElement;
                if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
                    activeElement.value = sanitizedText;
                    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (activeElement.getAttribute('contenteditable') === 'true') {
                    activeElement.textContent = sanitizedText;
                    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    // Try to find ChatGPT textarea
                    const chatInput = document.querySelector('textarea[placeholder*="Message"]') ||
                        document.querySelector('textarea');
                    if (chatInput) {
                        chatInput.value = sanitizedText;
                        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            },
            args: [analysisResult.sanitizedText]
        });

        // Record "Fix" action
        await recordAction('Fix');

        showSuccess(window.i18n.t('textReplacedSuccess'));

        setTimeout(() => {
            closePanel();
        }, 1500);

    } catch (error) {
        console.error('Use safe version error:', error);
        showError(window.i18n.t('failedToUpdateText'));
    }
}

// Show error or warning
function showError(message, type = 'error') {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    if (type === 'warning') {
        errorDiv.style.background = '#fff3e0';
        errorDiv.style.color = '#f57c00';
    } else {
        errorDiv.style.background = ''; // default
        errorDiv.style.color = '';
    }

    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
    }, 5000);
}

// Show success
function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#e8f5e9';
    errorDiv.style.color = '#2e7d32';
    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.style.background = '';
        errorDiv.style.color = '';
    }, 3000);
}

// Close panel
function closePanel() {
    window.close();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initPanel);
