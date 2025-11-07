/* ======================================================================
   Utility helpers
   ====================================================================== */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const formatCurrency = (value) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

/* ======================================================================
   Local storage layer
   ====================================================================== */
const STORAGE_KEYS = {
  profile: "munkaora_profile",
  saved: "munkaora_saved",
  spent: "munkaora_spent",
  goals: "munkaora_goals",
  theme: "munkaora_theme",
};

const Storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("Storage read error", error);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Storage write error", error);
      return false;
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

/* ======================================================================
   UI feedback helpers
   ====================================================================== */
const positiveMessages = [
  "Szia Lajos, most épp egy lépéssel közelebb vagy a szabadsághoz.",
  "Okos döntés, Lajos – még pár ilyen, és lesz nyaralásod is.",
  "Spórolni nem menő, csak hasznos – és te most hasznos vagy.",
  "A jövőbeli Lajos koccint rád egy ásványvízzel.",
  "A bankszámlád hálás, még ha nem is tud beszélni.",
  "Na látod, működik az önuralom, nem csak legenda.",
  "Lassan, de biztosan, Lajos – a türelem forintot terem.",
  "Egy kicsit most gazdagabb vagy, még ha csak lélekben is.",
  "Szia Lajos, ez volt a felnőtt élet első jele.",
  "Ha minden nap így döntesz, egyszer te leszel a motivációs poszt.",
];

const negativeMessages = [
  "Megvetted? Szép. A pénztárcád sír, de legalább te boldog vagy.",
  "Szia Lajos, most megint eladtad a jövőd egy kávéért.",
  "Gratulálok, a célod most épp hátrébb lépett kettőt.",
  "Nem baj, legalább gazdagabb lettél tapasztalatban.",
  "A spórolás várhat – mondta még senki, aki elérte a célját.",
  "Lajos, a költekezés öröm – rövid távon.",
  "Még egy ilyen döntés, és a célod már csak mese lesz.",
  "Ha a pénz beszél, most épp azt mondta: viszlát.",
  "Jó választás lenne… egy másik univerzumban.",
  "Szia Lajos, a jövőbeli éned most épp kikapcsolta a Wi-Fit, hogy ne lássa ezt.",
];

const coachMessages = {
  startup: [
    "Szia Lajos! Nézzük, mennyi időt dolgoztál a vágyaidért. ⏳",
    "Üdv újra, Lajos! Készen állsz egy kis pénzügyi matekra? 📈",
    "Szia Lajos! Mutasd, mire gyűjtöttél mostanában. 💼",
  ],
  save: [
    "Szépen spórolsz, Lajos! 💰",
    "Ez igen, újabb munkaóra megmentve! 🙌",
    "Szuper döntés, Lajos – így épül a tartalék. 🛡️",
    "Most tényleg közelebb kerültél a célodhoz! 🏁",
  ],
  spend: [
    "Hát ez most elment, de legalább hasznos volt. 😉",
    "Megérte? Gondold át legközelebb! 💸",
    "Egy kis öröm most, több munkaórád ment el. ⏱️",
    "Oké, Lajos, de holnap spórolós nap jön! 😅",
  ],
  results: [
    "Itt az eredmény, Lajos! 📊",
    "Nézd meg, mennyit haladtál! 🚀",
    "A számok nem hazudnak – ez a mérleged most. ⚖️",
    "Ez a teljesítményed összefoglalva. 📘",
  ],
};

const UI = {
  actionTimer: null,
  coachTimer: null,
  toastTimer: null,
  showActionMessage(text, type = "info") {
    const target = $("#actionMessage");
    if (!target) {
      console.warn("UI.showActionMessage: target element not found", text);
      return;
    }
    target.textContent = text;
    target.dataset.type = type;
    target.classList.add("visible");
    target.classList.remove("hidden");
    if (this.actionTimer) clearTimeout(this.actionTimer);
    this.actionTimer = setTimeout(() => {
      target.classList.remove("visible");
      setTimeout(() => target.classList.add("hidden"), 300);
      this.actionTimer = null;
    }, 3000);
  },
  showCoach(context) {
    const pool = coachMessages[context];
    if (!pool || !pool.length) return;
    const message = pool[Math.floor(Math.random() * pool.length)];
    const box = $("#coach");
    if (!box) return;
    box.textContent = message;
    box.classList.add("visible");
    if (this.coachTimer) clearTimeout(this.coachTimer);
    this.coachTimer = setTimeout(() => {
      box.classList.remove("visible");
    }, 2600);
  },
  toast(message) {
    const box = $("#toast");
    if (!box) {
      console.log(message);
      return;
    }
    box.textContent = message;
    box.classList.add("visible");
    box.classList.remove("hidden");
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      box.classList.remove("visible");
      setTimeout(() => box.classList.add("hidden"), 300);
      this.toastTimer = null;
    }, 3200);
  },
};

/* ======================================================================
   Application controller
   ====================================================================== */
const App = {
  state: {
    profile: null,
    view: "calc",
    calculation: null,
    entries: {
      saved: [],
      spent: [],
    },
    filters: {
      search: "",
      type: "all",
      sort: "date_desc",
    },
    goals: {
      monthlyCap: 0,
      savingGoal: 0,
    },
  },
  swUpdateNotified: false,

  init() {
    this.cacheDom();
    this.initTheme();
    this.bindEvents();
    this.bindTheme();
    this.restoreState();
    this.updateUI();
    this.setView(this.state.view || "calc");
    this.registerServiceWorker();
  },

  cacheDom() {
    this.el = {
      welcomeOverlay: $("#welcomeOverlay"),
      welcomeStart: $("#welcomeStart"),
      appShell: $("#appShell"),
      profileModal: $("#profileModal"),
      profileForm: $("#profileForm"),
      profileReset: $("#profileReset"),
      profileButton: $("#profileButton"),
      themeToggle: $("#themeToggle"),
      modalBackdrop: $("#profileModal .modal__backdrop"),
      calcForm: $("#calcForm"),
      calcAlert: $("#calcAlert"),
      calcResult: $("#calcResult"),
      resultText: $("#resultText"),
      resultDetail: $("#resultDetail"),
      decisionSave: $("#decisionSave"),
      decisionBuy: $("#decisionBuy"),
      tabs: $$(".tab"),
      views: $$(".view"),
      welcomeHint: $("#welcomeHint"),
      resultsList: $("#resultsList"),
      totals: {
        saved: $("#totalSaved"),
        spent: $("#totalSpent"),
        net: $("#totalNet"),
      },
      searchInput: $("#searchInput"),
      filterSelect: $("#filterSelect"),
      sortSelect: $("#sortSelect"),
      clearEntries: $("#clearEntries"),
      statsContainer: $("#statsContainer"),
      statsEmpty: $("#statsEmpty"),
      goalsForm: $("#goalsForm"),
      resetGoals: $("#resetGoals"),
      goalProgressBar: $("#goalProgressBar"),
      goalProgressLabel: $("#goalProgressLabel"),
      goalStatus: $("#goalStatus"),
    };
  },

  bindEvents() {
    if (this.el.welcomeStart) {
      this.el.welcomeStart.addEventListener("click", () => this.openProfileModal());
    }

    if (this.el.profileButton) {
      this.el.profileButton.addEventListener("click", () => this.openProfileModal());
    }

    $$("[data-close='profile']", this.el.profileModal).forEach((btn) => {
      btn.addEventListener("click", () => this.closeProfileModal());
    });

    if (this.el.profileForm) {
      this.el.profileForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.saveProfile(new FormData(this.el.profileForm));
      });
    }

    if (this.el.profileReset) {
      this.el.profileReset.addEventListener("click", () => this.resetAllData());
    }

    if (this.el.calcForm) {
      this.el.calcForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.calculate();
      });
      $$("input", this.el.calcForm).forEach((input) => {
        input.addEventListener("input", () => {
          this.el.calcAlert.classList.add("hidden");
        });
      });
    }

    if (this.el.decisionSave) {
      this.el.decisionSave.addEventListener("click", () => this.commitDecision("saved"));
    }

    if (this.el.decisionBuy) {
      this.el.decisionBuy.addEventListener("click", () => this.commitDecision("spent"));
    }

    this.el.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const view = tab.dataset.view;
        this.setView(view);
      });
    });

    if (this.el.searchInput) {
      this.el.searchInput.addEventListener("input", (event) => {
        this.state.filters.search = event.target.value;
        this.renderResults();
      });
    }

    if (this.el.filterSelect) {
      this.el.filterSelect.addEventListener("change", (event) => {
        this.state.filters.type = event.target.value;
        this.renderResults();
      });
    }

    if (this.el.sortSelect) {
      this.el.sortSelect.addEventListener("change", (event) => {
        this.state.filters.sort = event.target.value;
        this.renderResults();
      });
    }

    if (this.el.clearEntries) {
      this.el.clearEntries.addEventListener("click", () => this.clearEntries());
    }

    if (this.el.resultsList) {
      this.el.resultsList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-id]");
        if (!button) return;
        const { id, type } = button.dataset;
        this.deleteEntry(type, id);
      });
    }

    if (this.el.goalsForm) {
      this.el.goalsForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.saveGoals(new FormData(this.el.goalsForm));
      });
    }

    if (this.el.resetGoals) {
      this.el.resetGoals.addEventListener("click", () => this.resetGoals());
    }

    $$('button[data-view="calc"]').forEach((btn) => {
      btn.addEventListener("click", () => this.setView("calc"));
    });
  },

  initTheme() {
    const saved = Storage.get(STORAGE_KEYS.theme, null);
    const prefersDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const initial = saved || (prefersDark && prefersDark.matches ? "dark" : "light");
    this.applyTheme(initial);
  },

  applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    Storage.set(STORAGE_KEYS.theme, next);
    if (this.el.themeToggle) {
      this.el.themeToggle.checked = next === "dark";
      this.el.themeToggle.setAttribute("aria-checked", String(next === "dark"));
    }
  },

  bindTheme() {
    if (!this.el.themeToggle) return;
    this.el.themeToggle.checked = document.documentElement.getAttribute("data-theme") === "dark";
    this.el.themeToggle.setAttribute("aria-checked", String(this.el.themeToggle.checked));
    this.el.themeToggle.addEventListener("change", () => {
      const theme = this.el.themeToggle.checked ? "dark" : "light";
      this.applyTheme(theme);
    });
  },

  restoreState() {
    const profile = Storage.get(STORAGE_KEYS.profile, null);
    const saved = Storage.get(STORAGE_KEYS.saved, []);
    const spent = Storage.get(STORAGE_KEYS.spent, []);
    const goals = Storage.get(STORAGE_KEYS.goals, { monthlyCap: 0, savingGoal: 0 });

    this.state.profile = profile;
    this.state.entries.saved = Array.isArray(saved) ? saved : [];
    this.state.entries.spent = Array.isArray(spent) ? spent : [];
    this.state.goals = goals || { monthlyCap: 0, savingGoal: 0 };

    if (profile) {
      this.showApp();
      UI.showCoach("startup");
      this.populateProfileHeader();
    }
  },

  updateUI() {
    this.populateProfileHeader();
    this.renderResults();
    this.renderStats();
    this.populateProfileForm();
    this.populateGoalsForm();
    this.updateGoalProgress();
  },

  showApp() {
    this.el.appShell.classList.remove("hidden");
    this.el.welcomeOverlay.classList.remove("active");
    this.el.welcomeOverlay.classList.add("hidden");
  },

  openProfileModal() {
    this.populateProfileForm();
    this.el.profileModal.classList.remove("hidden");
    this.el.profileModal.classList.add("active");
  },

  closeProfileModal() {
    this.el.profileModal.classList.remove("active");
    this.el.profileModal.classList.add("hidden");
  },

  saveProfile(formData) {
    const profile = {
      name: (formData.get("name") || "").toString().trim(),
      age: Number(formData.get("age")),
      salary: Number(formData.get("salary")),
      hours: Number(formData.get("hours")),
    };

    if (!profile.name || !profile.age || !profile.salary || !profile.hours) {
      UI.toast("Tölts ki minden mezőt a profilban!");
      return;
    }

    Storage.set(STORAGE_KEYS.profile, profile);
    this.state.profile = profile;
    this.populateProfileHeader();
    this.showApp();
    this.closeProfileModal();
    UI.toast("Profil mentve.");
  },

  resetAllData() {
    if (!confirm("Biztosan törlöd az összes adatot?")) return;
    [STORAGE_KEYS.profile, STORAGE_KEYS.saved, STORAGE_KEYS.spent, STORAGE_KEYS.goals].forEach((key) =>
      Storage.remove(key)
    );
    this.state.profile = null;
    this.state.entries.saved = [];
    this.state.entries.spent = [];
    this.state.goals = { monthlyCap: 0, savingGoal: 0 };
    this.el.appShell.classList.add("hidden");
    this.el.welcomeOverlay.classList.add("active");
    this.el.welcomeOverlay.classList.remove("hidden");
    this.closeProfileModal();
    this.el.calcForm.reset();
    this.el.calcResult.classList.add("hidden");
    this.el.welcomeHint.textContent = "Szia! Kezdjük egy új tétellel.";
    this.updateUI();
    UI.toast("Minden adat törölve.");
  },

  populateProfileForm() {
    if (!this.el.profileForm) return;
    const profile = this.state.profile || { name: "", age: "", salary: "", hours: "" };
    $("#profileName").value = profile.name || "";
    $("#profileAge").value = profile.age || "";
    $("#profileSalary").value = profile.salary || "";
    $("#profileHours").value = profile.hours || "";
  },

  calculate() {
    if (!this.state.profile) {
      this.showCalcError("Először állítsd be a profilodat!");
      this.openProfileModal();
      return;
    }

    const name = $("#productName").value.trim();
    const price = Number($("#productPrice").value);

    if (!name || !price || price <= 0) {
      this.showCalcError("Adj meg egy nevet és érvényes árat!");
      return;
    }

    const hourly = this.getHourlyRate();
    if (!hourly || hourly <= 0) {
      this.showCalcError("Nem sikerült kiszámolni az órabért. Ellenőrizd a profilodat!");
      return;
    }

    const hours = price / hourly;
    this.state.calculation = {
      id: uid(),
      name,
      price,
      hours,
      at: Date.now(),
    };

    this.el.calcAlert.classList.add("hidden");
    this.el.calcResult.classList.remove("hidden");
    this.el.resultText.textContent = `Kb. ${hours.toFixed(1)} munkaórádba kerülne (${formatCurrency(price)}).`;
    const hourlyRounded = Math.round(hourly);
    this.el.resultDetail.textContent = `Órabéred: ${formatCurrency(hourlyRounded)} / óra.`;
  },

  showCalcError(message) {
    this.el.calcAlert.textContent = message;
    this.el.calcAlert.classList.remove("hidden");
  },

  getHourlyRate() {
    const profile = this.state.profile;
    if (!profile) return 0;
    const monthlySalary = Number(profile.salary) || 0;
    const weeklyHours = Number(profile.hours) || 0;
    if (!monthlySalary || !weeklyHours) return 0;
    const monthlyHours = weeklyHours * 4;
    return monthlySalary / monthlyHours;
  },

  commitDecision(type) {
    if (!this.state.calculation) {
      UI.toast("Előbb számolj ki egy tételt!");
      return;
    }

    const entry = {
      id: uid(),
      name: this.state.calculation.name,
      price: this.state.calculation.price,
      hours: this.state.calculation.hours,
      at: Date.now(),
      type,
    };

    this.state.entries[type].unshift(entry);
    Storage.set(STORAGE_KEYS[type], this.state.entries[type]);

    this.state.calculation = null;
    this.el.calcForm.reset();
    this.el.calcResult.classList.add("hidden");

    this.setView("results");

    const messagePool = type === "saved" ? positiveMessages : negativeMessages;
    const message = messagePool[Math.floor(Math.random() * messagePool.length)];
    try {
      UI.showActionMessage(message);
    } catch (error) {
      console.warn("Action message error", error);
    }

    UI.showCoach(type === "saved" ? "save" : "spend");
    this.renderResults();
    this.renderStats();
    this.updateGoalProgress();
  },

  deleteEntry(type, id) {
    const list = this.state.entries[type];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return;
    list.splice(index, 1);
    Storage.set(STORAGE_KEYS[type], list);
    this.renderResults();
    this.renderStats();
    this.updateGoalProgress();
    UI.toast("Tétel törölve.");
  },

  clearEntries() {
    if (!confirm("Biztosan törlöd az összes tételt?")) return;
    this.state.entries.saved = [];
    this.state.entries.spent = [];
    Storage.set(STORAGE_KEYS.saved, []);
    Storage.set(STORAGE_KEYS.spent, []);
    this.renderResults();
    this.renderStats();
    this.updateGoalProgress();
  },

  getFilteredEntries() {
    const combined = [...this.state.entries.saved, ...this.state.entries.spent];
    const search = this.state.filters.search.trim().toLowerCase();
    const type = this.state.filters.type;
    const sort = this.state.filters.sort;

    let list = combined.filter((item) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search);
      const matchesType = type === "all" || item.type === type;
      return matchesSearch && matchesType;
    });

    const compare = {
      date_desc: (a, b) => b.at - a.at,
      date_asc: (a, b) => a.at - b.at,
      price_desc: (a, b) => b.price - a.price,
      price_asc: (a, b) => a.price - b.price,
      name_asc: (a, b) => a.name.localeCompare(b.name, "hu"),
      name_desc: (a, b) => b.name.localeCompare(a.name, "hu"),
    };

    if (compare[sort]) {
      list = list.sort(compare[sort]);
    }

    return list;
  },

  renderResults() {
    const entries = this.getFilteredEntries();
    const container = this.el.resultsList;
    container.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "list__item";
      empty.innerHTML = "<p class=\"muted\">Még nincs rögzített tétel.</p>";
      container.appendChild(empty);
    } else {
      entries.forEach((item) => {
        const li = document.createElement("li");
        li.className = "list__item";
        li.innerHTML = `
          <div class="list__item-header">
            <strong>${item.name}</strong>
            <span class="badge ${item.type === "saved" ? "badge--saved" : "badge--spent"}">
              ${item.type === "saved" ? "Megspórolt" : "Megvett"}
            </span>
          </div>
          <div class="list__item-meta">
            <span>${formatCurrency(item.price)}</span>
            <span>${item.hours.toFixed(1)} óra</span>
            <span>${formatDate(item.at)}</span>
          </div>
          <div class="list__item-actions">
            <button class="btn btn--ghost" data-id="${item.id}" data-type="${item.type}" type="button">Törlés</button>
          </div>
        `;
        container.appendChild(li);
      });
    }

    const totalSaved = this.state.entries.saved.reduce((sum, item) => sum + Number(item.price), 0);
    const totalSpent = this.state.entries.spent.reduce((sum, item) => sum + Number(item.price), 0);
    const totalNet = totalSaved - totalSpent;

    this.el.totals.saved.textContent = formatCurrency(totalSaved);
    this.el.totals.spent.textContent = formatCurrency(totalSpent);
    this.el.totals.net.textContent = formatCurrency(totalNet);
  },

  renderStats() {
    const all = [...this.state.entries.saved, ...this.state.entries.spent];
    const container = this.el.statsContainer;
    container.innerHTML = "";

    if (!all.length) {
      this.el.statsEmpty.classList.remove("hidden");
      return;
    }

    const groups = new Map();
    all.forEach((item) => {
      const date = new Date(item.at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups.has(key)) {
        groups.set(key, { saved: 0, spent: 0 });
      }
      const bucket = groups.get(key);
      if (item.type === "saved") bucket.saved += Number(item.price);
      else bucket.spent += Number(item.price);
    });

    const ordered = Array.from(groups.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-6);

    ordered.forEach(([month, values]) => {
      const row = document.createElement("div");
      row.className = "stat-row";
      const net = values.saved - values.spent;
      row.innerHTML = `
        <div class="stat-row__meta">
          <span>${month}</span>
          <span>${formatCurrency(net)}</span>
        </div>
        <div class="stat-row__bars">
          <div>
            <small class="muted">Megspórolt</small>
            <div class="bar"><span style="width:${this.calcBarWidth(values.saved, ordered)}; background: rgba(34, 197, 94, 0.85);"></span></div>
            <strong>${formatCurrency(values.saved)}</strong>
          </div>
          <div>
            <small class="muted">Megvett</small>
            <div class="bar"><span style="width:${this.calcBarWidth(values.spent, ordered)}; background: rgba(239, 68, 68, 0.85);"></span></div>
            <strong>${formatCurrency(values.spent)}</strong>
          </div>
        </div>
      `;
      container.appendChild(row);
    });

    this.el.statsEmpty.classList.toggle("hidden", ordered.length > 0);
  },

  calcBarWidth(value, dataset) {
    const max = Math.max(...dataset.map(([, val]) => Math.max(val.saved, val.spent)), 1);
    const ratio = value / max;
    return `${Math.max(6, ratio * 100)}%`;
  },

  populateGoalsForm() {
    if (!this.el.goalsForm) return;
    this.el.goalsForm.monthlyCap.value = this.state.goals.monthlyCap || "";
    this.el.goalsForm.savingGoal.value = this.state.goals.savingGoal || "";
  },

  saveGoals(formData) {
    const goals = {
      monthlyCap: Number(formData.get("monthlyCap")) || 0,
      savingGoal: Number(formData.get("savingGoal")) || 0,
    };
    Storage.set(STORAGE_KEYS.goals, goals);
    this.state.goals = goals;
    this.updateGoalProgress();
    UI.toast("Célok mentve.");
  },

  resetGoals() {
    Storage.set(STORAGE_KEYS.goals, { monthlyCap: 0, savingGoal: 0 });
    this.state.goals = { monthlyCap: 0, savingGoal: 0 };
    this.populateGoalsForm();
    this.updateGoalProgress();
  },

  updateGoalProgress() {
    const totalSaved = this.state.entries.saved.reduce((sum, item) => sum + Number(item.price), 0);
    const { savingGoal, monthlyCap } = this.state.goals;
    const progress = savingGoal ? Math.min(1, totalSaved / savingGoal) : 0;
    this.el.goalProgressBar.style.width = `${(progress * 100).toFixed(0)}%`;
    this.el.goalProgressLabel.textContent = `${(progress * 100).toFixed(0)}%`;

    if (savingGoal) {
      this.el.goalStatus.textContent = `Még ${formatCurrency(Math.max(0, savingGoal - totalSaved))} hiányzik a célhoz.`;
    } else {
      this.el.goalStatus.textContent = "Adj meg egy célt, hogy kövesd a haladást.";
    }

    if (monthlyCap) {
      const spentThisMonth = this.getSpentThisMonth();
      this.el.goalStatus.textContent += ` Havi keret: ${formatCurrency(monthlyCap)} • Eddig ${formatCurrency(spentThisMonth)}-t költöttél.`;
    }
  },

  getSpentThisMonth() {
    const nowDate = new Date();
    const month = nowDate.getMonth();
    const year = nowDate.getFullYear();
    return this.state.entries.spent
      .filter((item) => {
        const date = new Date(item.at);
        return date.getMonth() === month && date.getFullYear() === year;
      })
      .reduce((sum, item) => sum + Number(item.price), 0);
  },

  setView(view) {
    this.state.view = view;
    this.el.tabs.forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active);
    });

    this.el.views.forEach((section) => {
      section.classList.toggle("active", section.id === `view-${view}`);
    });

    if (view === "results") {
      this.renderResults();
      UI.showCoach("results");
    } else if (view === "stats") {
      this.renderStats();
    } else if (view === "goals") {
      this.updateGoalProgress();
    }
  },

  populateProfileHeader() {
    if (!this.el.welcomeHint) return;
    if (this.state.profile) {
      this.el.welcomeHint.textContent = `Szia ${this.state.profile.name}! Adj meg egy tételt.`;
    } else {
      this.el.welcomeHint.textContent = "Szia! Kezdjük egy új tétellel.";
    }
  },

  registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js?v=20250206")
        .then((registration) => {
          console.info("[SW] Registered:", registration.scope);
          if (registration.waiting) {
            this.notifyServiceWorkerUpdate(registration.waiting);
          }
          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;
            console.info("[SW] Update found");
            installing.addEventListener("statechange", () => {
              console.info("[SW] State:", installing.state);
              if (installing.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  this.notifyServiceWorkerUpdate(installing);
                } else {
                  console.info("[SW] Tartalom offline elérhető.");
                }
              }
            });
          });
        })
        .catch((error) => console.warn("[SW] Registration failed", error));

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!this.swUpdateNotified) return;
        console.info("[SW] Controller changed, refreshing app");
        setTimeout(() => window.location.reload(), 500);
      });
    });
  },

  notifyServiceWorkerUpdate(worker) {
    if (this.swUpdateNotified) return;
    this.swUpdateNotified = true;
    if (worker && worker.state === "installed" && worker.postMessage) {
      worker.postMessage({ type: "SKIP_WAITING" });
    }
    try {
      UI.toast("Új verzió érkezett, frissítés…");
    } catch (error) {
      console.info("[SW] Update available");
    }
  },
};

/* ======================================================================
   Bootstrapping
   ====================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
