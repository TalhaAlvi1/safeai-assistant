// Side panel script for the Document Wizard
document.addEventListener('DOMContentLoaded', function () {
  // Step navigation
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const processing = document.getElementById('processing');
  const result = document.getElementById('result');

  const nextStep1Btn = document.getElementById('nextStep1');
  const nextStep2Btn = document.getElementById('nextStep2');
  const processDocumentBtn = document.getElementById('processDocument');
  const copyToClipboardBtn = document.getElementById('copyToClipboard');
  const sendToAIBtn = document.getElementById('sendToAI');

  // Form elements
  const actionSelect = document.getElementById('actionSelect');
  const documentUpload = document.getElementById('documentUpload');
  const documentText = document.getElementById('documentText');
  const clientType = document.getElementById('clientType');
  const tone = document.getElementById('tone');
  const goal = document.getElementById('goal');
  const resultContent = document.getElementById('resultContent');

  // Navigation between steps
  nextStep1Btn.addEventListener('click', function () {
    if (actionSelect.value) {
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
    } else {
      alert(window.i18n.t('selectActionAlert'));
    }
  });

  nextStep2Btn.addEventListener('click', function () {
    const docText = documentText.value;
    const file = documentUpload.files[0];

    if (docText || file) {
      step2.classList.add('hidden');
      step3.classList.remove('hidden');
    } else {
      alert(window.i18n.t('provideDocContentAlert'));
    }
  });

  // Process document
  processDocumentBtn.addEventListener('click', function () {
    step3.classList.add('hidden');
    processing.classList.remove('hidden');

    // Simulate processing delay
    setTimeout(processDocument, 2000);
  });

  // Copy to clipboard
  copyToClipboardBtn.addEventListener('click', function () {
    const text = resultContent.innerText;
    navigator.clipboard.writeText(text).then(function () {
      alert(window.i18n.t('copiedToClipboardAlert'));
    });
  });

  // Send to AI tool
  sendToAIBtn.addEventListener('click', function () {
    const text = resultContent.innerText;

    // Send message to content script to insert text into AI tool
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertText',
        text: text
      }, function (response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          alert(window.i18n.t('failedToSendAIToolAlert'));
        } else {
          alert(window.i18n.t('textSentAIToolAlert'));
        }
      });
    });
  });

  // Process document function
  function processDocument() {
    // Get document content
    let content = documentText.value;
    if (!content && documentUpload.files[0]) {
      content = 'Sample document content'; // In a real implementation, we would parse the file
    }

    // Get context
    const action = actionSelect.value;
    const context = {
      clientType: clientType.value,
      tone: tone.value,
      goal: goal.value
    };

    // Create safe prompt
    const safePrompt = createSafePrompt(content, action, context);

    // Display result
    processing.classList.add('hidden');
    resultContent.innerHTML = safePrompt;
    result.classList.remove('hidden');

    // Store event for dashboard
    chrome.storage.local.get(['events'], function (resultData) {
      const events = resultData.events || [];
      events.push({
        id: Date.now(),
        type: 'documentProcessed',
        timestamp: new Date().toISOString(),
        action: action
      });

      chrome.storage.local.set({ events: events });
    });
  }

  // Create a safe prompt by removing PII and adding context
  function createSafePrompt(content, action, context) {
    // Remove PII from content
    const sanitizedContent = content.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[CLIENT NAME]')
      .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
      .replace(/\b\d{4}-?\d{4}-?\d{4}-?\d{4}\b/g, '[ACCOUNT NUMBER]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
      .replace(/\b\d{3}-?\d{3}-?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{9}\b/g, '[ID]');

    // Create role instruction based on context
    let roleInstruction = '';
    if (context.clientType === 'individual') {
      roleInstruction = 'You are a professional advisor helping an individual client.';
    } else {
      roleInstruction = 'You are a professional advisor helping a business client.';
    }

    // Create action instruction
    let actionInstruction = '';
    switch (action) {
      case 'summarize':
        actionInstruction = 'Please summarize the following document';
        break;
      case 'draft':
        actionInstruction = 'Please draft a response to the client based on the following document';
        break;
      case 'extract':
        actionInstruction = 'Please extract key points and potential risks from the following document';
        break;
    }

    // Add tone instruction
    const toneInstruction = context.tone === 'formal' ?
      'Use a formal tone in your response.' :
      'Use a friendly but professional tone in your response.';

    // Add goal instruction
    let goalInstruction = '';
    switch (context.goal) {
      case 'explain':
        goalInstruction = 'Explain the content clearly and concisely.';
        break;
      case 'warn':
        goalInstruction = 'Highlight any warnings or concerns in the content.';
        break;
      case 'negotiate':
        goalInstruction = 'Identify negotiation points in the content.';
        break;
    }

    // Combine all parts
    return `${roleInstruction} ${actionInstruction}. ${toneInstruction} ${goalInstruction}\n\nDocument content:\n${sanitizedContent}`;
  }
});