// Settings script for SafeAI Assistant
document.addEventListener('DOMContentLoaded', function () {
  // DOM elements
  const aiServiceSelect = document.getElementById('aiService');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const dataRetentionSelect = document.getElementById('dataRetention');
  const anonymousModeCheckbox = document.getElementById('anonymousMode');
  const showNotificationsCheckbox = document.getElementById('showNotifications');
  const emailAlertsCheckbox = document.getElementById('emailAlerts');
  const developerModeCheckbox = document.getElementById('developerMode');
  const uiLanguageSelect = document.getElementById('uiLanguage');
  const resetSettingsBtn = document.getElementById('resetSettings');

  // Load settings
  loadSettings();

  // Event listeners
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  resetSettingsBtn.addEventListener('click', resetSettings);
  document.getElementById('logoutSettingsBtn')?.addEventListener('click', handleLogout);
  document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
  document.getElementById('purgeDataBtn')?.addEventListener('click', purgeData);

  function handleLogout() {
    const confirmMsg = window.i18n?.t('logoutConfirm') || 'Are you sure you want to log out?';
    if (confirm(confirmMsg)) {
      chrome.storage.local.remove(['authToken', 'userData'], () => {
        window.close();
      });
    }
  }

  async function exportData() {
    chrome.storage.local.get(['authToken', 'userData'], async (result) => {
      if (!result.authToken) {
        alert('Please login first.');
        return;
      }
      const tenantId = result.userData?.tenant?.id || 'demo-tenant';
      try {
        const response = await fetch(`http://localhost:3000/admin/tenant/${tenantId}/export`, {
          headers: { 'Authorization': `Bearer ${result.authToken}` }
        });
        const data = await response.json();

        // Download as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safeai_export_${tenantId}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      } catch (e) {
        console.error('Export failed', e);
        alert('Export failed.');
      }
    });
  }

  async function purgeData() {
    const confirmMsg = window.i18n?.t('purgeDataConfirm') || 'Are you sure you want to PERMANENTLY purge all your organization data? This cannot be undone.';
    if (!confirm(confirmMsg)) return;

    chrome.storage.local.get(['authToken', 'userData'], async (result) => {
      if (!result.authToken) return;
      const tenantId = result.userData?.tenant?.id || 'demo-tenant';
      try {
        const response = await fetch(`http://localhost:3000/admin/tenant/${tenantId}/purge`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${result.authToken}` }
        });
        if (response.ok) {
          alert('Data purged successfully.');
        }
      } catch (e) {
        console.error('Purge failed', e);
      }
    });
  }

  uiLanguageSelect.addEventListener('change', function () {
    const lang = uiLanguageSelect.value;
    if (window.i18n) {
      window.i18n.setLanguage(lang);
    }
    saveSettings();
  });

  // Load settings from storage
  function loadSettings() {
    chrome.storage.local.get([
      'aiService', 'apiKey', 'dataRetention',
      'anonymousMode', 'showNotifications', 'emailAlerts', 'developerMode', 'preferredLanguage'
    ], function (result) {
      aiServiceSelect.value = result.aiService || 'openai';
      // Don't load API key for security reasons
      dataRetentionSelect.value = result.dataRetention || '30';
      anonymousModeCheckbox.checked = result.anonymousMode !== false; // default to true
      showNotificationsCheckbox.checked = result.showNotifications !== false; // default to true
      emailAlertsCheckbox.checked = result.emailAlerts || false;
      developerModeCheckbox.checked = result.developerMode || false;
    });
  }

  // Save API key
  function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ apiKey: apiKey }, function () {
        alert('API key saved successfully!');
        apiKeyInput.value = ''; // Clear the input for security
      });
    } else {
      alert('Please enter a valid API key.');
    }
  }

  // Save settings
  function saveSettings() {
    const settings = {
      aiService: aiServiceSelect.value,
      dataRetention: dataRetentionSelect.value,
      anonymousMode: anonymousModeCheckbox.checked,
      showNotifications: showNotificationsCheckbox.checked,
      emailAlerts: emailAlertsCheckbox.checked,
      developerMode: developerModeCheckbox.checked,
      preferredLanguage: uiLanguageSelect.value
    };

    chrome.storage.local.set(settings, function () {
      console.log('Settings saved:', settings);
    });
  }

  // Reset settings to defaults
  function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      // Reset form elements
      aiServiceSelect.value = 'openai';
      dataRetentionSelect.value = '30';
      anonymousModeCheckbox.checked = true;
      showNotificationsCheckbox.checked = true;
      emailAlertsCheckbox.checked = false;
      developerModeCheckbox.checked = false;
      uiLanguageSelect.value = 'en';

      // Save default settings
      const defaultSettings = {
        aiService: 'openai',
        dataRetention: '30',
        anonymousMode: true,
        showNotifications: true,
        emailAlerts: false,
        developerMode: false,
        preferredLanguage: 'en'
      };

      chrome.storage.local.set(defaultSettings, function () {
        alert('Settings have been reset to defaults.');
      });
    }
  }
});