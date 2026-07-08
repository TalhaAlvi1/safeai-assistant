// Content script - SafeAI Assistant v2.0
console.log('SafeAI Assistant v2.0 loaded');

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  checkBackendHealth().then(isUp => {
    if (isUp) {
      showToast('SafeAI Assistant Active');
    } else {
      showToast('SafeAI: Protection service currently unavailable', 'error');
    }
  });
  monitorInputs();
}

async function checkBackendHealth() {
  try {
    // We use the health endpoint for a lightweight check
    const response = await fetch('http://localhost:3000/health', { method: 'GET', mode: 'cors' });
    return response.ok;
  } catch (e) {
    return false;
  }
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? '#f44336' : '#4CAF50';
  toast.style.cssText = `position:fixed;top:20px;right:20px;background:${bgColor};color:white;padding:12px 20px;border-radius:8px;z-index:9999;font-family:sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), type === 'error' ? 5000 : 3000);
}

// Update dashboard stats
function updateStats(findings, action) {
  // Get current stats from storage
  chrome.storage.local.get(['stats', 'recentActivity'], (result) => {
    const stats = result.stats || {
      totalChecks: 0,
      safeChecks: 0,
      warnings: 0,
      blocks: 0
    };

    const activity = result.recentActivity || [];

    // Update stats based on action
    stats.totalChecks++;

    if (action === 'safe') {
      stats.safeChecks++;
    } else if (action === 'warning') {
      stats.warnings++;
    } else if (action === 'block') {
      stats.blocks++;
    }

    // Create activity entry
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    let riskLevel = 'LOW';
    if (findings.length > 3) riskLevel = 'HIGH';
    else if (findings.length > 1) riskLevel = 'MEDIUM';

    const activityEntry = {
      type: findings.length > 0 ? findings[0].type : 'DEFAULT',
      title: findings.length > 0
        ? `Detected ${findings.length} ${findings[0].type.replace('_', ' ')} item(s)`
        : 'No sensitive data found',
      time: timeString,
      risk: riskLevel
    };

    // Add to activity (limit to 50 entries)
    activity.unshift(activityEntry);
    if (activity.length > 50) {
      activity.pop();
    }

    // Save updated stats and activity
    chrome.storage.local.set({
      stats: stats,
      recentActivity: activity
    }, () => {
      // Log success for debugging
      console.log('SafeAI: Stats updated', { stats, activity: activity.slice(0, 3) });
    });
  });
}

// Detect sensitive data
// Detect sensitive data using the Catalog
function detectPII(text) {
  const findings = [];
  if (!text) return findings;

  // Use the global DetectorCatalog if available (injected via manifest)
  const catalog = window.DetectorCatalog || {};

  Object.values(catalog).forEach(category => {
    if (!category.patterns) return;

    category.patterns.forEach(pattern => {
      const matches = text.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          // Avoid duplicates
          if (!findings.some(f => f.value === match)) {
            findings.push({
              type: pattern.type, // e.g., CREDIT_CARD
              category: category.id, // e.g., FINANCIAL_AND_PAYMENT
              value: match,
              label: category.label,
              explain: category.explain, // Default explanation
              defaultAction: category.defaults['STANDARD'] // Default to Standard for now
            });
          }
        });
      }
    });

    // Special handling for credentials/keys (if any custom logic needed)
  });

  return findings;
}

function getIcon(type) {
  const icons = {
    EMAIL: '📧', PHONE: '📞', PHONE_INTL: '📞', ADDRESS: '🏠',
    SSN: '🆔', PASSPORT: '🛂',
    CREDIT_CARD: '💳', IBAN: '🏦',
    HEALTH_TERM: '⚕️', ICD_CODE: '🏥',
    API_KEY: '🔑', PRIVATE_KEY: '🗝️', DB_CONNECTION: '🗄️',
    IP_ADDRESS: '🌐', MAC_ADDRESS: '💻'
  };
  return icons[type] || '⚠️';
}

function showWarning(textarea, findings) {
  // Remove any existing warnings
  document.querySelectorAll('.safeai-warning').forEach(w => w.remove());
  if (!findings.length) return;

  const warning = document.createElement('div');
  warning.className = 'safeai-warning';
  // Style will be set after risk determination


  // Group findings by Category (or Type)
  const byCategory = {};
  let hasBlock = false;

  findings.forEach(f => {
    // Determine category key (Prefer category ID from Catalog, fallback to Type)
    const key = f.category || f.type;
    if (!byCategory[key]) {
      byCategory[key] = {
        label: f.label || key.replace(/_/g, ' '),
        count: 0,
        examples: [],
        action: f.defaultAction || 'WARN',
        explain: f.explain || `This looks like ${key.replace(/_/g, ' ')}.`
      };
    }
    byCategory[key].count++;
    if (byCategory[key].examples.length < 1) byCategory[key].examples.push(f.value);
    if (byCategory[key].action === 'BLOCK') hasBlock = true;
  });

  const risk = hasBlock ? 'CRITICAL' : (findings.length > 3 ? 'HIGH' : findings.length > 1 ? 'MEDIUM' : 'LOW');
  const borderColor = hasBlock ? '#d32f2f' : '#ff9800'; // Red for Block, Orange for Warn
  const bgColor = hasBlock ? '#ffebee' : '#fff8e1';
  const iconColor = hasBlock ? '#c62828' : '#e65100';

  warning.style.cssText = `background:${bgColor};border:2px solid ${borderColor};border-radius:8px;padding:12px 16px;margin-top:8px;font-family:sans-serif;font-size:14px;color:${iconColor};box-shadow:0 2px 8px rgba(0,0,0,0.1);animation:slideDown 0.3s;max-height:400px;overflow-y:auto`;

  let html = `<div style="display:flex;gap:10px"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="${iconColor}"/></svg><div style="flex:1"><strong>${hasBlock ? '⛔ Request Blocked' : '⚠️ Sensitive Data Found'} (${risk} Risk)</strong><div style="margin-top:10px;font-size:13px"><div style="font-weight:600;margin-bottom:8px;color:${iconColor}">Found ${findings.length} item${findings.length !== 1 ? 's' : ''}:</div>`;

  Object.values(byCategory).forEach(cat => {
    // Icon based on first finding type of this category (approx)
    // In a real implementation we might need a category-level icon
    const icon = getIcon(findings.find(f => (f.category || f.type) === (cat.label === 'Client contact details' ? 'CONTACT_AND_IDENTITY' : cat.label))?.type || 'EMAIL');

    html += `<div style="margin-bottom:8px;padding:10px;background:white;border-radius:4px;border-left:3px solid ${cat.action === 'BLOCK' ? '#d32f2f' : '#ff9800'}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:16px">${icon}</span>
            <strong>${cat.label}</strong>
            <span style="background:${cat.action === 'BLOCK' ? '#d32f2f' : '#ff9800'};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${cat.action}</span>
            <span style="background:#eee;color:#333;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600">x${cat.count}</span>
        </div>
        <div style="font-size:12px;color:#444;margin-bottom:4px">${cat.explain}</div>
        <div style="font-size:11px;color:#666;font-style:italic">Example: ${cat.examples[0].substring(0, 30)}${cat.examples[0].length > 30 ? '...' : ''}</div>
    </div>`;
  });

  html += `</div></div><button class="close-btn" style="background:none;border:none;cursor:pointer;font-size:20px;color:${iconColor};padding:0">×</button></div>`;

  // Footer Actions
  html += `<div style="margin-top:12px;display:flex;gap:10px">
     <button id="safeai-anonymize-btn" style="background:${hasBlock ? '#d32f2f' : '#ff9800'};color:white;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;flex:1">🛡️ Fix (Protect)</button>
     ${!hasBlock ? `
        <button id="safeai-enhance-btn" style="background:white;color:#e65100;border:1px solid #ff9800;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;flex:1">✨ Enhance Prompt</button>
        <button id="safeai-send-anyway-btn" style="background:none;color:#666;border:none;padding:10px;cursor:pointer;font-size:12px;text-decoration:underline;">Send anyway</button>
     ` : ''}
  </div>`;

  if (hasBlock) {
    html += `<div style="margin-top:8px;text-align:center;font-size:12px;color:#d32f2f">Policy strictly prohibits sending this data. You must anonymize it.</div>`;
  }

  warning.innerHTML = html;
  textarea.parentElement.insertBefore(warning, textarea.nextSibling);

  // Update stats for warning
  updateStats(findings, 'warning');

  // Use setTimeout to ensure the DOM is fully rendered before attaching event listeners
  setTimeout(() => {
    const closeBtn = warning.querySelector('.close-btn');
    const anonymizeBtn = document.getElementById('safeai-anonymize-btn');
    const sendAnywayBtn = document.getElementById('safeai-send-anyway-btn');

    if (sendAnywayBtn) {
      sendAnywayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        allowNextSend = true;
        warning.remove();
        showToast('SafeAI: Override authorized. You may now send.');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        warning.remove();
        // Update stats for safe action when warning is closed
        updateStats([], 'safe');
      });
    }

    if (anonymizeBtn) {
      anonymizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get current text value
        const currentText = textarea.value || textarea.textContent || '';

        if (!currentText) {
          warning.remove();
          return;
        }

        let sanitized = currentText;
        const counters = {};

        // Sort findings by length (longest first) to avoid partial replacements
        const sortedFindings = [...findings].sort((a, b) => b.value.length - a.value.length);

        sortedFindings.forEach(f => {
          // Ensure f.value is valid
          if (!f.value) return;

          if (!counters[f.type]) counters[f.type] = 0;
          counters[f.type]++;

          // Escape special regex characters in the value
          const escapedValue = f.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // Replace all occurrences of the sensitive data
          const regex = new RegExp(escapedValue, 'g');
          sanitized = sanitized.replace(regex, `[${f.type}_${counters[f.type]}]`);
        });

        // Update textarea value
        if (textarea.value !== undefined) {
          textarea.value = sanitized;
        } else {
          textarea.textContent = sanitized;
        }

        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        warning.remove();

        const success = document.createElement('div');
        success.style.cssText = `background:#e8f5e9;border:2px solid #4caf50;border-radius:8px;padding:12px 16px;margin-top:8px;color:#2e7d32;font-size:14px;animation:slideDown 0.3s`;
        success.textContent = '✅ Fixed! Sensitive data replaced with placeholders.';
        textarea.parentElement.insertBefore(success, textarea.nextSibling);
        setTimeout(() => success.remove(), 3000);
      });
    }

    const enhanceBtn = document.getElementById('safeai-enhance-btn');
    if (enhanceBtn) {
      enhanceBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const originalText = enhanceBtn.textContent;
        enhanceBtn.textContent = '✨ Enhancing...';
        enhanceBtn.disabled = true;
        enhanceBtn.style.opacity = '0.7';

        // Get current text value
        const currentText = textarea.value || textarea.textContent || '';
        if (!currentText) return;

        try {
          // Simulate enhancement for now (Milestone 2/3 transition)
          // In real implementation, this calls backend /enhance endpoint
          await new Promise(r => setTimeout(r, 1500));

          const findings = detectPII(currentText);
          let enhanced = currentText;

          // Simple enhancement: Wrap sensitive data in context, don't just mask it
          // This is a placeholder for the Agentic LLM enhancement
          enhanced = `[CONTEXT: The user is asking about a client matter. Ensure confidentiality.]\n\n${currentText}`;

          // Update textarea
          if (textarea.value !== undefined) {
            textarea.value = enhanced;
          } else {
            textarea.textContent = enhanced;
          }
          textarea.dispatchEvent(new Event('input', { bubbles: true }));

          warning.remove();
          showToast('Prompt enhanced for safety & clarity! ✨');

        } catch (error) {
          console.error('Enhance failed:', error);
          enhanceBtn.textContent = 'Error';
          setTimeout(() => {
            enhanceBtn.textContent = originalText;
            enhanceBtn.disabled = false;
            enhanceBtn.style.opacity = '1';
          }, 2000);
        }
      });
    }
  }, 0);
}

// As-you-type hint
function showHint(textarea, findings) {
  // Remove existing hint
  const existing = document.getElementById('safeai-hint');
  if (existing) existing.remove();

  if (!findings.length) return;

  const hint = document.createElement('div');
  hint.id = 'safeai-hint';
  hint.style.cssText = `font-family:sans-serif;font-size:12px;color:#666;margin-top:4px;padding:0 4px;display:flex;align-items:center;gap:6px;animation:fadeIn 0.3s`;
  hint.innerHTML = `<span style="color:#ff9800">⚠️</span> SafeAI: We found potential client details. We'll check this before you send.`;

  textarea.parentElement.insertBefore(hint, textarea.nextSibling);
}

function monitorInputs() {
  let timeout = null;
  document.addEventListener('input', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.getAttribute('contenteditable') === 'true') {
      const text = e.target.value || e.target.textContent || '';
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const findings = detectPII(text);

        // Show full warning automatically when sensitive data is detected
        if (findings.length > 0) {
          showWarning(e.target, findings);
        } else {
          // Remove warning if user clears text or fixes it
          document.querySelectorAll('.safeai-warning').forEach(w => w.remove());
        }
      }, 300); // Faster debounce for hints
    }
  });

  // Intercept Enter key
  document.addEventListener('keydown', handleKeydown, true); // Capture phase

  // Intercept Click on Send buttons
  document.addEventListener('click', handleClick, true); // Capture phase
}

let allowNextSend = false;

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && (e.target.tagName === 'TEXTAREA' || e.target.getAttribute('contenteditable') === 'true')) {
    if (allowNextSend) { // One-time bypass
      allowNextSend = false;
      return;
    }

    const text = e.target.value || e.target.textContent || '';
    const findings = detectPII(text);

    if (findings.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      showWarning(e.target, findings);
      showToast('SafeAI: Please review sensitive data before sending.');
    }
  }
}

function handleClick(e) {
  // Heuristic for Send buttons: explicit selectors or aria-label="Send"
  const target = e.target.closest('button, [role="button"]');
  if (!target) return;

  const isSendBtn = target.getAttribute('aria-label') === 'Send message' ||
    target.getAttribute('data-testid') === 'send-button' ||
    target.querySelector('svg'); // Often icons

  if (isSendBtn && !allowNextSend) {
    // Find the active textarea
    const textarea = document.querySelector('textarea, [contenteditable="true"]');
    if (textarea) {
      const text = textarea.value || textarea.textContent || '';
      const findings = detectPII(text);
      if (findings.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        showWarning(textarea, findings);
        showToast('SafeAI: Please review sensitive data before sending.');
      }
    }
  }
  // If allowNextSend is true, we let it pass and reset it
  if (allowNextSend) {
    setTimeout(() => { allowNextSend = false; }, 100);
  }
}

// CSS
const style = document.createElement('style');
style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideDown{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}`;

// Create Floating Action Button
function createFAB() {
  const fab = document.createElement('div');
  fab.id = 'safeai-fab';
  fab.style.cssText = `position:fixed;bottom:20px;right:20px;width:50px;height:50px;background:white;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.2);cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;transition:transform 0.2s`;
  fab.innerHTML = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6H9V5zm0 8h2v2H9v-2z" fill="#4CAF50"/></svg>`;

  fab.addEventListener('mouseenter', () => fab.style.transform = 'scale(1.1)');
  fab.addEventListener('mouseleave', () => fab.style.transform = 'scale(1)');
  fab.addEventListener('click', () => {
    // Open Wizard as primary action for now
    if (typeof openWizard === 'function') openWizard();
    else window.open('http://localhost:3000/wizard/', '_blank', 'width=1000,height=800');
  });

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `position:absolute;bottom:60px;right:0;background:#333;color:white;padding:6px 10px;border-radius:4px;font-size:12px;white-space:nowrap;opacity:0;transition:opacity 0.2s;pointer-events:none`;
  tooltip.textContent = 'SafeAI Privacy Check Active';
  fab.appendChild(tooltip);

  fab.addEventListener('mouseenter', () => tooltip.style.opacity = '1');
  fab.addEventListener('mouseleave', () => tooltip.style.opacity = '0');

  document.body.appendChild(fab);
}

// Initialize FAB
setTimeout(createFAB, 1000); // Verify DOM loaded logic

// --- SafeAI Wizard Extensions ---

function openWizard() {
  window.open('http://localhost:3000/wizard/', 'SafeAIWizard', 'width=1000,height=800');
}

function monitorPaste() {
  document.addEventListener('paste', (e) => {
    try {
      const text = e.clipboardData.getData('text');
      if (text && text.length > 2000) {
        if (document.getElementById('safeai-paste-hint')) return;
        const hint = document.createElement('div');
        hint.id = 'safeai-paste-hint';
        hint.style.cssText = `position:fixed;bottom:80px;right:20px;background:#fff;border:1px solid #ddd;padding:12px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;display:flex;align-items:center;gap:10px;animation:slideIn 0.3s`;
        hint.innerHTML = `<div><strong>📄 Large text?</strong><br>Use SafeAI Wizard.</div><button id="wiz-btn" style="background:#667eea;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer">Open</button><button id="wiz-cls" style="border:none;background:none;cursor:pointer">✕</button>`;
        document.body.appendChild(hint);
        document.getElementById('wiz-btn').onclick = () => { openWizard(); hint.remove(); };
        document.getElementById('wiz-cls').onclick = () => hint.remove();
        setTimeout(() => hint.remove(), 15000);
      }
    } catch (e) { }
  });
}
// Start monitoring
monitorPaste();

