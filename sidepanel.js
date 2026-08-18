const STORAGE_KEY = "handyTestData";
const THEME_KEY = "handyTheme";
const CHROME_COLOR_KEY = "handyChromeColor";
const SEED_VARS = [
  "--seed-bg",
  "--seed-surface",
  "--seed-ink",
  "--seed-muted",
  "--seed-faint",
  "--seed-line",
  "--seed-fill",
  "--seed-fill-hover",
  "--seed-accent",
  "--seed-accent-hover",
  "--seed-accent-soft",
  "--seed-on-accent",
];
const CHROME_COLOR_CHIPS = [
  { name: "Default", hex: "" },
  { name: "Blue", hex: "#8cabe4" },
  { name: "Grey", hex: "#888888" },
  { name: "Aqua", hex: "#26a69a" },
  { name: "Green", hex: "#00ff00" },
  { name: "Viridian", hex: "#87ba81" },
  { name: "Citron", hex: "#fadf73" },
  { name: "Orange", hex: "#ff8000" },
  { name: "Apricot", hex: "#fcdbc9" },
  { name: "Rose", hex: "#f3b2be" },
  { name: "Fuchsia", hex: "#ff00ff" },
  { name: "Violet", hex: "#e5d5fc" },
];
const MODE_KEY = "handyMode";
const SCRAP_KEY = "handyScrap";
const SCRAP_TAB_KEY = "handyScrapTab";
const UNORGANISED_KEY = "handyUnorganised";
const SHORTCUT_KEY = "handyShortcut";
const DEFAULT_SHORTCUT = {
  alt: true,
  ctrl: false,
  shift: true,
  meta: false,
  code: "KeyS",
};

const headerBlurb = document.getElementById("header-blurb");
const modeSwitch = document.getElementById("mode-switch");
const modeUseBtn = document.getElementById("mode-use");
const modeScrapBtn = document.getElementById("mode-scrap");
const useMode = document.getElementById("use-mode");
const scrapMode = document.getElementById("scrap-mode");
const settingsView = document.getElementById("settings-view");
const settingsToggle = document.getElementById("settings-toggle");
const pasteInput = document.getElementById("paste-input");
const pasteCard = document.querySelector("#use-mode .paste-card");
const pasteToggle = document.getElementById("paste-toggle");
const themeToggle = document.getElementById("theme-toggle");
const loadBtn = document.getElementById("load-btn");
const clearBtn = document.getElementById("clear-btn");
const statusMessage = document.getElementById("status-message");
const results = document.getElementById("results");
const rowSelect = document.getElementById("row-select");
const rowSubtitle = document.getElementById("row-subtitle");
const fields = document.getElementById("fields");
const emptyState = document.getElementById("empty-state");
const toast = document.getElementById("toast");
const scrapHeadered = document.getElementById("scrap-headered");
const scrapUnorganised = document.getElementById("scrap-unorganised");
const scrapTabHeaderedBtn = document.getElementById("scrap-tab-headered");
const scrapTabUnorganisedBtn = document.getElementById("scrap-tab-unorganised");
const scrapHeaderCard = document.querySelector("#scrap-mode .paste-card");
const scrapHeaderToggle = document.getElementById("scrap-header-toggle");
const scrapHeaderInput = document.getElementById("scrap-header-input");
const scrapSetHeadersBtn = document.getElementById("scrap-set-headers");
const scrapUseHeadersBtn = document.getElementById("scrap-use-headers");
const scrapClearHeadersBtn = document.getElementById("scrap-clear-headers");
const scrapStatus = document.getElementById("scrap-status");
const scrapForm = document.getElementById("scrap-form");
const scrapRowPrevBtn = document.getElementById("scrap-row-prev");
const scrapRowChips = document.getElementById("scrap-row-chips");
const scrapRowNextBtn = document.getElementById("scrap-row-next");
const scrapFields = document.getElementById("scrap-fields");
const scrapCapture = document.getElementById("scrap-capture");
const scrapCaptureActions = document.getElementById("scrap-capture-actions");
const scrapActions = document.getElementById("scrap-actions");
const scrapIncludeHeader = document.getElementById("scrap-include-header");
const scrapCopyBtn = document.getElementById("scrap-copy");
const scrapAddRowBtn = document.getElementById("scrap-add-row");
const scrapClearValuesBtn = document.getElementById("scrap-clear-values");
const scrapClearAllBtn = document.getElementById("scrap-clear-all");
const scrapEmpty = document.getElementById("scrap-empty");
const unorgHint = document.getElementById("unorg-hint");
const unorgList = document.getElementById("unorg-list");
const unorgAsLabelBtn = document.getElementById("unorg-as-label");
const unorgAsValueToLastBtn = document.getElementById("unorg-as-value-to-last");
const unorgAsValueBtn = document.getElementById("unorg-as-value");
const unorgStatus = document.getElementById("unorg-status");
const shortcutDisplay = document.getElementById("shortcut-display");
const shortcutRecordBtn = document.getElementById("shortcut-record");
const shortcutResetBtn = document.getElementById("shortcut-reset");
const shortcutStatus = document.getElementById("shortcut-status");
const chromeColorChips = document.getElementById("chrome-color-chips");
const chromeColorCustom = document.getElementById("chrome-color-custom");

let mode = "use";
let settingsOpen = false;
let scrapTab = "headered";
let dataset = { headers: [], rows: [] };
let selectedIndex = 0;
let pasteOpen = true;
let scrapHeaderOpen = true;
let scrap = { headers: [], rows: [], selectedRow: 0, includeHeader: false };
let unorganised = [];
let shortcut = DEFAULT_SHORTCUT;
let recordingShortcut = false;
let scrapSaveTimer = 0;
let unorgSaveTimer = 0;
let toastTimer = 0;
let scrapFocusIndex = null;
let themePreference = "chrome";
let chromeSeed = "";
const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

modeUseBtn.addEventListener("click", () => setMode("use", true));
modeScrapBtn.addEventListener("click", () => setMode("scrap", true));
scrapTabHeaderedBtn.addEventListener("click", () => setScrapTab("headered", true));
scrapTabUnorganisedBtn.addEventListener("click", () => setScrapTab("unorganised", true));
settingsToggle.addEventListener("click", toggleSettings);
pasteToggle.addEventListener("click", () => setPasteOpen(!pasteOpen, true));
themeToggle.addEventListener("click", toggleTheme);
loadBtn.addEventListener("click", () => loadFromText(pasteInput.value));
clearBtn.addEventListener("click", clearAll);
rowSelect.addEventListener("change", () => {
  selectedIndex = Number.parseInt(rowSelect.value, 10) || 0;
  renderSelectedRow();
  persist();
});
pasteInput.addEventListener("paste", (event) => {
  const text = event.clipboardData?.getData("text/plain");
  if (!text) {
    return;
  }
  event.preventDefault();
  pasteInput.value = text;
  loadFromText(text);
});
scrapHeaderToggle.addEventListener("click", () => setScrapHeaderOpen(!scrapHeaderOpen, true));
scrapSetHeadersBtn.addEventListener("click", () => setScrapHeadersFromText(scrapHeaderInput.value));
scrapUseHeadersBtn.addEventListener("click", useTableHeadersFromUseMode);
scrapClearHeadersBtn.addEventListener("click", clearScrapHeaders);
scrapClearValuesBtn.addEventListener("click", clearScrapValues);
scrapClearAllBtn.addEventListener("click", clearOrDeleteAll);
scrapAddRowBtn.addEventListener("click", addScrapRow);
scrapRowPrevBtn.addEventListener("click", () => stepScrapRow(-1));
scrapRowNextBtn.addEventListener("click", () => stepScrapRow(1));
scrapCopyBtn.addEventListener("click", copyScrapRow);
scrapIncludeHeader.addEventListener("change", () => {
  scrap.includeHeader = scrapIncludeHeader.checked;
  persistScrap();
});
scrapHeaderInput.addEventListener("paste", (event) => {
  const text = event.clipboardData?.getData("text/plain");
  if (!text) {
    return;
  }
  event.preventDefault();
  scrapHeaderInput.value = text;
  setScrapHeadersFromText(text);
});
unorgAsLabelBtn.addEventListener("click", () => captureSelectedText("label"));
unorgAsValueToLastBtn.addEventListener("click", () => captureSelectedText("value-to-last"));
unorgAsValueBtn.addEventListener("click", () => captureSelectedText("value"));
shortcutRecordBtn.addEventListener("click", startShortcutRecording);
shortcutResetBtn.addEventListener("click", resetShortcut);
chromeColorChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".chrome-color-chip");
  if (!chip) {
    return;
  }
  const color = chip.dataset.color ?? "";
  setChromeSeed(color ? `#${color}` : "");
});
chromeColorCustom.addEventListener("input", () => {
  setChromeSeed(chromeColorCustom.value, { rebuildChips: false });
});
document.addEventListener("keydown", onGlobalKeydown);

chrome.runtime.onMessage.addListener((message) => {
  if (!message) {
    return;
  }
  if (message.type === "unorganised-added") {
    applyUnorganisedFromStorage(message.items, message.item, message.addedAs);
    return;
  }
  if (message.type === "headered-updated") {
    const header = message.item?.header ? String(message.item.header) : "";
    showToast(header ? `Added to ${truncate(header, 32)}` : "Added to Headered row");
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }
  if (changes[UNORGANISED_KEY]) {
    applyUnorganisedFromStorage(changes[UNORGANISED_KEY].newValue?.items);
  }
  if (changes[SCRAP_KEY]) {
    applyScrapFromStorage(changes[SCRAP_KEY].newValue);
  }
});

applyTheme("chrome");
renderChromeColorChips();
restoreTheme().catch((error) => {
  console.error("Failed to restore theme", error);
});
colorSchemeQuery.addEventListener("change", () => {
  if (themePreference === "chrome") {
    applyTheme("chrome");
  }
});
restoreAll().catch((error) => {
  console.error("Failed to restore saved data", error);
});

function persistScrapTabIfNeeded() {
  if (mode === "scrap" && scrapTab !== "unorganised") {
    setScrapTab("unorganised", true);
  } else {
    syncScrapActions();
  }
}

function unorganisedFingerprint(items) {
  return JSON.stringify(
    sanitizeUnorganisedItems(items).map((item) => ({ id: item.id, label: item.label, value: item.value }))
  );
}

function applyUnorganisedFromStorage(items, scrapedItem, addedAs) {
  const incoming = sanitizeUnorganisedItems(items);
  const previousFilled = filledUnorganisedItems().length;
  if (unorganisedFingerprint(incoming) === unorganisedFingerprint(unorganised)) {
    if (scrapedItem) {
      showToast(toastForScrapedItem(scrapedItem, addedAs));
      persistScrapTabIfNeeded();
    }
    return;
  }

  unorganised = incoming;
  ensureTrailingEmptyItem();
  renderUnorganised();
  persistScrapTabIfNeeded();

  const nextFilled = filledUnorganisedItems();
  if (scrapedItem || nextFilled.length > previousFilled) {
    showToast(toastForScrapedItem(scrapedItem || nextFilled[nextFilled.length - 1], addedAs));
  }
}

function toastForScrapedItem(item, addedAs) {
  const label = item?.label ? String(item.label) : "";
  if (addedAs === "label") {
    return label ? `Added label “${truncate(label, 32)}”` : "Added label";
  }
  if (addedAs === "value") {
    return label ? `Added value to “${truncate(label, 32)}”` : "Added value";
  }
  return label ? `Scraped ${truncate(label, 32)}` : "Added value";
}

function setMode(next, persistChange = false) {
  mode = next === "scrap" ? "scrap" : "use";
  settingsOpen = false;
  renderShell();
  if (persistChange) {
    persistMode();
  }
}

function setScrapTab(next, persistChange = false) {
  scrapTab = next === "unorganised" ? "unorganised" : "headered";
  scrapTabHeaderedBtn.classList.toggle("active", scrapTab === "headered");
  scrapTabUnorganisedBtn.classList.toggle("active", scrapTab === "unorganised");
  scrapTabHeaderedBtn.setAttribute("aria-pressed", scrapTab === "headered" ? "true" : "false");
  scrapTabUnorganisedBtn.setAttribute("aria-pressed", scrapTab === "unorganised" ? "true" : "false");
  scrapHeadered.classList.toggle("hidden", scrapTab !== "headered");
  scrapUnorganised.classList.toggle("hidden", scrapTab !== "unorganised");
  updateHeaderBlurb();
  syncScrapActions();
  if (persistChange) {
    persistScrapTab();
  }
}

function toggleSettings() {
  settingsOpen = !settingsOpen;
  recordingShortcut = false;
  shortcutRecordBtn.textContent = "Record shortcut";
  renderShell();
}

function renderShell() {
  const isScrap = mode === "scrap";
  useMode.classList.toggle("hidden", settingsOpen || isScrap);
  scrapMode.classList.toggle("hidden", settingsOpen || !isScrap);
  settingsView.classList.toggle("hidden", !settingsOpen);
  modeSwitch.classList.toggle("hidden", settingsOpen);
  modeUseBtn.classList.toggle("active", !isScrap);
  modeScrapBtn.classList.toggle("active", isScrap);
  modeUseBtn.setAttribute("aria-pressed", isScrap ? "false" : "true");
  modeScrapBtn.setAttribute("aria-pressed", isScrap ? "true" : "false");
  settingsToggle.textContent = settingsOpen ? "Back" : "Settings";
  settingsToggle.setAttribute("aria-label", settingsOpen ? "Close settings" : "Open settings");
  updateHeaderBlurb();
  updateUseHeadersButton();
  syncScrapActions();
}

function updateHeaderBlurb() {
  if (settingsOpen) {
    headerBlurb.textContent = "Pick a Chrome color. Changes apply immediately.";
    return;
  }
  if (mode !== "scrap") {
    headerBlurb.textContent = "Paste a table. Click a value to copy.";
    return;
  }
  headerBlurb.textContent =
    scrapTab === "unorganised"
      ? `Select text, then right-click or press ${formatShortcut(shortcut)}.`
      : "Paste headers. Fill fields. Copy as an Excel row.";
}

function loadFromText(raw) {
  const parsed = parseExcelPaste(raw);
  if (parsed.error) {
    dataset = { headers: [], rows: [] };
    selectedIndex = 0;
    setStatus(parsed.error, true);
    setPasteOpen(true);
    render();
    persist();
    return;
  }

  dataset = { headers: parsed.headers, rows: parsed.rows };
  selectedIndex = 0;
  setStatus(`Loaded ${parsed.rows.length} test data set${parsed.rows.length === 1 ? "" : "s"}.`);
  setPasteOpen(false);
  render();
  persist();
}

function render() {
  const hasRows = dataset.rows.length > 0;
  results.classList.toggle("hidden", !hasRows);
  emptyState.classList.toggle("hidden", hasRows);

  if (!hasRows) {
    rowSelect.replaceChildren();
    fields.replaceChildren();
    rowSubtitle.textContent = "";
    updateUseHeadersButton();
    return;
  }

  renderDropdown();
  renderSelectedRow();
  updateUseHeadersButton();
}

function renderDropdown() {
  rowSelect.replaceChildren();
  dataset.rows.forEach((row, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `Test Data ${index + 1}`;
    rowSelect.append(option);
  });
  if (selectedIndex < 0 || selectedIndex >= dataset.rows.length) {
    selectedIndex = 0;
  }
  rowSelect.value = String(selectedIndex);
}

function renderSelectedRow() {
  const row = dataset.rows[selectedIndex] || [];
  const scenario = firstMeaningfulValue(row);
  rowSubtitle.textContent = scenario ? scenario : `Row ${selectedIndex + 1}`;

  fields.replaceChildren();
  dataset.headers.forEach((header, columnIndex) => {
    const value = row[columnIndex] ?? "";
    const card = document.createElement("button");
    card.type = "button";
    card.className = "field-card";
    card.addEventListener("click", () => copyValue(value, card));

    const nameEl = document.createElement("span");
    nameEl.className = "field-name";
    nameEl.textContent = header;

    const valueEl = document.createElement("span");
    valueEl.className = value ? "field-value" : "field-value empty";
    valueEl.textContent = value || "(empty)";

    card.append(nameEl, valueEl);
    fields.append(card);
  });
}

function firstMeaningfulValue(row) {
  return row.find((cell) => cell && cell.trim() !== "") || "";
}

async function copyValue(value, card) {
  const text = value || "";
  try {
    await navigator.clipboard.writeText(text);
    card.classList.add("copied");
    window.setTimeout(() => card.classList.remove("copied"), 350);
    showToast(text ? `Copied: ${truncate(text, 48)}` : "Copied empty value");
  } catch (error) {
    console.error("Clipboard write failed", error);
    setStatus("Could not copy. Try again.", true);
  }
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", Boolean(isError));
  statusMessage.classList.toggle("ok", Boolean(message) && !isError);
}

function setScrapStatus(message, isError = false) {
  scrapStatus.textContent = message;
  scrapStatus.classList.toggle("error", Boolean(isError));
  scrapStatus.classList.toggle("ok", Boolean(message) && !isError);
}

function setUnorgStatus(message, isError = false) {
  unorgStatus.textContent = message;
  unorgStatus.classList.toggle("error", Boolean(isError));
  unorgStatus.classList.toggle("ok", Boolean(message) && !isError);
}

function setPasteOpen(open, persistChange = false) {
  pasteOpen = Boolean(open);
  pasteCard.classList.toggle("collapsed", !pasteOpen);
  pasteToggle.setAttribute("aria-expanded", pasteOpen ? "true" : "false");
  if (persistChange) {
    persist();
  }
}

function setScrapHeaderOpen(open, persistChange = false) {
  scrapHeaderOpen = Boolean(open);
  scrapHeaderCard.classList.toggle("collapsed", !scrapHeaderOpen);
  scrapHeaderToggle.setAttribute("aria-expanded", scrapHeaderOpen ? "true" : "false");
  if (persistChange) {
    persistScrap();
  }
}

function setScrapHeadersFromText(raw) {
  const parsed = parseHeaderRow(raw);
  if (parsed.error) {
    setScrapStatus(parsed.error, true);
    setScrapHeaderOpen(true);
    persistScrap();
    return;
  }

  applyScrapHeaders(parsed.headers, `Ready: ${parsed.headers.length} field${parsed.headers.length === 1 ? "" : "s"}.`);
}

function useTableHeadersFromUseMode() {
  if (!dataset.headers.length) {
    setScrapStatus("Load a table in Use mode first.", true);
    setScrapHeaderOpen(true);
    return;
  }

  scrapHeaderInput.value = toExcelRow(dataset.headers);
  applyScrapHeaders(dataset.headers, "Using headers from Use mode.");
}

function applyScrapHeaders(headers, message) {
  const previousHeaders = scrap.headers.slice();
  const previousRows = normalizeScrapRows(previousHeaders, scrap.rows);
  scrap.headers = headers.slice(0, MAX_COLUMNS).map((header) => String(header ?? "").slice(0, MAX_CELL_LENGTH));
  scrap.rows = (previousRows.length ? previousRows : [emptyScrapRow()]).map((row) => {
    const previous = new Map(previousHeaders.map((name, index) => [name, row[index] ?? ""]));
    return scrap.headers.map((name) => String(previous.get(name) ?? "").slice(0, MAX_CELL_LENGTH));
  });
  if (!scrap.rows.length) {
    scrap.rows = [emptyScrapRow()];
  }
  scrap.selectedRow = Math.min(Math.max(0, scrap.selectedRow || 0), scrap.rows.length - 1);
  clearScrapFocus();
  setScrapStatus(message);
  setScrapHeaderOpen(false);
  renderScrap();
  persistScrap();
}

function emptyScrapRow() {
  return scrap.headers.map(() => "");
}

function normalizeScrapRows(headers, rows) {
  const width = headers.length;
  if (!width) {
    return [];
  }
  const source = Array.isArray(rows) && rows.length ? rows : [headers.map(() => "")];
  return source.slice(0, MAX_ROWS).map((row) => headers.map((_, index) => String(row?.[index] ?? "").slice(0, MAX_CELL_LENGTH)));
}

function ensureScrapRows() {
  if (!scrap.headers.length) {
    scrap.rows = [];
    scrap.selectedRow = 0;
    return;
  }
  scrap.rows = normalizeScrapRows(scrap.headers, scrap.rows);
  if (!scrap.rows.length) {
    scrap.rows = [emptyScrapRow()];
  }
  scrap.selectedRow = Math.min(Math.max(0, Number(scrap.selectedRow) || 0), scrap.rows.length - 1);
}

function currentScrapRow() {
  ensureScrapRows();
  return scrap.rows[scrap.selectedRow] || emptyScrapRow();
}

function addScrapRow() {
  ensureScrapRows();
  if (!scrap.headers.length) {
    return;
  }
  if (scrap.rows.length >= MAX_ROWS) {
    setScrapStatus(`Too many rows (max ${MAX_ROWS}).`, true);
    return;
  }
  scrap.rows.push(emptyScrapRow());
  scrap.selectedRow = scrap.rows.length - 1;
  clearScrapFocus();
  renderScrap();
  persistScrap();
}

function selectScrapRow(index) {
  ensureScrapRows();
  scrap.selectedRow = Math.min(Math.max(0, index), Math.max(0, scrap.rows.length - 1));
  clearScrapFocus();
  renderScrap();
  persistScrap();
}

function stepScrapRow(delta) {
  selectScrapRow((scrap.selectedRow || 0) + delta);
}

function renderScrap() {
  const hasHeaders = scrap.headers.length > 0;
  ensureScrapRows();
  scrapForm.classList.toggle("hidden", !hasHeaders);
  scrapEmpty.classList.toggle("hidden", hasHeaders);
  scrapIncludeHeader.checked = Boolean(scrap.includeHeader);
  syncScrapActions();

  scrapFields.replaceChildren();
  if (!hasHeaders) {
    scrapRowChips.replaceChildren();
    scrapCaptureActions.replaceChildren();
    clearScrapFocus();
    return;
  }

  renderScrapRowSwitch();

  const row = currentScrapRow();
  scrap.headers.forEach((header, index) => {
    const field = document.createElement("label");
    field.className = "scrap-field";

    const nameEl = document.createElement("span");
    nameEl.className = "field-name";
    nameEl.textContent = header;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = MAX_CELL_LENGTH;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = row[index] ?? "";
    input.addEventListener("input", () => {
      scrap.rows[scrap.selectedRow][index] = input.value.slice(0, MAX_CELL_LENGTH);
      if (scrapFocusIndex === index) {
        clearScrapFocus();
      }
      updateHeaderedCaptureButtons();
      scheduleScrapSave();
    });
    input.addEventListener("focus", () => {
      scrapFocusIndex = index;
      updateHeaderedCaptureButtons();
    });

    field.append(nameEl, input);
    scrapFields.append(field);
  });
  updateHeaderedCaptureButtons();
}

function renderScrapRowSwitch() {
  scrapRowPrevBtn.disabled = scrap.selectedRow <= 0;
  scrapRowNextBtn.disabled = scrap.selectedRow >= scrap.rows.length - 1;
  scrapRowChips.replaceChildren();

  scrap.rows.forEach((_row, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "row-chip";
    chip.textContent = `R${index + 1}`;
    chip.setAttribute("aria-pressed", index === scrap.selectedRow ? "true" : "false");
    chip.classList.toggle("active", index === scrap.selectedRow);
    chip.addEventListener("click", () => selectScrapRow(index));
    scrapRowChips.append(chip);
  });

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(scrollRowChipsToActive);
  });
}

function scrollRowChipsToActive() {
  const chips = [...scrapRowChips.querySelectorAll(".row-chip")];
  const index = scrap.selectedRow;
  const active = chips[index];
  if (!active) {
    return;
  }

  const viewport = scrapRowChips.clientWidth;
  if (viewport <= 0) {
    return;
  }

  const prev = chips[Math.max(0, index - 1)];
  const next = chips[Math.min(chips.length - 1, index + 1)];
  const left = prev.offsetLeft;
  const right = next.offsetLeft + next.offsetWidth;
  const groupWidth = right - left;
  const target = left - Math.max(8, (viewport - groupWidth) / 2);
  const maxScroll = Math.max(0, scrapRowChips.scrollWidth - viewport);
  scrapRowChips.scrollLeft = Math.max(0, Math.min(target, maxScroll));
}

function scheduleScrapSave() {
  window.clearTimeout(scrapSaveTimer);
  scrapSaveTimer = window.setTimeout(() => {
    persistScrap();
  }, 300);
}

function isBlankUnorganisedItem(item) {
  return !String(item?.label ?? "").trim() && !String(item?.value ?? "").trim();
}

function filledUnorganisedItems() {
  return unorganised.filter((item) => !isBlankUnorganisedItem(item));
}

function ensureTrailingEmptyItem() {
  if (unorganised.length >= MAX_UNORGANISED_ITEMS) {
    return false;
  }
  if (unorganised.length === 0 || !isBlankUnorganisedItem(unorganised[unorganised.length - 1])) {
    unorganised.push({ id: crypto.randomUUID(), label: "", value: "" });
    return true;
  }
  return false;
}

function renderUnorganised() {
  ensureTrailingEmptyItem();
  unorgHint.textContent = unorganisedHintText();
  unorgList.replaceChildren();
  unorganised.forEach((item, index) => {
    unorgList.append(createUnorganisedCard(item, index));
  });
  updateUnorgCaptureButtons();
  syncScrapActions();
}

function createUnorganisedCard(item, index) {
  const card = document.createElement("div");
  card.className = "scrap-field unorg-item";

  const labelField = document.createElement("label");
  const labelName = document.createElement("span");
  labelName.className = "field-name";
  labelName.textContent = "Label";
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.maxLength = MAX_CELL_LENGTH;
  labelInput.autocomplete = "off";
  labelInput.spellcheck = false;
  labelInput.placeholder = "Column name";
  labelInput.value = item.label;
  labelInput.addEventListener("input", () => {
    unorganised[index].label = labelInput.value.slice(0, MAX_CELL_LENGTH);
    maybeAppendEmptyField();
    updateUnorgCaptureButtons();
    scheduleUnorgSave();
  });
  labelField.append(labelName, labelInput);

  const valueField = document.createElement("label");
  const valueName = document.createElement("span");
  valueName.className = "field-name";
  valueName.textContent = "Value";
  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.maxLength = MAX_CELL_LENGTH;
  valueInput.autocomplete = "off";
  valueInput.spellcheck = false;
  valueInput.placeholder = "Scraped text";
  valueInput.value = item.value;
  valueInput.addEventListener("input", () => {
    unorganised[index].value = valueInput.value.slice(0, MAX_CELL_LENGTH);
    maybeAppendEmptyField();
    scheduleUnorgSave();
  });
  valueField.append(valueName, valueInput);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "unorg-close";
  removeBtn.setAttribute("aria-label", "Remove");
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => removeUnorganisedItem(item.id));

  card.append(removeBtn, labelField, valueField);
  return card;
}

function maybeAppendEmptyField() {
  if (!ensureTrailingEmptyItem()) {
    return;
  }
  const index = unorganised.length - 1;
  unorgList.append(createUnorganisedCard(unorganised[index], index));
  updateUnorgCaptureButtons();
  syncScrapActions();
}

function scheduleUnorgSave() {
  window.clearTimeout(unorgSaveTimer);
  unorgSaveTimer = window.setTimeout(() => {
    persistUnorganised();
  }, 300);
}

function captureSelectedText(as, fieldIndex) {
  chrome.runtime.sendMessage({ type: "scrap-active-tab", as, fieldIndex }, (result) => {
    const setter = as === "headered" ? setScrapStatus : setUnorgStatus;
    if (chrome.runtime.lastError) {
      setter("Could not scrap selection. Refresh the page and try again.", true);
      return;
    }
    if (result?.duplicate) {
      return;
    }
    if (result?.ok) {
      if (as === "headered" && fieldIndex === scrapFocusIndex) {
        clearScrapFocus();
        updateHeaderedCaptureButtons();
      }
      return;
    }
    setter(captureErrorMessage(result?.error), true);
  });
}

function updateHeaderedCaptureButtons() {
  if (!scrapCaptureActions) {
    return;
  }
  ensureScrapRows();
  const targets = headeredCaptureTargets();
  scrapCaptureActions.replaceChildren();
  if (!targets.length) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "ghost";
    empty.disabled = true;
    empty.textContent = "All Fields Filled";
    scrapCaptureActions.append(empty);
    return;
  }
  targets.forEach((target) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = target.header.trim() || `Column ${target.index + 1}`;
    button.title = `Add selected text to ${button.textContent}`;
    button.addEventListener("click", () => captureSelectedText("headered", target.index));
    scrapCaptureActions.append(button);
  });
}

function headeredCaptureTargets() {
  const row = currentScrapRow();
  const next = nextUnfilledFields(scrap.headers, row, 3);
  if (
    Number.isInteger(scrapFocusIndex) &&
    scrapFocusIndex >= 0 &&
    scrapFocusIndex < scrap.headers.length
  ) {
    const rest = next.filter((field) => field.index !== scrapFocusIndex).slice(0, 2);
    return [
      {
        index: scrapFocusIndex,
        header: String(scrap.headers[scrapFocusIndex] ?? ""),
      },
      ...rest,
    ];
  }
  return next;
}

function clearScrapFocus() {
  scrapFocusIndex = null;
}

function captureErrorMessage(error) {
  if (error === "empty") {
    return "Select text on the page first, then choose how to add it.";
  }
  if (error === "no-label") {
    return "Add a label first.";
  }
  if (error === "no-headers") {
    return "Set headers first.";
  }
  if (error === "full") {
    return scrapTab === "headered" ? "All fields in this row are filled." : `Too many items (max ${MAX_UNORGANISED_ITEMS}).`;
  }
  return "Could not scrap selection.";
}

function lastLabeledUnorganisedItem() {
  for (let index = unorganised.length - 1; index >= 0; index -= 1) {
    const label = String(unorganised[index]?.label ?? "").trim();
    if (label) {
      return unorganised[index];
    }
  }
  return null;
}

function updateUnorgCaptureButtons() {
  const last = lastLabeledUnorganisedItem();
  if (!last) {
    unorgAsValueToLastBtn.disabled = true;
    unorgAsValueToLastBtn.textContent = "As Value To Last Label";
    unorgAsValueToLastBtn.removeAttribute("title");
    return;
  }
  unorgAsValueToLastBtn.disabled = false;
  unorgAsValueToLastBtn.textContent = `As Value To ${truncate(last.label, 18)}`;
  unorgAsValueToLastBtn.title = `Add selected text as value to ${last.label}`;
}

function removeUnorganisedItem(id) {
  unorganised = unorganised.filter((item) => item.id !== id);
  ensureTrailingEmptyItem();
  renderUnorganised();
  persistUnorganised();
}

function clearScrapValues() {
  if (scrapTab === "unorganised") {
    unorganised = unorganised.map((item) => ({ ...item, value: "" }));
    ensureTrailingEmptyItem();
    renderUnorganised();
    persistUnorganised();
    return;
  }
  ensureScrapRows();
  if (!scrap.rows.length) {
    return;
  }
  scrap.rows[scrap.selectedRow] = emptyScrapRow();
  renderScrap();
  persistScrap();
}

function clearUnorganisedAll() {
  unorganised = [];
  ensureTrailingEmptyItem();
  renderUnorganised();
  persistUnorganised();
}

function deleteAllScrapRows() {
  ensureScrapRows();
  scrap.rows = [emptyScrapRow()];
  scrap.selectedRow = 0;
  clearScrapFocus();
  renderScrap();
  persistScrap();
}

function clearOrDeleteAll() {
  if (scrapTab === "unorganised") {
    clearUnorganisedAll();
    return;
  }
  deleteAllScrapRows();
}

function clearScrapHeaders() {
  scrapHeaderInput.value = "";
  scrap = { headers: [], rows: [], selectedRow: 0, includeHeader: scrap.includeHeader };
  clearScrapFocus();
  setScrapStatus("");
  setScrapHeaderOpen(true);
  renderScrap();
  persistScrap();
}

function currentCopyRows() {
  if (scrapTab === "unorganised") {
    const filled = filledUnorganisedItems();
    const headers = uniqueHeaders(filled.map((item, index) => item.label.trim() || `Column ${index + 1}`));
    const values = filled.map((item) => item.value);
    return { headers, rows: [values] };
  }
  ensureScrapRows();
  return {
    headers: scrap.headers,
    rows: scrap.rows.map((row) => scrap.headers.map((_, index) => row[index] ?? "")),
  };
}

async function copyScrapRow() {
  const data = currentCopyRows();
  if (data.headers.length === 0) {
    const setter = scrapTab === "unorganised" ? setUnorgStatus : setScrapStatus;
    setter("Nothing to copy yet.", true);
    return;
  }

  const body =
    scrapTab === "unorganised"
      ? data.rows
      : data.rows.filter((row) => row.some((cell) => String(cell).trim()));
  if (!body.length && !scrap.includeHeader) {
    const setter = scrapTab === "unorganised" ? setUnorgStatus : setScrapStatus;
    setter("Nothing to copy yet.", true);
    return;
  }

  const lines = body.map((row) => toExcelRow(row));
  if (scrap.includeHeader) {
    lines.unshift(toExcelRow(data.headers));
  }

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    const count = body.length;
    const rowWord = count === 1 ? "row" : "rows";
    showToast(scrap.includeHeader ? `Copied header and ${count} ${rowWord}` : `Copied ${count} ${rowWord}`);
  } catch (error) {
    console.error("Clipboard write failed", error);
    const setter = scrapTab === "unorganised" ? setUnorgStatus : setScrapStatus;
    setter("Could not copy. Try again.", true);
  }
}

function startShortcutRecording() {
  recordingShortcut = true;
  shortcutRecordBtn.textContent = "Press a shortcut…";
  shortcutStatus.textContent = "Hold a modifier (Alt, Ctrl, Shift, or Cmd) plus a key.";
  shortcutStatus.classList.remove("error", "ok");
}

function resetShortcut() {
  recordingShortcut = false;
  shortcutRecordBtn.textContent = "Record shortcut";
  shortcut = { ...DEFAULT_SHORTCUT };
  applyShortcut(shortcut);
  persistShortcut();
  shortcutStatus.textContent = "Reset to Alt + Shift + S.";
  shortcutStatus.classList.remove("error");
  shortcutStatus.classList.add("ok");
}

function onGlobalKeydown(event) {
  if (recordingShortcut) {
    handleShortcutRecording(event);
    return;
  }
  if (event.repeat || !matchesShortcut(event, shortcut)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  chrome.runtime.sendMessage({ type: "scrap-active-tab", as: scrapTab === "headered" ? "headered" : undefined }, (result) => {
    if (chrome.runtime.lastError) {
      showToast("Could not scrap selection. Refresh the page and try again.");
      return;
    }
    if (result?.duplicate) {
      return;
    }
    if (!result?.ok) {
      showToast(captureErrorMessage(result?.error));
    }
  });
}

function handleShortcutRecording(event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.key === "Escape") {
    recordingShortcut = false;
    shortcutRecordBtn.textContent = "Record shortcut";
    shortcutStatus.textContent = "Recording cancelled.";
    shortcutStatus.classList.remove("ok", "error");
    return;
  }
  if (event.repeat || isModifierCode(event.code)) {
    return;
  }
  const next = {
    alt: event.altKey,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    code: event.code,
  };
  if (!next.alt && !next.ctrl && !next.shift && !next.meta) {
    shortcutStatus.textContent = "Include at least one modifier key.";
    shortcutStatus.classList.add("error");
    shortcutStatus.classList.remove("ok");
    return;
  }
  recordingShortcut = false;
  shortcutRecordBtn.textContent = "Record shortcut";
  shortcut = next;
  applyShortcut(shortcut);
  persistShortcut();
  shortcutStatus.textContent = `Saved ${formatShortcut(shortcut)}.`;
  shortcutStatus.classList.remove("error");
  shortcutStatus.classList.add("ok");
}

function matchesShortcut(event, combo) {
  return (
    event.altKey === combo.alt &&
    event.ctrlKey === combo.ctrl &&
    event.shiftKey === combo.shift &&
    event.metaKey === combo.meta &&
    (event.code === combo.code || keyMatchesCode(event.key, combo.code))
  );
}

function keyMatchesCode(key, code) {
  if (typeof key !== "string" || key.length !== 1 || typeof code !== "string") {
    return false;
  }
  if (code.startsWith("Key")) {
    return key.toLowerCase() === code.slice(3).toLowerCase();
  }
  if (code.startsWith("Digit")) {
    return key === code.slice(5);
  }
  return false;
}

function isModifierCode(code) {
  return (
    code === "ShiftLeft" ||
    code === "ShiftRight" ||
    code === "ControlLeft" ||
    code === "ControlRight" ||
    code === "AltLeft" ||
    code === "AltRight" ||
    code === "MetaLeft" ||
    code === "MetaRight"
  );
}

function applyShortcut(value) {
  shortcut = normalizeShortcut(value);
  shortcutDisplay.textContent = formatShortcut(shortcut);
  updateHeaderBlurb();
  if (unorgHint) {
    unorgHint.textContent = unorganisedHintText();
  }
}

function normalizeShortcut(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SHORTCUT };
  }
  const code = typeof value.code === "string" ? value.code : "";
  if (!code || code.length > 32) {
    return { ...DEFAULT_SHORTCUT };
  }
  const next = {
    alt: Boolean(value.alt),
    ctrl: Boolean(value.ctrl),
    shift: Boolean(value.shift),
    meta: Boolean(value.meta),
    code,
  };
  if (!next.alt && !next.ctrl && !next.shift && !next.meta) {
    return { ...DEFAULT_SHORTCUT };
  }
  return next;
}

function unorganisedHintText() {
  return `Select text on a page, then press ${formatShortcut(shortcut)} or use Add selected text below.`;
}

function formatShortcut(value) {
  const combo = normalizeShortcut(value);
  const parts = [];
  if (combo.ctrl) {
    parts.push("Ctrl");
  }
  if (combo.alt) {
    parts.push("Alt");
  }
  if (combo.shift) {
    parts.push("Shift");
  }
  if (combo.meta) {
    parts.push("Cmd");
  }
  parts.push(codeToLabel(combo.code));
  return parts.join(" + ");
}

function codeToLabel(code) {
  if (code.startsWith("Key")) {
    return code.slice(3);
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  return code.replace(/Left|Right/, "");
}

function normalizeTheme(theme) {
  return theme === "dark" || theme === "light" || theme === "chrome" ? theme : "chrome";
}

function normalizeHex(value) {
  if (typeof value !== "string") {
    return "";
  }
  const hex = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : "";
}

function hexToHsl(hex) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }
  return { h: hue * 60, s: saturation * 100, l: lightness * 100 };
}

function hsl(h, s, l) {
  return `hsl(${Math.round(h)} ${Math.round(Math.min(100, Math.max(0, s)))}% ${Math.round(
    Math.min(100, Math.max(0, l))
  )}%)`;
}

function paletteFromSeed(hex, dark) {
  const { h, s } = hexToHsl(hex);
  const mutedSat = Math.min(38, Math.max(16, s * 0.55));
  const accentSat = Math.min(72, Math.max(36, s));
  if (dark) {
    return {
      "--seed-bg": hsl(h, mutedSat, 18),
      "--seed-surface": hsl(h, mutedSat, 24),
      "--seed-ink": hsl(h, 16, 96),
      "--seed-muted": hsl(h, 14, 74),
      "--seed-faint": hsl(h, 12, 60),
      "--seed-line": hsl(h, mutedSat, 32),
      "--seed-fill": hsl(h, mutedSat, 28),
      "--seed-fill-hover": hsl(h, mutedSat, 33),
      "--seed-accent": hsl(h, accentSat, 74),
      "--seed-accent-hover": hsl(h, accentSat, 80),
      "--seed-accent-soft": hsl(h, mutedSat, 28),
      "--seed-on-accent": hsl(h, 22, 12),
    };
  }
  return {
    "--seed-bg": hsl(h, mutedSat, 94),
    "--seed-surface": hsl(h, 22, 99),
    "--seed-ink": hsl(h, 24, 14),
    "--seed-muted": hsl(h, 14, 36),
    "--seed-faint": hsl(h, 12, 50),
    "--seed-line": hsl(h, mutedSat, 84),
    "--seed-fill": hsl(h, mutedSat, 90),
    "--seed-fill-hover": hsl(h, mutedSat, 86),
    "--seed-accent": hsl(h, accentSat, 40),
    "--seed-accent-hover": hsl(h, accentSat, 34),
    "--seed-accent-soft": hsl(h, mutedSat, 88),
    "--seed-on-accent": "#ffffff",
  };
}

function clearChromeSeedTokens() {
  const root = document.documentElement;
  root.removeAttribute("data-chrome-color");
  SEED_VARS.forEach((name) => root.style.removeProperty(name));
}

function applyChromeSeedTokens() {
  if (themePreference !== "chrome" || !chromeSeed) {
    clearChromeSeedTokens();
    return;
  }
  const dark = colorSchemeQuery.matches;
  const tokens = paletteFromSeed(chromeSeed, dark);
  const root = document.documentElement;
  SEED_VARS.forEach((name) => root.style.setProperty(name, tokens[name]));
  root.setAttribute("data-chrome-color", dark ? "dark" : "light");
}

function syncChromeColorChipSelection() {
  chromeColorChips.querySelectorAll(".chrome-color-chip").forEach((button) => {
    const hex = button.dataset.color ? `#${button.dataset.color}` : "";
    button.setAttribute("aria-selected", hex === chromeSeed ? "true" : "false");
  });
  const known = CHROME_COLOR_CHIPS.some((chip) => chip.hex && chip.hex === chromeSeed);
  chromeColorCustom.setAttribute("aria-pressed", chromeSeed && !known ? "true" : "false");
}

function renderChromeColorChips() {
  chromeColorChips.replaceChildren();
  CHROME_COLOR_CHIPS.forEach((chip) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chrome-color-chip";
    if (!chip.hex) {
      button.classList.add("chrome-color-chip-default");
    } else {
      button.style.background = chip.hex;
      button.dataset.color = chip.hex.slice(1);
    }
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", chip.name);
    button.title = chip.name;
    chromeColorChips.appendChild(button);
  });
  if (chromeSeed) {
    chromeColorCustom.value = chromeSeed;
  }
  syncChromeColorChipSelection();
}

async function setChromeSeed(value, { rebuildChips = true } = {}) {
  chromeSeed = normalizeHex(value);
  const payload = { [CHROME_COLOR_KEY]: chromeSeed };
  if (themePreference !== "chrome") {
    applyTheme("chrome");
    payload[THEME_KEY] = "chrome";
  } else {
    applyChromeSeedTokens();
  }
  if (rebuildChips) {
    renderChromeColorChips();
  } else {
    syncChromeColorChipSelection();
  }
  try {
    await chrome.storage.local.set(payload);
  } catch (error) {
    console.error("Failed to save Chrome color", error);
  }
}

function applyTheme(theme) {
  themePreference = normalizeTheme(theme);
  if (themePreference === "chrome") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themePreference);
  }
  applyChromeSeedTokens();
  const labels = {
    dark: { text: "Dark", aria: "Dark mode. Switch to light mode" },
    light: { text: "Light", aria: "Light mode. Switch to match Chrome" },
    chrome: { text: "Chrome", aria: "Matching Chrome. Switch to dark mode" },
  };
  const label = labels[themePreference];
  themeToggle.textContent = label.text;
  themeToggle.setAttribute("aria-label", label.aria);
}

async function toggleTheme() {
  const next =
    themePreference === "dark" ? "light" : themePreference === "light" ? "chrome" : "dark";
  applyTheme(next);
  try {
    await chrome.storage.local.set({ [THEME_KEY]: next });
  } catch (error) {
    console.error("Failed to save theme", error);
  }
}

async function restoreTheme() {
  const stored = await chrome.storage.local.get([THEME_KEY, CHROME_COLOR_KEY]);
  chromeSeed = normalizeHex(stored[CHROME_COLOR_KEY]);
  applyTheme(stored[THEME_KEY]);
  renderChromeColorChips();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

async function persist() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        raw: pasteInput.value,
        headers: dataset.headers,
        rows: dataset.rows,
        selectedIndex,
        pasteOpen,
      },
    });
  } catch (error) {
    console.error("Failed to save test data", error);
  }
}

async function persistMode() {
  try {
    await chrome.storage.local.set({ [MODE_KEY]: mode });
  } catch (error) {
    console.error("Failed to save mode", error);
  }
}

async function persistScrapTab() {
  try {
    await chrome.storage.local.set({ [SCRAP_TAB_KEY]: scrapTab });
  } catch (error) {
    console.error("Failed to save scrap tab", error);
  }
}

async function persistShortcut() {
  try {
    await chrome.storage.local.set({ [SHORTCUT_KEY]: shortcut });
  } catch (error) {
    console.error("Failed to save shortcut", error);
  }
}

async function persistScrap() {
  try {
    await chrome.storage.local.set({
      [SCRAP_KEY]: {
        raw: scrapHeaderInput.value.slice(0, MAX_PASTE_CHARS),
        headers: scrap.headers.slice(0, MAX_COLUMNS),
        rows: scrap.rows.slice(0, MAX_ROWS).map((row) =>
          (Array.isArray(row) ? row : []).slice(0, MAX_COLUMNS).map((cell) => String(cell ?? "").slice(0, MAX_CELL_LENGTH))
        ),
        selectedRow: scrap.selectedRow,
        includeHeader: Boolean(scrap.includeHeader),
        headerOpen: scrapHeaderOpen,
      },
    });
  } catch (error) {
    console.error("Failed to save scrap data", error);
  }
}

async function persistUnorganised() {
  try {
    await chrome.storage.local.set({
      [UNORGANISED_KEY]: {
        items: unorganised.slice(0, MAX_UNORGANISED_ITEMS).map((item) => ({
          id: String(item.id ?? "").slice(0, 80),
          label: String(item.label ?? "").slice(0, MAX_CELL_LENGTH),
          value: String(item.value ?? "").slice(0, MAX_CELL_LENGTH),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to save unorganised data", error);
  }
}

async function restoreAll() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEY,
    MODE_KEY,
    SCRAP_KEY,
    SCRAP_TAB_KEY,
    UNORGANISED_KEY,
    SHORTCUT_KEY,
  ]);
  restoreUse(stored[STORAGE_KEY]);
  restoreScrap(stored[SCRAP_KEY]);
  restoreUnorganised(stored[UNORGANISED_KEY]);
  applyShortcut(stored[SHORTCUT_KEY]);
  setScrapTab(stored[SCRAP_TAB_KEY] === "unorganised" ? "unorganised" : "headered");
  setMode(stored[MODE_KEY] === "scrap" ? "scrap" : "use");
}

function restoreUse(saved) {
  if (!saved) {
    return;
  }

  pasteInput.value = typeof saved.raw === "string" ? saved.raw.slice(0, MAX_PASTE_CHARS) : "";
  if (Array.isArray(saved.headers) && Array.isArray(saved.rows) && saved.rows.length > 0) {
    dataset = {
      headers: saved.headers.slice(0, MAX_COLUMNS).map((header) => String(header ?? "").slice(0, MAX_CELL_LENGTH)),
      rows: saved.rows.slice(0, MAX_ROWS).map((row) =>
        (Array.isArray(row) ? row.slice(0, MAX_COLUMNS).map((cell) => String(cell ?? "").slice(0, MAX_CELL_LENGTH)) : [])
      ),
    };
    selectedIndex = Number.isInteger(saved.selectedIndex) ? saved.selectedIndex : 0;
    setPasteOpen(typeof saved.pasteOpen === "boolean" ? saved.pasteOpen : false);
    setStatus(`Restored ${dataset.rows.length} test data set${dataset.rows.length === 1 ? "" : "s"}.`);
    render();
  }
}

function restoreScrap(saved, quiet = false) {
  if (!saved) {
    return;
  }

  scrapHeaderInput.value = typeof saved.raw === "string" ? saved.raw.slice(0, MAX_PASTE_CHARS) : "";
  scrap.includeHeader = Boolean(saved.includeHeader);
  scrapIncludeHeader.checked = scrap.includeHeader;
  if (Array.isArray(saved.headers) && saved.headers.length > 0) {
    scrap.headers = saved.headers.slice(0, MAX_COLUMNS).map((header) => String(header ?? "").slice(0, MAX_CELL_LENGTH));
    if (Array.isArray(saved.rows) && saved.rows.length > 0) {
      scrap.rows = normalizeScrapRows(scrap.headers, saved.rows);
    } else {
      const values = Array.isArray(saved.values) ? saved.values : [];
      scrap.rows = normalizeScrapRows(scrap.headers, [values]);
    }
    scrap.selectedRow = Number.parseInt(saved.selectedRow, 10) || 0;
    ensureScrapRows();
    if (!quiet) {
      setScrapStatus(`Restored ${scrap.headers.length} field${scrap.headers.length === 1 ? "" : "s"}.`);
    }
    setScrapHeaderOpen(typeof saved.headerOpen === "boolean" ? saved.headerOpen : false);
    renderScrap();
  }
}

function applyScrapFromStorage(saved) {
  if (!saved) {
    return;
  }
  const incoming = {
    headers: Array.isArray(saved.headers) ? saved.headers : [],
    rows: Array.isArray(saved.rows) ? saved.rows : [],
    selectedRow: Number.parseInt(saved.selectedRow, 10) || 0,
    includeHeader: Boolean(saved.includeHeader),
  };
  const current = {
    headers: scrap.headers,
    rows: scrap.rows,
    selectedRow: scrap.selectedRow,
    includeHeader: Boolean(scrap.includeHeader),
  };
  if (JSON.stringify(incoming) === JSON.stringify(current)) {
    return;
  }
  if (Number.isInteger(scrapFocusIndex)) {
    const nextSelected = Math.min(
      Math.max(0, incoming.selectedRow),
      Math.max(0, incoming.rows.length - 1)
    );
    const previousValue = String(current.rows[current.selectedRow]?.[scrapFocusIndex] ?? "");
    const nextValue = String(incoming.rows[nextSelected]?.[scrapFocusIndex] ?? "");
    if (previousValue !== nextValue) {
      clearScrapFocus();
    }
  }
  restoreScrap(saved, true);
}

function restoreUnorganised(saved) {
  unorganised = sanitizeUnorganisedItems(saved?.items);
  renderUnorganised();
}

function sanitizeUnorganisedItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.slice(0, MAX_UNORGANISED_ITEMS).map((item, index) => ({
    id: String(item?.id ?? `item-${index}`).slice(0, 80),
    label: String(item?.label ?? "").slice(0, MAX_CELL_LENGTH),
    value: String(item?.value ?? "").slice(0, MAX_CELL_LENGTH),
  }));
}

function updateUseHeadersButton() {
  scrapUseHeadersBtn.disabled = dataset.headers.length === 0;
}

function syncScrapActions() {
  const showHeadered = mode === "scrap" && !settingsOpen && scrapTab === "headered" && scrap.headers.length > 0;
  const showUnorganised = mode === "scrap" && !settingsOpen && scrapTab === "unorganised" && filledUnorganisedItems().length > 0;
  scrapActions.classList.toggle("hidden", !(showHeadered || showUnorganised));
  scrapCapture.classList.toggle("hidden", !showHeadered);
  scrapClearAllBtn.classList.remove("hidden");
  scrapAddRowBtn.disabled = scrap.rows.length >= MAX_ROWS;
  const isUnorganised = scrapTab === "unorganised";
  scrapClearValuesBtn.textContent = isUnorganised ? "Clear Values" : "Clear Row";
  scrapClearValuesBtn.title = isUnorganised ? "Clear all values. Labels stay." : "Clear values in the active row";
  scrapClearAllBtn.textContent = isUnorganised ? "Clear All" : "Delete Rows";
  scrapClearAllBtn.title = isUnorganised ? "Delete all labels, values, and cards" : "Delete all rows. Headers stay.";
  const rowCount = isUnorganised ? 1 : scrap.rows.length;
  scrapCopyBtn.textContent = rowCount > 1 ? "Copy Rows" : "Copy Row";
}

async function clearAll() {
  pasteInput.value = "";
  dataset = { headers: [], rows: [] };
  selectedIndex = 0;
  setPasteOpen(true);
  setStatus("");
  render();
  updateUseHeadersButton();
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear saved test data", error);
  }
}
