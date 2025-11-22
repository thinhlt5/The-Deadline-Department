// Constants
const MOODLE_BASE_URL = 'https://courses.ut.edu.vn';
const CACHE_KEY = 'uth_deadlines_cache';
const LAST_UPDATED_KEY = 'uth_last_updated';
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// DOM Elements
const elements = {
  loadingState: document.getElementById('loadingState'),
  loginPrompt: document.getElementById('loginPrompt'),
  deadlinesList: document.getElementById('deadlinesList'),
  emptyState: document.getElementById('emptyState'),
  statusBanner: document.getElementById('statusBanner'),
  loginBtn: document.getElementById('loginBtn'),
  retryBtn: document.getElementById('retryBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  lastUpdated: document.getElementById('lastUpdated'),
  loginMessage: document.getElementById('loginMessage')
};

// State
let currentDeadlines = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeExtension();
  setupEventListeners();
});

function setupEventListeners() {
  elements.loginBtn.addEventListener('click', openMoodleLogin);
  elements.retryBtn.addEventListener('click', () => {
    showView('loading');
    initializeExtension();
  });
  elements.refreshBtn.addEventListener('click', () => fetchDeadlines(true));
}

async function initializeExtension() {
  showView('loading');
  
  // Check if user is on Moodle site
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || !tab.url.startsWith(MOODLE_BASE_URL)) {
    // Not on Moodle - try to load cached data anyway
    const cachedData = await loadCachedData();
    if (cachedData && cachedData.length > 0) {
      displayDeadlines(cachedData, true);
      showStatusBanner('<i class="fas fa-exclamation-triangle"></i> Showing cached data. Open Moodle to refresh.', 'warning');
    } else {
      showView('login');
    }
    return;
  }
  
  // Load cached data first (Stale-While-Revalidate)
  const cachedData = await loadCachedData();
  if (cachedData && cachedData.length > 0) {
    displayDeadlines(cachedData, false);
  }
  
  // Then fetch fresh data
  await fetchDeadlines(false);
}

async function loadCachedData() {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY, LAST_UPDATED_KEY]);
    if (result[CACHE_KEY]) {
      updateLastUpdatedText(result[LAST_UPDATED_KEY]);
      return result[CACHE_KEY];
    }
  } catch (error) {
    console.error('Error loading cached data:', error);
  }
  return null;
}

async function fetchDeadlines(isManualRefresh = false) {
  try {
    if (isManualRefresh) {
      elements.refreshBtn.classList.add('spinning');
    }
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.startsWith(MOODLE_BASE_URL)) {
      showView('login');
      return;
    }
    
    // Inject script to get sesskey - IMPORTANT: world: 'MAIN' to access page's M.cfg
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN', // Manifest V3: Run in page context to access M.cfg
        func: () => {
          // Access M.cfg.sesskey in the page context
          if (typeof M !== 'undefined' && M.cfg && M.cfg.sesskey) {
            return { 
              sesskey: M.cfg.sesskey, 
              wwwroot: M.cfg.wwwroot,
              method: 'M.cfg.sesskey' 
            };
          }
          
          return { 
            sesskey: null, 
            method: 'none', 
            debug: {
              hasM: typeof M !== 'undefined',
              hasMcfg: typeof M !== 'undefined' && typeof M.cfg !== 'undefined',
              hasSesskey: typeof M !== 'undefined' && M.cfg && typeof M.cfg.sesskey !== 'undefined',
              pageReady: document.readyState,
              url: window.location.href
            }
          };
        }
      });
    } catch (scriptError) {
      console.error('Script injection error:', scriptError);
      // Script injection failed - might be a permissions issue
      const cachedData = await loadCachedData();
      if (cachedData && cachedData.length > 0) {
        displayDeadlines(cachedData, false);
        showStatusBanner('<i class="fas fa-exclamation-triangle"></i> Cannot inject script. Showing cached data. Please reload extension.', 'warning');
      } else {
        showView('login');
        if (elements.loginMessage) {
          elements.loginMessage.textContent = 'Cannot access Moodle page. Please reload the extension and try again.';
        }
      }
      return;
    }
    
    const result = results[0]?.result;
    const sesskey = result?.sesskey;
    
    if (!sesskey) {
      console.error('Could not find sesskey. Debug info:', result?.debug);
      // Try to show cached data if available
      const cachedData = await loadCachedData();
      if (cachedData && cachedData.length > 0) {
        displayDeadlines(cachedData, false);
        showStatusBanner('<i class="fas fa-exclamation-triangle"></i> Cannot access session. Showing cached data. Please refresh the Moodle page and try again.', 'warning');
      } else {
        showView('login');
        if (elements.loginMessage) {
          elements.loginMessage.textContent = 'Cannot access Moodle session. Please make sure you are logged in and refresh the Moodle page, then click Retry.';
        }
        showStatusBanner('<i class="fas fa-exclamation-triangle"></i> Session not found. Please refresh the Moodle page and try again.', 'warning');
      }
      return;
    }
    
    console.log('Found sesskey using method:', result.method);
    
    // Fetch deadlines from Moodle API
    const deadlines = await fetchDeadlinesFromAPI(sesskey);
    
    // Cache the data
    await cacheDeadlines(deadlines);
    
    // Display the data
    displayDeadlines(deadlines, false);
    
    if (isManualRefresh) {
      showStatusBanner('<i class="fas fa-check"></i> Deadlines refreshed successfully', 'success');
      setTimeout(() => hideStatusBanner(), 3000);
    }
    
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    
    // Try to show cached data on error
    const cachedData = await loadCachedData();
    if (cachedData && cachedData.length > 0) {
      displayDeadlines(cachedData, false);
      showStatusBanner('<i class="fas fa-exclamation-triangle"></i> Network error. Showing cached data.', 'warning');
    } else {
      showView('login');
      showStatusBanner(`<i class="fas fa-exclamation-triangle"></i> Error: ${error.message}. Please check console for details.`, 'warning');
    }
  } finally {
    if (isManualRefresh) {
      elements.refreshBtn.classList.remove('spinning');
    }
  }
}

async function fetchDeadlinesFromAPI(sesskey) {
  // Time calculation - exactly like the working console code
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const sixMonthsLater = now + (60 * 60 * 24 * 180); // Add 180 days (6 months)
  
  const url = `${MOODLE_BASE_URL}/lib/ajax/service.php?sesskey=${sesskey}&info=core_calendar_get_action_events_by_timesort`;
  
  // Payload - exactly like the working console code
  const payload = [{
    index: 0,
    methodname: 'core_calendar_get_action_events_by_timesort',
    args: {
      timesortfrom: now,           // Start from now
      timesortto: sixMonthsLater,   // End after 6 months
      limitnum: 50                  // Max 50 deadlines
    }
  }];
  
  console.log('🚀 Fetching deadlines from Moodle API...');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Check for errors in response
  if (data[0]?.error) {
    console.error('❌ API Error:', data[0].error);
    throw new Error(data[0].error.message || 'API Error');
  }
  
  // Parse events
  const events = data[0]?.data?.events || [];
  
  console.log(`✅ Found ${events.length} deadlines!`);
  
  // Transform to our format and sort by time
  return events.map(event => ({
    id: event.id,
    name: event.name,
    courseName: event.course?.fullname || 'Unknown Course',
    dueDate: event.timesort * 1000, // Convert to milliseconds
    url: event.url || `${MOODLE_BASE_URL}/mod/assign/view.php?id=${event.instance}`,
    description: event.description || ''
  })).sort((a, b) => a.dueDate - b.dueDate);
}

async function cacheDeadlines(deadlines) {
  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: deadlines,
      [LAST_UPDATED_KEY]: Date.now()
    });
  } catch (error) {
    console.error('Error caching deadlines:', error);
  }
}

function displayDeadlines(deadlines, isCached = false) {
  currentDeadlines = deadlines;
  
  if (!deadlines || deadlines.length === 0) {
    showView('empty');
    return;
  }
  
  showView('deadlines');
  
  elements.deadlinesList.innerHTML = deadlines.map(deadline => 
    createDeadlineItemHTML(deadline)
  ).join('');
  
  // Add click listeners
  document.querySelectorAll('.deadline-item').forEach((item, index) => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking calendar button
      if (e.target.closest('.calendar-btn')) {
        return;
      }
      chrome.tabs.create({ url: deadlines[index].url });
    });
  });
  
  // Update last updated text
  chrome.storage.local.get(LAST_UPDATED_KEY, (result) => {
    updateLastUpdatedText(result[LAST_UPDATED_KEY]);
  });
}

function createDeadlineItemHTML(deadline) {
  const urgency = getUrgency(deadline.dueDate);
  const dueDateText = formatDueDate(deadline.dueDate);
  const calendarUrl = generateCalendarUrl(deadline);
  
  return `
    <div class="deadline-item" data-id="${deadline.id}">
      <div class="deadline-header">
        <div class="deadline-icon ${urgency}">
          <i class="fas fa-circle"></i>
        </div>
        <div class="deadline-content">
          <div class="course-name">${escapeHtml(deadline.courseName)}</div>
          <div class="assignment-name">${escapeHtml(deadline.name)}</div>
        </div>
      </div>
      <div class="deadline-footer">
        <div class="due-date ${urgency}">
          <i class="fas fa-calendar-alt"></i>
          ${dueDateText}
        </div>
        <div class="actions">
          <a href="${calendarUrl}" target="_blank" class="calendar-btn" title="Add to Google Calendar">
            <i class="fas fa-calendar"></i> Calendar
          </a>
        </div>
      </div>
    </div>
  `;
}

function getUrgency(dueDate) {
  const now = Date.now();
  const diff = dueDate - now;
  const hoursLeft = diff / (1000 * 60 * 60);
  
  if (hoursLeft < 24) return 'urgent';
  if (hoursLeft < 72) return 'warning';
  return 'safe';
}

function formatDueDate(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 0) return 'Overdue';
  if (minutes < 60) return `${minutes}m left`;
  if (hours < 24) return `${hours}h left`;
  if (days < 7) return `${days}d left`;
  
  const date = new Date(timestamp);
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}

function generateCalendarUrl(deadline) {
  const startDate = new Date(deadline.dueDate);
  const endDate = new Date(deadline.dueDate + 60 * 60 * 1000); // 1 hour duration
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${deadline.courseName}: ${deadline.name}`,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: `Assignment: ${deadline.name}\nCourse: ${deadline.courseName}\n\nSubmit at: ${deadline.url}`,
    location: `Assignment: ${deadline.name} - ${deadline.courseName}`,
    trp: 'false'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function updateLastUpdatedText(timestamp) {
  if (!timestamp) {
    elements.lastUpdated.textContent = '';
    return;
  }
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  
  let text = '';
  if (minutes < 1) text = 'Updated just now';
  else if (minutes < 60) text = `Updated ${minutes}m ago`;
  else if (minutes < 1440) text = `Updated ${Math.floor(minutes / 60)}h ago`;
  else text = `Updated on ${date.toLocaleDateString()}`;
  
  elements.lastUpdated.textContent = text;
}

function showView(viewName) {
  // Hide all views
  elements.loadingState.classList.add('hidden');
  elements.loginPrompt.classList.add('hidden');
  elements.deadlinesList.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  
  // Show requested view
  switch (viewName) {
    case 'loading':
      elements.loadingState.classList.remove('hidden');
      break;
    case 'login':
      elements.loginPrompt.classList.remove('hidden');
      break;
    case 'deadlines':
      elements.deadlinesList.classList.remove('hidden');
      break;
    case 'empty':
      elements.emptyState.classList.remove('hidden');
      break;
  }
}

function showStatusBanner(message, type = 'warning') {
  elements.statusBanner.innerHTML = message;
  elements.statusBanner.className = `status-banner ${type}`;
  elements.statusBanner.classList.remove('hidden');
}

function hideStatusBanner() {
  elements.statusBanner.classList.add('hidden');
}

function openMoodleLogin() {
  chrome.tabs.create({ url: `${MOODLE_BASE_URL}/login/index.php` });
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

