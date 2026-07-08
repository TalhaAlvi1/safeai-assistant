document.addEventListener('DOMContentLoaded', function() {
  const documentWizardBtn = document.getElementById('documentWizard');
  const dashboardBtn = document.getElementById('dashboard');
  const settingsBtn = document.getElementById('settings');
  const statusDiv = document.getElementById('status');

  // Update status
  chrome.storage.local.get(['protectionStatus'], function(result) {
    if (result.protectionStatus) {
      statusDiv.textContent = result.protectionStatus;
    }
  });

  // Document Wizard button
  documentWizardBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.sidePanel.open({windowId: tabs[0].windowId});
      chrome.runtime.sendMessage({action: "openDocumentWizard"});
    });
  });

  // Dashboard button
  dashboardBtn.addEventListener('click', function() {
    chrome.tabs.create({url: chrome.runtime.getURL('dashboard.html')});
  });

  // Settings button
  settingsBtn.addEventListener('click', function() {
    chrome.tabs.create({url: chrome.runtime.getURL('settings.html')});
  });
});