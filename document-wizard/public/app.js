// Document Wizard App
// Dynamically determine the API URL based on the current host
const API_URL = window.location.origin;
let currentSessionId = null;
let currentFileType = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadApiKey(); // Load saved API key if available
});

// Setup event listeners
function setupEventListeners() {
    // File upload
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // LLM provider selection
    const llmProviderSelect = document.getElementById('llm-provider');
    // const apiKeyContainer = document.getElementById('api-key-container'); // Hidden for SaaS mode

    llmProviderSelect.addEventListener('change', () => {
        // const provider = llmProviderSelect.value;
        // apiKeyContainer.style.display = 'none'; 
    });

    // Chat functionality
    setupChatHandlers();
}

// Load saved API key (Legacy/Dev mode only)
function loadApiKey(provider = null) {
    // Disabled for SaaS MVP - using backend keys
}

// Save API key
function saveApiKey(provider, apiKey) {
    // Disabled
}

// Handle file upload
async function handleFileUpload(file) {
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF, DOCX, or TXT file.');
        return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('docType', file.type);

    try {
        showLoading(true);

        const response = await fetch(`${API_URL}/api/documents/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        currentSessionId = data.documentId;
        currentFileType = file.type;

        // Analyze document
        await analyzeDocument();

    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Analyze document
async function analyzeDocument() {
    if (!currentSessionId) return;

    try {
        showLoading(true);

        const response = await fetch(`${API_URL}/api/documents/${currentSessionId}/analyze`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
        }

        const data = await response.json();

        // Show copilot section
        document.getElementById('upload-section').classList.remove('active');
        document.getElementById('copilot-section').style.display = 'block';

        // Display summary - handle both string and object responses
        let summaryText = 'Document analyzed successfully.';
        if (data.summary) {
            if (typeof data.summary === 'string') {
                summaryText = data.summary;
            } else if (typeof data.summary === 'object') {
                summaryText = JSON.stringify(data.summary, null, 2);
            }
        }
        document.getElementById('document-summary').textContent = summaryText;

        // Display document content (truncated)
        let content = '';
        if (data.analysis && data.analysis.originalText) {
            content = data.analysis.originalText;
        } else if (data.extraction && data.extraction.text) {
            content = data.extraction.text;
        }

        const contentElement = document.getElementById('document-text');
        const contentContainer = document.getElementById('document-content');

        if (content) {
            contentContainer.style.display = 'block';
            contentElement.textContent = content.substring(0, 5000) + (content.length > 5000 ? '...' : '');
        } else {
            contentContainer.style.display = 'none';
        }

    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Setup chat handlers
function setupChatHandlers() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const quickQuestionBtns = document.querySelectorAll('.quick-question-btn');

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Enter key
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Quick questions
    quickQuestionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.dataset.question;
            chatInput.value = question;
            sendMessage();
        });
    });

    // New document button
    document.getElementById('new-document-btn')?.addEventListener('click', () => {
        location.reload();
    });

    // Download safe button
    document.getElementById('download-safe-btn')?.addEventListener('click', async () => {
        if (!currentSessionId) return;

        try {
            // First, create the anonymized document
            const anonymizeResponse = await fetch(`${API_URL}/api/documents/${currentSessionId}/anonymize`, {
                method: 'POST'
            });

            if (!anonymizeResponse.ok) {
                const errorData = await anonymizeResponse.json();
                throw new Error(errorData.error || 'Anonymization failed');
            }

            // Then download the anonymized document
            const downloadResponse = await fetch(`${API_URL}/api/documents/${currentSessionId}/download`);

            if (!downloadResponse.ok) {
                const errorData = await downloadResponse.json();
                throw new Error(errorData.error || 'Download failed');
            }

            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'anonymized_document.txt';
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed: ' + error.message);
        }
    });
}

// Send message
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const question = chatInput.value.trim();
    const llmProvider = document.getElementById('llm-provider').value;
    // const apiKey = document.getElementById('api-key').value;

    if (!question || !currentSessionId) return;

    // Save API key
    // if (apiKey) {
    //    saveApiKey(llmProvider, apiKey);
    // }

    // Add user message
    addMessage(question, 'user');
    chatInput.value = '';

    // Show typing indicator
    document.getElementById('typing-indicator').classList.add('show');

    try {
        // For now, we'll use a simplified approach since we don't have database integration
        // In a full implementation, we would send the provider and API key to the backend
        const response = await fetch(`${API_URL}/api/documents/${currentSessionId}/question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                llmProvider // Send the selected LLM provider
            })
        });

        if (!response.ok) throw new Error('Question failed');

        const data = await response.json();

        // Hide typing indicator
        document.getElementById('typing-indicator').classList.remove('show');

        // Add assistant message
        addMessage(data.answer || 'I could not find an answer to that question.', 'assistant');

    } catch (error) {
        console.error('Question error:', error);
        document.getElementById('typing-indicator').classList.remove('show');
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }
}

// Add message to chat
function addMessage(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
    <div>${text}</div>
    <div class="message-time">${time}</div>
  `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Show/hide loading
function showLoading(show) {
    const uploadArea = document.getElementById('upload-area');
    const loading = document.getElementById('upload-loading');

    if (show) {
        uploadArea.style.opacity = '0.5';
        if (loading) loading.style.display = 'block';
    } else {
        uploadArea.style.opacity = '1';
        if (loading) loading.style.display = 'none';
    }
}