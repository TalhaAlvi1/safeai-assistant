// Load stats from storage
function loadStats() {
  chrome.storage.local.get(['stats', 'recentActivity'], (result) => {
    const stats = result.stats || {
      totalChecks: 0,
      safeChecks: 0,
      warnings: 0,
      blocks: 0
    };

    document.getElementById('total-checks').textContent = stats.totalChecks || 0;
    document.getElementById('safe-checks').textContent = stats.safeChecks || 0;
    document.getElementById('warnings').textContent = stats.warnings || 0;
    document.getElementById('blocks').textContent = stats.blocks || 0;

    // Load recent activity
    const activity = result.recentActivity || [];
    displayActivity(activity);
  });
}

// Display activity
function displayActivity(activities) {
  const activityList = document.getElementById('activity-list');

  if (activities.length === 0) {
    activityList.innerHTML = `<div style="text-align: center; padding: 40px; color: #999;">${window.i18n.t('noActivityMessage')}</div>`;
    return;
  }


  activityList.innerHTML = activities.slice(0, 10).map(item => {
    const iconMap = {
      'EMAIL': '📧',
      'PHONE': '📞',
      'SSN': '🔒',
      'CREDIT_CARD': '💳',
      'DEFAULT': '📄'
    };
    const icon = iconMap[item.type] || iconMap.DEFAULT;

    const badgeClass = item.risk === 'HIGH' ? 'badge-high' :
      item.risk === 'MEDIUM' ? 'badge-medium' : 'badge-low';

    return `
      <div class="activity-item">
        <div class="activity-icon ${item.risk === 'HIGH' ? 'red' : item.risk === 'MEDIUM' ? 'orange' : 'green'}">${icon}</div>
        <div class="activity-content">
          <div class="activity-title">${item.title}</div>
          <div class="activity-time">${item.time}</div>
        </div>
        <div class="activity-badge ${badgeClass}">${item.risk}</div>
      </div>
    `;
  }).join('');
}

// Wait for DOM to be loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function () {
  // Attach event listener to refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadStats);
  }

  // Auto-refresh every 5 seconds
  setInterval(loadStats, 5000);

  // Initial load
  loadStats();

  // Listen for storage changes (real-time updates)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.stats || changes.recentActivity)) {
      loadStats();
      // Flash live badge
      const badge = document.getElementById('live-badge');
      if (badge) {
        badge.style.background = '#ff5722';
        setTimeout(() => {
          badge.style.background = '#4caf50';
        }, 500);
      }
    }
  });
});