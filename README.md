# 📚 The Deadline Department

All's fair in love and deadlines.

A Chrome Extension (Manifest V3) for tracking assignment deadlines from the University of Transport Moodle (courses.ut.edu.vn).

## Features

✅ **Automatic Session Detection** - Uses script injection to retrieve your Moodle session key  
✅ **Offline-First Architecture** - Stale-While-Revalidate caching strategy  
✅ **Smart Color Coding**:
  - Red: Due in less than 24 hours
  - Yellow: Due in less than 3 days
  - Green: More than 3 days remaining
✅ **Google Calendar Integration** - One-click export to Google Calendar  
✅ **Modern Dark Mode UI** - Sleek, minimal design  
✅ **Direct Assignment Links** - Click any deadline to open it in Moodle

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the folder containing the extension files
5. The extension should now appear in your toolbar

### 2. Usage

1. Navigate to [courses.ut.edu.vn](https://courses.ut.edu.vn) and log in
2. Click the extension icon in your toolbar
3. The extension will automatically fetch your upcoming deadlines
4. Click on any assignment to open it in a new tab
5. Click the "📅 Calendar" button to add it to Google Calendar

## File Structure

```
The-Deadline-Department/
├── manifest.json      # Extension configuration (Manifest V3)
├── popup.html         # Extension popup interface
├── popup.css          # Dark mode styling
├── popup.js           # Core functionality & API integration
├── icon16.png         # Small icon
├── icon48.png         # Medium icon
├── icon128.png        # Large icon
└── README.md          # This file
```

## Technical Details

### Authentication
- Uses `chrome.scripting.executeScript` to access `M.cfg.sesskey` from the Moodle page context
- No password storage - leverages existing browser session

### Data Fetching
- Calls Moodle's internal API: `core_calendar_get_action_events_by_timesort`
- Fetches deadlines for the next 6 months (up to 50 items)

### Caching Strategy
- **Stale-While-Revalidate**: Shows cached data immediately, then updates in background
- Uses `chrome.storage.local` for persistent offline access
- Graceful degradation on network errors

### Permissions
- `storage` - For caching deadlines
- `scripting` - For retrieving session key
- `activeTab` - For checking current tab URL
- `host_permissions` - Only for courses.ut.edu.vn

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Any Chromium-based browser with Manifest V3 support

## Privacy

This extension:
- Does NOT collect or transmit any personal data
- Only communicates with courses.ut.edu.vn
- Stores deadline data locally on your device
- Does not track user behavior

## Troubleshooting

### "Please Login to Moodle" appears when logged in
- Refresh the Moodle page and try again
- Clear browser cache for courses.ut.edu.vn
- Check if you're on the correct domain

### No deadlines showing
- Ensure you're enrolled in courses with upcoming assignments
- Check that the time range hasn't exceeded 6 months
- Try clicking the refresh button

## Development

Built with:
- Vanilla JavaScript (ES6+)
- Chrome Extension API (Manifest V3)
- Modern CSS (CSS Variables, Flexbox)

No external dependencies or frameworks required.

## License

MIT License - Feel free to modify and distribute.

## Credits

Developed for the Ho Chi Minh City University of Transport (UTH) students to better manage their Moodle deadlines.

---

**Note:** This is an unofficial extension and is not affiliated with or endorsed by the Ho Chi Minh City University of Transport.
