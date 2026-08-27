(() => {
  "use strict";

  // ---- Config ---------------------------------------------------------
  // Anchor: the day the schedule starts. Pletzer has the boat on this day,
  // and the family alternates every day from here, forwards and backwards,
  // indefinitely.
  const ANCHOR = new Date(2026, 7, 26); // 26 Aug 2026 (month is 0-indexed) = Pletzer
  const FAMILIES = {
    pletzer: { name: "Pletzer", key: "pletzer" },
    salter: { name: "Salter", key: "salter" },
  };
  const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---- Settings (persisted locally on this device) ----------------------
  const SETTINGS_KEY = "singingSandsSettings";
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { weekStartDay: 1 }; // default Monday
      const parsed = JSON.parse(raw);
      const day = Number(parsed.weekStartDay);
      return { weekStartDay: Number.isInteger(day) && day >= 0 && day <= 6 ? day : 1 };
    } catch {
      return { weekStartDay: 1 };
    }
  }
  function saveSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  }
  let settings = loadSettings();

  // ---- Date helpers (local-midnight dates, no time component) --------
  function atMidnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function today() { return atMidnight(new Date()); }
  function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
  function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function dayDiff(a, b) {
    const msPerDay = 86400000;
    return Math.round((atMidnight(a) - atMidnight(b)) / msPerDay);
  }
  // The date of the configured week-start weekday, in the week containing `date`.
  function startOfWeekFor(date, weekStartDay) {
    const offset = (date.getDay() - weekStartDay + 7) % 7;
    return addDays(date, -offset);
  }

  function familyForDate(date) {
    const diff = dayDiff(date, ANCHOR);
    // JS % can return negative; normalize to 0/1
    const parity = ((diff % 2) + 2) % 2;
    return parity === 0 ? FAMILIES.pletzer : FAMILIES.salter;
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ---- State ------------------------------------------------------------
  let viewMode = "week"; // 'week' | 'month'
  let weekStart = startOfWeekFor(today(), settings.weekStartDay); // start of the visible 7-day window
  let monthCursor = atMidnight(new Date(today().getFullYear(), today().getMonth(), 1));

  // ---- Elements ---------------------------------------------------------
  const el = {
    weekView: document.getElementById("weekView"),
    monthView: document.getElementById("monthView"),
    monthWeekdays: document.getElementById("monthWeekdays"),
    monthDays: document.getElementById("monthDays"),
    rangeLabel: document.getElementById("rangeLabel"),
    btnToday: document.getElementById("btnToday"),
    btnPrev: document.getElementById("btnPrev"),
    btnNext: document.getElementById("btnNext"),
    btnWeekView: document.getElementById("btnWeekView"),
    btnMonthView: document.getElementById("btnMonthView"),
    installBtn: document.getElementById("installBtn"),
    iosHint: document.getElementById("iosHint"),
    btnSettings: document.getElementById("btnSettings"),
    settingsOverlay: document.getElementById("settingsOverlay"),
    btnCloseSettings: document.getElementById("btnCloseSettings"),
    weekStartSelect: document.getElementById("weekStartSelect"),
  };

  // ---- Rendering: week view ----------------------------------------------
  function renderWeek() {
    el.weekView.innerHTML = "";
    const t = today();

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const fam = familyForDate(date);
      const isToday = sameDate(date, t);
      const isPast = !isToday && dayDiff(date, t) < 0;

      const row = document.createElement("div");
      row.className = `day-row ${fam.key}${isToday ? " is-today" : ""}${isPast ? " is-past" : ""}`;
      row.style.animationDelay = `${i * 35}ms`;

      row.innerHTML = `
        <div class="date-block">
          <span class="dow">${WEEKDAY_SHORT[date.getDay()]}</span>
          <span class="dom">${date.getDate()}</span>
        </div>
        <div class="day-info">
          <div class="family-name">${fam.name}${isToday ? '<span class="today-tag">TODAY</span>' : ""}</div>
          <p class="has-boat">${WEEKDAY_LONG[date.getDay()]}, ${ordinal(date.getDate())} ${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}</p>
        </div>
      `;
      el.weekView.appendChild(row);
    }

    const end = addDays(weekStart, 6);
    el.rangeLabel.textContent = formatRange(weekStart, end);
  }

  function formatRange(start, end) {
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    if (sameYear) {
      return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  // ---- Rendering: month view ---------------------------------------------
  function renderMonth() {
    // Weekday header labels, reordered to start on the configured day.
    const orderedLabels = [];
    for (let i = 0; i < 7; i++) orderedLabels.push(WEEKDAY_SHORT[(settings.weekStartDay + i) % 7]);
    el.monthWeekdays.innerHTML = orderedLabels.map(d => `<span>${d}</span>`).join("");
    el.monthDays.innerHTML = "";

    const t = today();
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() - settings.weekStartDay + 7) % 7;
    const gridStart = addDays(firstOfMonth, -startOffset);

    // 6 rows x 7 cols = 42 cells covers any month layout
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i);
      const fam = familyForDate(date);
      const outside = date.getMonth() !== month;
      const isToday = sameDate(date, t);
      const isPast = !isToday && dayDiff(date, t) < 0;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `month-cell ${fam.key}${outside ? " outside" : ""}${isToday ? " is-today" : ""}${isPast ? " is-past" : ""}`;
      cell.textContent = date.getDate();
      cell.setAttribute("aria-label", `${WEEKDAY_LONG[date.getDay()]}, ${MONTH_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} — ${fam.name}`);
      cell.addEventListener("click", () => {
        weekStart = startOfWeekFor(date, settings.weekStartDay);
        setView("week");
      });
      el.monthDays.appendChild(cell);
    }

    el.rangeLabel.textContent = `${MONTH_LONG[month]} ${year}`;
  }

  // ---- View switching -----------------------------------------------------
  function setView(mode) {
    viewMode = mode;
    el.weekView.hidden = mode !== "week";
    el.monthView.hidden = mode !== "month";
    el.btnWeekView.classList.toggle("active", mode === "week");
    el.btnMonthView.classList.toggle("active", mode === "month");
    if (mode === "month") {
      monthCursor = atMidnight(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
      renderMonth();
    } else {
      renderWeek();
    }
  }

  function goToday() {
    weekStart = startOfWeekFor(today(), settings.weekStartDay);
    setView("week");
  }

  function step(dir) {
    if (viewMode === "week") {
      weekStart = addDays(weekStart, dir * 7);
      renderWeek();
    } else {
      monthCursor = addMonths(monthCursor, dir);
      renderMonth();
    }
  }

  // ---- Wire up controls -----------------------------------------------------
  el.btnToday.addEventListener("click", goToday);
  el.btnPrev.addEventListener("click", () => step(-1));
  el.btnNext.addEventListener("click", () => step(1));
  el.btnWeekView.addEventListener("click", () => setView("week"));
  el.btnMonthView.addEventListener("click", () => setView("month"));

  // ---- Settings panel -----------------------------------------------------
  function openSettings() {
    el.weekStartSelect.value = String(settings.weekStartDay);
    el.settingsOverlay.hidden = false;
  }
  function closeSettings() { el.settingsOverlay.hidden = true; }

  el.btnSettings.addEventListener("click", openSettings);
  el.btnCloseSettings.addEventListener("click", closeSettings);
  el.settingsOverlay.addEventListener("click", (e) => {
    if (e.target === el.settingsOverlay) closeSettings();
  });
  el.weekStartSelect.addEventListener("change", () => {
    const day = Number(el.weekStartSelect.value);
    settings.weekStartDay = day;
    saveSettings(settings);
    // Re-align the currently displayed week to the new start day, keeping
    // it anchored to whichever date is currently in view.
    weekStart = startOfWeekFor(weekStart, settings.weekStartDay);
    if (viewMode === "week") renderWeek(); else renderMonth();
  });

  // ---- Install prompt (Android/desktop Chrome) -------------------------
  // Launched from the home screen / app window rather than a browser tab?
  function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches
      || window.matchMedia("(display-mode: minimal-ui)").matches
      || window.navigator.standalone === true
      || document.referrer.startsWith("android-app://");
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    if (isInstalled()) return; // already installed, nothing to offer
    deferredPrompt = e;
    el.installBtn.hidden = false;
  });
  el.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    el.installBtn.hidden = true;
  });
  window.addEventListener("appinstalled", () => { el.installBtn.hidden = true; });

  // iOS Safari has no beforeinstallprompt — show a manual hint instead.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !isInstalled()) el.iosHint.hidden = false;

  // If the display mode changes mid-session (e.g. the user installs), tidy up.
  if (isInstalled()) {
    el.installBtn.hidden = true;
    el.iosHint.hidden = true;
  }
  window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
    if (e.matches) {
      el.installBtn.hidden = true;
      el.iosHint.hidden = true;
    }
  });

  // ---- Service worker ------------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---- Boot -----------------------------------------------------------------
  renderWeek();
})();
