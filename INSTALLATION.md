# 🚀 Quick Installation Guide

## Step 1: Load Extension in Chrome (1 minute)

1. Open Chrome and go to: **`chrome://extensions/`**
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"** button
4. Select the folder containing all extension files
5. ✅ Done! The extension icon should appear in your toolbar

## Step 2: Use the Extension

1. Go to **[courses.ut.edu.vn](https://courses.ut.edu.vn)** and log in
2. Click the extension icon in your Chrome toolbar
3. Your upcoming deadlines will appear automatically!

---

## Folder Structure Checklist

Make sure your folder contains these files:

```
✅ manifest.json
✅ popup.html
✅ popup.css
✅ popup.js
✅ icon16.png
✅ icon48.png
✅ icon128.png
```

---

## Troubleshooting

### Extension won't load
- **Check:** All files are in the same folder
- **Check:** All three icon files are present
- **Fix:** Make sure you selected the folder, not a file

### "Please Login" appears
- **Check:** You're on courses.ut.edu.vn
- **Check:** You're logged into Moodle
- **Fix:** Refresh the Moodle page and try again

### No deadlines showing
- **Check:** You have upcoming assignments (within 6 months)
- **Check:** Internet connection is working
- **Fix:** Click the refresh button in the extension

### Extension disappeared after Chrome restart
- **Info:** This is normal for unpacked extensions in Developer Mode
- **Fix:** Go to `chrome://extensions/` and click the refresh button on the extension card

---

## Need Help?

1. Open Chrome DevTools Console:
   - Go to `chrome://extensions/`
   - Find "The Deadline Department"
   - Click "Inspect views: popup"
   - Check Console tab for error messages

2. Common fixes:
   - Clear browser cache
   - Re-login to Moodle
   - Reload the extension

---

**Enjoy tracking your deadlines! 📚✨**

