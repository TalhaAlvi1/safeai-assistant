/**
 * SafeAI Detector Catalog
 * Defines sensitive data categories, patterns, and policy defaults.
 */
const DetectorCatalog = {
    CONTACT_AND_IDENTITY: {
        id: 'CONTACT_AND_IDENTITY',
        label: 'Client contact details',
        explain: 'We found client contact details (names, emails, phone numbers or addresses) in this message.',
        defaults: { RELAXED: 'WARN', STANDARD: 'WARN', STRICT: 'BLOCK' },
        patterns: [
            { type: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi },
            { type: 'PHONE', regex: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
            { type: 'PHONE_INTL', regex: /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g },
            // Simple address heuristic (Zip codes, 'Street', etc. - simplified for client-side)
            { type: 'ADDRESS', regex: /\b\d+\s[A-Za-z]+\s(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive)\b/gi }
        ]
    },
    GOVERNMENT_IDS: {
        id: 'GOVERNMENT_IDS',
        label: 'Government or ID numbers',
        explain: 'We found government or ID numbers (like passport, ID card, or tax ID). These are very sensitive and usually shouldn’t be pasted into AI tools.',
        defaults: { RELAXED: 'WARN', STANDARD: 'BLOCK', STRICT: 'BLOCK' },
        patterns: [
            { type: 'SSN', regex: /\b\d{3}-?\d{2}-?\d{4}\b/g },
            { type: 'PASSPORT', regex: /\b[A-Z]{1,2}\d{6,9}\b/g }
        ]
    },
    FINANCIAL_AND_PAYMENT: {
        id: 'FINANCIAL_AND_PAYMENT',
        label: 'Payment & bank details',
        explain: 'We found payment or bank details (like credit card or bank account numbers). These are highly sensitive and should not be sent to AI tools.',
        defaults: { RELAXED: 'BLOCK', STANDARD: 'BLOCK', STRICT: 'BLOCK' },
        patterns: [
            { type: 'CREDIT_CARD', regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
            { type: 'IBAN', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g }
        ]
    },
    HEALTH_INFO: {
        id: 'HEALTH_INFO',
        label: 'Health-related client information',
        explain: 'This text includes health-related client information (diagnoses, treatments, or health insurance details). This type of data is very sensitive under privacy laws.',
        defaults: { RELAXED: 'WARN', STANDARD: 'BLOCK', STRICT: 'BLOCK' },
        patterns: [
            { type: 'HEALTH_TERM', regex: /\b(diagnosis|prognosis|treatment|prescription|patient|medical history|symptoms|chronic|acute|disease|syndrome|disorder)\b/gi },
            { type: 'ICD_CODE', regex: /\b[A-Z]\d{2}(\.\d{1,2})?\b/g } // Basic ICD-10 format
        ]
    },
    CREDENTIALS_AND_SECRETS: {
        id: 'CREDENTIALS_AND_SECRETS',
        label: 'Passwords & access keys',
        explain: 'We found passwords or access keys (API keys, database credentials, or similar). These should never be pasted into AI tools.',
        defaults: { RELAXED: 'BLOCK', STANDARD: 'BLOCK', STRICT: 'BLOCK' },
        patterns: [
            { type: 'API_KEY', regex: /\b(sk-[A-Za-z0-9]{48}|AKIA[A-Z0-9]{16})\b/g },
            { type: 'PRIVATE_KEY', regex: /-----BEGIN PRIVATE KEY-----/g },
            { type: 'DB_CONNECTION', regex: /postgres:\/\/[^:]+:[^@]+@/g }
        ]
    },
    NETWORK_AND_DEVICE: {
        id: 'NETWORK_AND_DEVICE',
        label: 'Network or device identifiers',
        explain: 'We found network or device identifiers (IP address, device ID, or similar). These can sometimes identify systems or devices.',
        defaults: { RELAXED: 'ALLOW', STANDARD: 'WARN', STRICT: 'BLOCK' },
        patterns: [
            { type: 'IP_ADDRESS', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
            { type: 'MAC_ADDRESS', regex: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g }
        ]
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DetectorCatalog;
} else {
    window.DetectorCatalog = DetectorCatalog;
}
