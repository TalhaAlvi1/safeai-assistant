// Background script - handles extension lifecycle and messaging
chrome.runtime.onInstalled.addListener(() => {
  console.log('SafeAI Assistant installed');
});

// Handle messages from content scripts and panels
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPanel') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId })
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'openWizard') {
    // Use the Railway URL as default, fallback to localhost for development
    const wizardUrl = 'https://safeaibackend-production.up.railway.app/wizard';
    chrome.tabs.create({ url: wizardUrl });
    sendResponse({ success: true });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});
