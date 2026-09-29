# Due Next

A simple assignment tracker you can install on your phone like an app and also use on your computer. It sorts your assignments by how soon they're due, flags anything overdue in red, and can add each assignment to your phone's calendar so you get alerts even when the app is closed. Sign in on each device and your list stays the same everywhere.

## Features

- **Sorted by urgency:** Overdue → Due today → Tomorrow → Next 7 days → Later → Done
- **Countdowns** on every assignment ("in 14 hrs", "2 days late")
- **Sync between phone and computer** with an email and password sign-in (after the one-time setup below)
- **Calendar alerts:** tap **+ Calendar** (or tick the box when adding) to get phone alerts 1 day and 3 hours before it's due
- **Reminders** when you open the app for anything due within 24 hours, plus a number badge on the app icon (where the phone supports it)
- **Filter by class**
- **Works offline.** Changes you make offline sync when you're back online.
- **Backup and restore** your list as a file from Settings

## Step 1: Put it online with GitHub Pages (free)

1. Sign in at [github.com](https://github.com) (make a free account if you don't have one).
2. Click **+** (top right) → **New repository**. Name it `due-next`, leave it **Public**, and click **Create repository**.
3. On the new repo page, click **uploading an existing file**. Drag in **everything inside this folder**, including the `icons` folder, then click **Commit changes**.
4. Go to **Settings** → **Pages**. Under **Branch**, pick `main` and `/ (root)`, then click **Save**.
5. Wait about a minute and refresh. The page shows your app's address, something like `https://YOUR-USERNAME.github.io/due-next/`.

The app works now, but each device keeps its own list until you finish Step 2.

## Step 2: Turn on syncing (about 10 minutes, free)

Syncing uses Firebase, Google's free app database. You don't need a credit card.

**Create the project**
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Create a project** (or **Add project**). Name it `due-next`. You can turn off Google Analytics. Click **Create**.

**Turn on sign-in**
3. In the left menu, open **Security → Authentication** (on older layouts, **Build → Authentication**) and click **Get started**.
4. On the **Sign-in method** tab, click **Email/Password**, turn on the first switch (leave *Email link* off), and click **Save**.
5. Go to the **Settings** tab → **Authorized domains** → **Add domain**. Type `YOUR-USERNAME.github.io` (your GitHub Pages address without `https://` or `/due-next`), then **Add**.

**Create the database**
6. In the left menu, open **Firestore Database** (under **Databases & Storage**, or **Build** on older layouts) and click **Create database**.
7. Pick a location near you (for Japan, `asia-northeast1 (Tokyo)`), choose **Start in production mode**, and click **Create**.
8. Open the **Rules** tab. Delete everything there, paste in the contents of `firestore.rules` from this folder, and click **Publish**. These rules make sure only you can see your assignments.

**Connect the app**
9. Click the **gear icon** next to *Project Overview* → **Project settings**. Under **Your apps**, click the **web icon `</>`**. Name it `Due Next` (leave Firebase Hosting unticked) and click **Register app**.
10. You'll see a block of code containing `const firebaseConfig = { apiKey: ..., ... };`. Copy just the part from `{` to `}`.
11. On GitHub, open `config.js` in your repo and click the **pencil icon** to edit. Replace `null` in the last line with what you copied, so it reads:
    ```js
    export const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "due-next-xxxxx.firebaseapp.com",
      projectId: "due-next-xxxxx",
      storageBucket: "due-next-xxxxx.firebasestorage.app",
      messagingSenderId: "...",
      appId: "..."
    };
    ```
    Click **Commit changes**.

**Sign in**
12. Wait a minute, then open your app on your computer. Tap **Settings**, type your email and a password, and tap **Create account**. On your phone, tap **Sign in** with the same email and password. The top of the app will say **Synced**.

The `apiKey` in `config.js` is safe to be public. It only identifies your Firebase project; the rules from step 8 are what keep your data private.

If you had assignments on a device before signing in, they're added to your account the first time you sign in there.

## Step 3: Install it on your phone

- **iPhone:** Open the link in **Safari** → tap **Share** → **Add to Home Screen**. Always open Due Next from the home screen icon. On iPhone, notifications only work that way.
- **Android:** Open the link in **Chrome** → tap **⋮** → **Install app** (or **Add to Home screen**).

Then open **Settings** in the app and tap **Turn on** under Reminders.

The first time, tap **Create account** with your email and a password (6+ characters). On every other device, use **Sign in** with the same email and password so they share one list.

## Tips so you don't miss things

- Add an assignment **the moment it's given**, even small ones. With sync on, you can add it on whichever device is in front of you.
- Tick "Also add to my phone's calendar" for anything worth points. Calendar alerts are the ones that reach you when the app is closed.
- Open the app once a day and do what's in **Overdue** and **Due today** first.

## If something isn't working

- **"This website isn't allowed to sign in yet"** → redo step 5 with your exact `github.io` address.
- **"This sign-in method isn't turned on"** → redo step 4.
- **Forgot your password?** → type your email in Settings and tap **Forgot password?** for a reset email.
- **"Firebase refused access"** → redo step 8 and make sure you clicked **Publish**.
- **The top says "This device only"** → you're signed out, or `config.js` still says `null`.
- **Your phone shows an old version** → close the app completely and open it again. It updates on the next launch.

## Making changes

Edit the files and upload them again. After any change, open `sw.js` and bump `VERSION` (for example `due-next-v3`) so phones load the new version instead of the saved copy.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page layout |
| `style.css` | Colors and styling (light and dark mode) |
| `app.js` | Everything the app does |
| `config.js` | Your Firebase settings (you fill this in for syncing) |
| `cloud.js` | Sign-in and syncing with Firebase |
| `firestore.rules` | Privacy rules to paste into Firebase |
| `firebase.json`, `.firebaserc` | Link this folder to your `due-next` Firebase project (used by Firebase tools to publish the rules) |
| `manifest.webmanifest` | App name and icon for installing |
| `sw.js` | Offline support and notification taps |
| `icons/` | App icons |
