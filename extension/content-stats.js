// Quick fix for inline alerts - Add to end of content.js

// Update stats for real-time dashboard
function updateStats(riskLevel, findings) {
    chrome.storage.local.get(['stats', 'recentActivity'], (result) => {
        const stats = result.stats || {
            totalChecks: 0,
            safeChecks: 0,
            warnings: 0,
            blocks: 0
        };

        stats.totalChecks++;
        if (riskLevel === 'LOW') stats.safeChecks++;
        else if (riskLevel === 'MEDIUM') stats.warnings++;
        else if (riskLevel === 'HIGH') stats.blocks++;

        const activity = result.recentActivity || [];
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const types = [...new Set(findings.map(f => f.type))];
        activity.unshift({
            title: `${types.join(', ')} detected`,
            time: timeStr,
            risk: riskLevel,
            type: types[0] || 'DEFAULT'
        });

        // Keep only last 50 items
        if (activity.length > 50) activity.length = 50;

        chrome.storage.local.set({ stats, recentActivity: activity });
    });
}

// MANUAL FIX: Change line 118 in content.js from:
// if (policySettings.explainabilityEnabled && findings.length > 0) {
// TO:
// if (findings.length > 0) {

console.log('SafeAI: Stats tracking enabled. Dashboard will show real-time updates.');
