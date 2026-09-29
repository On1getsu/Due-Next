# Due Next

A simple assignment tracker you can install on your phone like an app. It sorts your assignments by how soon they're due, flags anything overdue in red, and can add each assignment to your phone's calendar so you get alerts even when the app is closed.

## Features

- **Sorted by urgency:** Overdue → Due today → Tomorrow → Next 7 days → Later → Done
- **Countdowns** on every assignment ("in 14 hrs", "2 days late")
- **Calendar alerts:** tap **+ Calendar** (or tick the box when adding) to get phone alerts 1 day and 3 hours before it's due
- **Reminders** when you open the app for anything due within 24 hours, plus a number badge on the app icon (where the phone supports it)
- **Filter by class**
- **Works offline** after the first load
- **Backup and restore** your list as a file from Settings

Your assignments are saved on your device only. Nothing is sent to a server.

## Put it online with GitHub Pages (free)

1. Sign in at [github.com](https://github.com) (make a free account if you don't have one).
2. Click **+** (top right) → **New repository**. Name it `due-next`, leave it **Public**, and click **Create repository**.
3. On the new repo page, click **uploading an existing file**. Drag in **everything inside this folder**, including the `icons` folder, then click **Commit changes**.
4. Go to **Settings** → **Pages**. Under **Branch**, pick `main` and `/ (root)`, then click **Save**.
5. Wait about a minute and refresh. The page shows your app's address, something like `https://YOUR-USERNAME.github.io/due-next/`.

## Install it on your phone

- **iPhone:** Open the link in **Safari** → tap **Share** → **Add to Home Screen**. Always open Due Next from the home screen icon. On iPhone, notifications only work that way.
- **Android:** Open the link in **Chrome** → tap **⋮** → **Install app** (or **Add to Home screen**).

Then open **Settings** in the app and tap **Turn on** under Reminders.

## Tips so you don't miss things

- Add an assignment **the moment it's given**, even small ones.
- Tick "Also add to my phone's calendar" for anything worth points. Calendar alerts are the ones that reach you when the app is closed.
- Open the app once a day and do what's in **Overdue** and **Due today** first.
- Tap **Save backup** in Settings every couple of weeks. If you clear your browser data or switch phones, **Restore** brings your list back.

## Making changes

Edit the files and upload them again. After any change, open `sw.js` and bump `VERSION` (for example `due-next-v2`) so phones load the new version instead of the saved copy.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page layout |
| `style.css` | Colors and styling (light and dark mode) |
| `app.js` | Everything the app does |
| `manifest.webmanifest` | App name and icon for installing |
| `sw.js` | Offline support and notification taps |
| `icons/` | App icons |
