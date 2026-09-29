(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const DAY = 86400000;
  const STORE = "due-next-items";
  const NOTIFIED = "due-next-notified";
  let items = load();
  let filter = "All";
  let confirmId = null;
  let cloud = null;           // set once sync is configured
  let friendlyErr = (e) => (e && e.message) || "Something went wrong.";
  let mergeOnSignIn = false;  // upload this device's list only after a deliberate sign-in

  // ---------- storage (on this device) ----------
  function load() {
    try { const v = JSON.parse(localStorage.getItem(STORE) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(items)); } catch (e) {}
    render();
  }
  // When signed in, every change is also sent to the cloud. Firebase queues it
  // while offline and sends it when the connection comes back.
  function cloudDo(fn) {
    if (!cloud || !cloud.user) return;
    fn().catch((err) => showAcctMsg(friendlyErr(err)));
  }
  function upsert(item) {
    const i = items.findIndex((x) => x.id === item.id);
    if (i < 0) items.push(item); else items[i] = item;
    persist();
    cloudDo(() => cloud.save(item));
  }
  function removeItem(id) { items = items.filter((x) => x.id !== id); persist(); cloudDo(() => cloud.remove(id)); }
  function newId() { return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- dates ----------
  function parseDue(s) {
    const [d, t = "23:59"] = s.split("T");
    const [y, m, dd] = d.split("-").map(Number);
    const [h, mi] = t.split(":").map(Number);
    return new Date(y, m - 1, dd, h, mi);
  }
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = (due, now) => Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

  function countdown(due, now) {
    const ms = due - now, abs = Math.abs(ms);
    const d = Math.floor(abs / DAY), h = Math.floor(abs / 3600000), m = Math.floor(abs / 60000);
    const txt = d >= 2 ? d + " days" : h >= 1 ? h + " hr" + (h === 1 ? "" : "s") : m + " min";
    return ms < 0 ? txt + " late" : "in " + txt;
  }
  function bucket(it, now) {
    if (it.done) return "done";
    const due = parseDue(it.due);
    if (due < now) return "late";
    const dd = dayDiff(due, now);
    if (dd === 0) return "today";
    if (dd === 1) return "tomorrow";
    if (dd <= 7) return "week";
    return "later";
  }
  const GROUPS = [
    ["late", "Overdue — do these first"], ["today", "Due today"], ["tomorrow", "Due tomorrow"],
    ["week", "Next 7 days"], ["later", "Later"], ["done", "Done"],
  ];

  // ---------- render ----------
  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function render() {
    const now = new Date();
    $("#today").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
    const courses = [...new Set(items.map((i) => i.course).filter(Boolean))].sort();
    if (filter !== "All" && !courses.includes(filter)) filter = "All";

    $("#filters").innerHTML = courses.length
      ? ["All", ...courses].map((c) => `<button type="button" class="chipbtn" aria-pressed="${c === filter}" data-f="${esc(c)}">${esc(c)}</button>`).join("")
      : "";
    $("#courses").innerHTML = courses.map((c) => `<option value="${esc(c)}">`).join("");

    let late = 0, soon = 0, open = 0;
    for (const it of items) {
      if (it.done) continue;
      open++;
      const due = parseDue(it.due);
      if (due < now) late++; else if (due - now <= 2 * DAY) soon++;
    }
    $("#s-late").textContent = late; $("#s-soon").textContent = soon; $("#s-open").textContent = open;
    updateBadge(late + soon);

    const shown = items.filter((i) => filter === "All" || i.course === filter);
    const list = $("#list");
    if (!shown.length) {
      list.innerHTML = `<div class="empty">No assignments yet. Add the next thing you have due above — even small ones count.</div>`;
      return;
    }
    const by = {};
    for (const it of shown) (by[bucket(it, now)] = by[bucket(it, now)] || []).push(it);
    let html = "";
    for (const [key, label] of GROUPS) {
      const arr = by[key];
      if (!arr) continue;
      arr.sort((a, b) => key === "done" ? (b.doneAt || 0) - (a.doneAt || 0) : parseDue(a.due) - parseDue(b.due));
      html += `<section class="group g-${key}"><h2>${label} <span class="n">${arr.length}</span></h2><ul>`;
      for (const it of arr) {
        const due = parseDue(it.due);
        const isLate = !it.done && due < now;
        const pillCls = it.done ? "ok" : isLate ? "late" : due - now <= 2 * DAY ? "soon" : "ok";
        const pillTxt = it.done ? "done" : countdown(due, now);
        const actions = confirmId === it.id
          ? `<div class="confirm"><button type="button" class="yes" data-act="yes" data-id="${it.id}">Delete</button><button type="button" data-act="no">Keep</button></div>`
          : `<div class="actions">${it.done ? "" : `<button type="button" class="link" data-act="cal" data-id="${it.id}">+ Calendar</button>`}<button type="button" class="link del" data-act="del" data-id="${it.id}">Delete</button></div>`;
        html += `<li class="item${isLate ? " is-late" : ""}${it.done ? " is-done" : ""}">
          <button type="button" class="check" data-act="toggle" data-id="${it.id}" aria-label="${it.done ? "Mark not done" : "Mark done"}: ${esc(it.title)}">${it.done ? "✓" : ""}</button>
          <div class="body">
            <span class="title">${esc(it.title)}</span>
            <div class="meta">
              ${it.course ? `<span class="course">${esc(it.course)}</span>` : ""}
              <span class="mono">${fmtDay.format(due)} · ${fmtTime.format(due)}</span>
              <span class="pill ${pillCls}">${pillTxt}</span>
            </div>
          </div>
          ${actions}
        </li>`;
      }
      html += `</ul></section>`;
    }
    list.innerHTML = html;
  }

  // ---------- calendar (.ics) — reliable alerts even when the app is closed ----------
  function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function icsTime(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00"; }
  function addToCalendar(it) {
    const due = parseDue(it.due);
    const start = new Date(due.getTime() - 15 * 60000);
    const stamp = new Date();
    const utc = stamp.getUTCFullYear() + pad(stamp.getUTCMonth() + 1) + pad(stamp.getUTCDate()) + "T" + pad(stamp.getUTCHours()) + pad(stamp.getUTCMinutes()) + "00Z";
    const summary = "Due: " + it.title + (it.course ? " (" + it.course + ")" : "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Due Next//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + it.id + "@due-next",
      "DTSTAMP:" + utc,
      "DTSTART:" + icsTime(start),
      "DTEND:" + icsTime(due),
      "SUMMARY:" + icsEscape(summary),
      "DESCRIPTION:" + icsEscape("Assignment due " + fmtDay.format(due) + " at " + fmtTime.format(due)),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape(summary + " — due tomorrow"), "TRIGGER:-P1D", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape(summary + " — due in 3 hours"), "TRIGGER:-PT3H", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR", "",
    ].join("\r\n");
    const file = (it.title.replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "assignment") + ".ics";
    downloadFile(file, ics, "text/calendar");
  }
  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type: type + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ---------- notifications + app badge (while the app is open) ----------
  function notifSupported() { return "Notification" in window && "serviceWorker" in navigator; }
  function updateNotifUI() {
    const btn = $("#notif-btn"), st = $("#notif-status");
    if (!notifSupported()) {
      btn.hidden = true;
      st.textContent = "This browser can't show notifications. On iPhone, add Due Next to your Home Screen first, then open it from there. Calendar alerts work everywhere.";
      return;
    }
    if (Notification.permission === "granted") { btn.hidden = true; st.textContent = "On. You'll be notified about anything due within 24 hours when you open the app. For alerts while it's closed, use + Calendar."; }
    else if (Notification.permission === "denied") { btn.hidden = true; st.textContent = "Notifications are blocked. Turn them on for this app in your phone's settings."; }
    else { btn.hidden = false; }
  }
  async function checkReminders() {
    if (!notifSupported() || Notification.permission !== "granted") return;
    let done = {};
    try { done = JSON.parse(localStorage.getItem(NOTIFIED) || "{}"); } catch (e) {}
    const now = new Date();
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    for (const it of items) {
      if (it.done) continue;
      const due = parseDue(it.due);
      const left = due - now;
      const stage = left < 0 ? "late" : left <= 3 * 3600000 ? "3h" : left <= DAY ? "24h" : null;
      if (!stage || done[it.id + ":" + stage]) continue;
      done[it.id + ":" + stage] = 1;
      const body = (it.course ? it.course + " · " : "") + (stage === "late" ? "Overdue — " : "Due ") + countdown(due, now).replace(" late", " ago");
      const opts = { body, tag: it.id, icon: "icons/icon-192.png", badge: "icons/icon-192.png" };
      try { reg ? await reg.showNotification(it.title, opts) : new Notification(it.title, opts); } catch (e) {}
    }
    try { localStorage.setItem(NOTIFIED, JSON.stringify(done)); } catch (e) {}
  }
  function updateBadge(n) {
    try {
      if (!("setAppBadge" in navigator)) return;
      n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge();
    } catch (e) {}
  }

  // ---------- form ----------
  const fDate = $("#f-date");
  fDate.value = ymd(new Date(Date.now() + DAY));
  document.querySelectorAll("[data-days]").forEach((b) => b.addEventListener("click", () => {
    fDate.value = ymd(new Date(Date.now() + Number(b.dataset.days) * DAY));
  }));
  $("#add").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#f-title").value.trim();
    const err = $("#f-err");
    if (!title || !fDate.value) { err.textContent = "Add a name and a due date."; err.hidden = false; return; }
    err.hidden = true;
    const item = { id: newId(), title, course: $("#f-course").value.trim(), due: fDate.value + "T" + ($("#f-time").value || "23:59"), done: false, createdAt: Date.now() };
    upsert(item);
    if ($("#f-cal").checked) addToCalendar(item);
    $("#f-title").value = "";
    toast("Added " + title + ".", false);
    checkReminders();
  });

  // ---------- list actions ----------
  let toastTimer, lastDeleted = null;
  function toast(msg, withUndo) {
    $("#toast-msg").textContent = msg;
    $("#toast-undo").hidden = !withUndo;
    $("#toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("#toast").hidden = true; lastDeleted = null; }, 6000);
  }
  $("#toast-undo").addEventListener("click", () => {
    if (lastDeleted) { upsert(lastDeleted); lastDeleted = null; }
    $("#toast").hidden = true;
  });
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    filter = b.dataset.f; render();
  });
  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const it = items.find((x) => x.id === b.dataset.id);
    switch (b.dataset.act) {
      case "toggle":
        if (!it) return;
        upsert({ ...it, done: !it.done, doneAt: !it.done ? Date.now() : null });
        if (!it.done) toast("Nice — " + it.title + " is done.", false);
        break;
      case "cal": if (it) addToCalendar(it); break;
      case "del": confirmId = b.dataset.id; render(); break;
      case "no": confirmId = null; render(); break;
      case "yes":
        if (!it) return;
        confirmId = null; lastDeleted = { ...it }; removeItem(it.id);
        toast("Deleted " + it.title + ".", true);
        break;
    }
  });

  // ---------- settings menu ----------
  $("#menu-btn").addEventListener("click", () => {
    const m = $("#menu"); m.hidden = !m.hidden;
    $("#menu-btn").setAttribute("aria-expanded", String(!m.hidden));
    updateNotifUI();
  });
  $("#notif-btn").addEventListener("click", async () => {
    try { await Notification.requestPermission(); } catch (e) {}
    updateNotifUI(); checkReminders();
  });
  $("#export-btn").addEventListener("click", () => {
    downloadFile("due-next-backup-" + ymd(new Date()) + ".json", JSON.stringify({ app: "due-next", version: 1, items }, null, 2), "application/json");
  });
  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const msg = $("#menu-msg");
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(incoming)) throw new Error();
      const valid = incoming.filter((x) => x && typeof x.id === "string" && typeof x.title === "string" && typeof x.due === "string");
      const byId = new Map(items.map((x) => [x.id, x]));
      for (const x of valid) byId.set(x.id, x);
      items = [...byId.values()];
      persist();
      cloudDo(() => cloud.saveMany(valid));
      msg.hidden = true;
      toast("Restored " + valid.length + " assignment" + (valid.length === 1 ? "" : "s") + ".", false);
    } catch (err) {
      msg.textContent = "That file isn't a Due Next backup. Choose the .json file you saved with Save backup.";
      msg.hidden = false;
    }
    e.target.value = "";
  });

  // ---------- account + sync ----------
  function showAcctMsg(text) { const m = $("#acct-msg"); m.textContent = text || ""; m.hidden = !text; }
  function setSync(state) {
    const s = $("#sync-status");
    s.hidden = false;
    s.className = "sync " + state;
    s.textContent = state === "on" ? "Synced" : state === "wait" ? "Syncing…" : "This device only";
  }
  function authAction(fn) {
    return async () => {
      showAcctMsg("");
      mergeOnSignIn = true;
      try { await fn(); } catch (err) { mergeOnSignIn = false; showAcctMsg(friendlyErr(err)); }
    };
  }

  async function setupSync() {
    let config = null;
    try { ({ firebaseConfig: config } = await import("./config.js")); } catch (e) {}
    if (!config) {
      $("#acct-note").textContent = "Syncing isn't set up yet. Follow “Turn on syncing” in the README, then your list will match on every device.";
      setSync("off");
      return;
    }
    $("#acct-note").textContent = "Sign in on each device with the same account to see the same list everywhere.";
    let mod;
    try {
      mod = await import("./cloud.js");
      friendlyErr = mod.friendly;
      cloud = await mod.startCloud(config, {
        onUser(u) {
          $("#acct-out").hidden = !!u;
          $("#acct-in").hidden = !u;
          if (!u) { setSync("off"); return; }
          $("#acct-who").textContent = "Signed in as " + (u.email || u.name || "you") + ". Your list syncs automatically.";
          setSync("wait");
          if (mergeOnSignIn) {
            mergeOnSignIn = false;
            const local = items.slice();
            cloud.mergeLocal(local).then((n) => { if (n) toast("Added " + n + " assignment" + (n === 1 ? "" : "s") + " from this device to your account.", false); })
              .catch((err) => showAcctMsg(friendlyErr(err)));
          }
        },
        onItems(list, pending) {
          items = list;
          persist();
          setSync(pending ? "wait" : "on");
          checkReminders();
        },
        onError(msg) { showAcctMsg(msg); },
      });
    } catch (e) {
      $("#acct-note").textContent = "Couldn't connect to sync right now (are you offline?). Your list still works on this device.";
      setSync("off");
      return;
    }
    $("#email-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $("#acct-email").value.trim(), pw = $("#acct-pw").value;
      const mode = e.submitter && e.submitter.dataset.mode;
      authAction(() => mode === "up" ? cloud.signUpEmail(email, pw) : cloud.signInEmail(email, pw))();
    });
    $("#reset-btn").addEventListener("click", async () => {
      const email = $("#acct-email").value.trim();
      if (!email) { showAcctMsg("Type your email above first, then tap Forgot password."); return; }
      try { await cloud.resetPassword(email); showAcctMsg(""); toast("Password reset email sent to " + email + ".", false); }
      catch (err) { showAcctMsg(friendlyErr(err)); }
    });
    $("#signout-btn").addEventListener("click", async () => {
      try { await cloud.signOut(); toast("Signed out. Your list stays on this device.", false); } catch (err) { showAcctMsg(friendlyErr(err)); }
    });
  }

  // ---------- boot ----------
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  render();
  checkReminders();
  setupSync();
  setInterval(() => { render(); checkReminders(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); checkReminders(); } });
})();
