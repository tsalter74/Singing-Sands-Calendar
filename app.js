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

  const BOAT_SVG = `<svg class="boat-icon" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.2 5 H15.4 V17.5 H14.2 Z"/>
    <path d="M15.4 6.5 L21.5 9.5 L15.4 11.8 Z"/>
    <path d="M6 19.5 L24 19.5 L20.5 26 H9.5 Z"/>
  </svg>`;

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
  let weekStart = today(); // start of the visible 7-day window
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
  };

  // ---- Rendering: week view ----------------------------------------------
  function renderWeek() {
    el.weekView.innerHTML = "";
    const t = today();

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const fam = familyForDate(date);
      const isToday = sameDate(date, t);

      const row = document.createElement("div");
      row.className = `day-row ${fam.key}${isToday ? " is-today" : ""}`;
      row.style.animationDelay = `${i * 35}ms`;

      row.innerHTML = `
        <div class="date-block">
          <span class="dow">${WEEKDAY_SHORT[date.getDay()]}</span>
          <span class="dom">${date.getDate()}</span>
          <span class="mon-yr">${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}</span>
        </div>
        <div class="day-info">
          <div class="family-name">${fam.name}${isToday ? '<span class="today-tag">TODAY</span>' : ""}</div>
          <p class="has-boat">${WEEKDAY_LONG[date.getDay()]}, ${ordinal(date.getDate())} ${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}</p>
        </div>
        ${BOAT_SVG}
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
    el.monthWeekdays.innerHTML = WEEKDAY_SHORT.map(d => `<span>${d}</span>`).join("");
    el.monthDays.innerHTML = "";

    const t = today();
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = addDays(firstOfMonth, -startOffset);

    // 6 rows x 7 cols = 42 cells covers any month layout
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i);
      const fam = familyForDate(date);
      const outside = date.getMonth() !== month;
      const isToday = sameDate(date, t);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `month-cell ${fam.key}${outside ? " outside" : ""}${isToday ? " is-today" : ""}`;
      cell.textContent = date.getDate();
      cell.setAttribute("aria-label", `${WEEKDAY_LONG[date.getDay()]}, ${MONTH_LONG[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} — ${fam.name}`);
      cell.addEventListener("click", () => {
        weekStart = date;
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
    weekStart = today();
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

  // ---- Install prompt (Android/desktop Chrome) -------------------------
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
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
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isIOS && !isStandalone) el.iosHint.hidden = false;

  // ---- Service worker ------------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---- Boot -----------------------------------------------------------------
  renderWeek();
})();
