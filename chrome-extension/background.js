importScripts("parser.js");

const LAST_CAPTURE_KEY = "handyLastCapture";
const UNORGANISED_KEY = "handyUnorganised";
const SCRAP_KEY = "handyScrap";
const SCRAP_TAB_KEY = "handyScrapTab";
const MENU_ROOT = "handy-root";
const MENU_HEADERED = "handy-headered";
const MENU_HEADERED_EMPTY = "handy-headered-empty";
const MENU_HEADERED_PREFIX = "handy-headered:";
const MENU_ADD_LABEL = "handy-add-label";
const MENU_ADD_VALUE = "handy-add-value";
const MENU_ADD_VALUE_EMPTY = "handy-add-value-empty";
const MENU_ADD_VALUE_PREFIX = "handy-add-value:";
const MENU_CONTEXTS = ["selection", "editable"];
const MENU_TITLE_MAX = 64;
const SAFE_ITEM_ID = /^[A-Za-z0-9_-]{1,80}$/;

let menuRebuild = Promise.resolve();

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => {
    console.error("Failed to set side panel behavior", error);
  });

chrome.runtime.onInstalled.addListener(() => {
  rebuildContextMenus().catch((error) => {
    console.error("Failed to create context menus", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  rebuildContextMenus().catch((error) => {
    console.error("Failed to create context menus", error);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || (!changes[UNORGANISED_KEY] && !changes[SCRAP_KEY] && !changes[SCRAP_TAB_KEY])) {
    return;
  }
  rebuildContextMenus().catch((error) => {
    console.error("Failed to refresh context menus", error);
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleContextMenuClick(info, tab).catch((error) => {
    console.error("Failed to handle context menu click", error);
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "scrap-selection") {
    return;
  }
  scrapActiveTab().catch((error) => {
    console.error("Failed to scrap from command", error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return undefined;
  }

  if (message.type === "scrap-active-tab") {
    scrapActiveTab(message.as, message.fieldIndex)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to scrap active tab", error);
        sendResponse({ ok: false, error: "save-failed" });
      });
    return true;
  }

  if (message.type === "scrap-selection") {
    addUnorganisedItem(message.text, message.label)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to scrap selection", error);
        sendResponse({ ok: false, error: "save-failed" });
      });
    return true;
  }

  return undefined;
});

rebuildContextMenus().catch((error) => {
  console.error("Failed to create context menus", error);
});

function rebuildContextMenus() {
  menuRebuild = menuRebuild.then(rebuildContextMenusNow, rebuildContextMenusNow);
  return menuRebuild;
}

async function rebuildContextMenusNow() {
  await removeAllMenus();

  const labeled = labeledUnorganisedItems(await loadUnorganisedItems()).reverse();
  const headeredTargets = await loadHeaderedTargets();

  await createMenu({
    id: MENU_ROOT,
    title: "Handy Test Data",
    contexts: MENU_CONTEXTS,
  });
  await createMenu({
    id: MENU_HEADERED,
    parentId: MENU_ROOT,
    title: "Add to Headered row",
    contexts: MENU_CONTEXTS,
  });
  if (headeredTargets.error === "no-headers") {
    await createMenu({
      id: MENU_HEADERED_EMPTY,
      parentId: MENU_HEADERED,
      title: "Set headers first",
      enabled: false,
      contexts: MENU_CONTEXTS,
    });
  } else {
    for (const field of headeredTargets.fields) {
      await createMenu({
        id: MENU_HEADERED_PREFIX + field.index,
        parentId: MENU_HEADERED,
        title: truncateMenuTitle(field.header.trim() || `Column ${field.index + 1}`),
        contexts: MENU_CONTEXTS,
      });
    }
  }
  await createMenu({
    id: MENU_ADD_LABEL,
    parentId: MENU_ROOT,
    title: "Add to scrap list as label",
    contexts: MENU_CONTEXTS,
  });
  await createMenu({
    id: MENU_ADD_VALUE,
    parentId: MENU_ROOT,
    title: "Add to scrap list as value",
    contexts: MENU_CONTEXTS,
  });

  if (labeled.length === 0) {
    await createMenu({
      id: MENU_ADD_VALUE_EMPTY,
      parentId: MENU_ADD_VALUE,
      title: "Add a label first",
      enabled: false,
      contexts: MENU_CONTEXTS,
    });
    return;
  }

  for (const entry of labeled) {
    await createMenu({
      id: MENU_ADD_VALUE_PREFIX + entry.id,
      parentId: MENU_ADD_VALUE,
      title: truncateMenuTitle(entry.label),
      contexts: MENU_CONTEXTS,
    });
  }
}

function removeAllMenus() {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    try {
      chrome.contextMenus.removeAll(() => {
        void chrome.runtime.lastError;
        done();
      });
    } catch (_error) {
      done();
    }
    setTimeout(done, 200);
  });
}

function createMenu(properties) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      const message = String(error?.message || error || "");
      if (message && !/duplicate/i.test(message)) {
        reject(error instanceof Error ? error : new Error(message));
        return;
      }
      resolve();
    };
    try {
      chrome.contextMenus.create(properties, () => done(chrome.runtime.lastError));
    } catch (error) {
      done(error);
    }
    setTimeout(done, 200);
  });
}

async function handleContextMenuClick(info, tab) {
  const menuId = typeof info?.menuItemId === "string" ? info.menuItemId : "";
  let text = sanitizeCell(info?.selectionText);
  if (!text && tab?.id) {
    try {
      const captured = await captureFromTab(tab.id);
      text = sanitizeCell(captured?.text);
    } catch (_error) {
      text = "";
    }
  }
  if (!text) {
    return;
  }

  if (menuId === MENU_ADD_LABEL) {
    await addUnorganisedFields({ label: text, value: "" }, "label");
    return;
  }

  if (menuId.startsWith(MENU_HEADERED_PREFIX)) {
    const fieldIndex = Number.parseInt(menuId.slice(MENU_HEADERED_PREFIX.length), 10);
    if (Number.isInteger(fieldIndex)) {
      await fillHeaderedField(text, fieldIndex);
    }
    return;
  }

  if (!menuId.startsWith(MENU_ADD_VALUE_PREFIX)) {
    return;
  }

  const itemId = menuId.slice(MENU_ADD_VALUE_PREFIX.length);
  if (!SAFE_ITEM_ID.test(itemId)) {
    return;
  }
  await setUnorganisedValue(itemId, text);
}

async function addUnorganisedItem(raw, domLabel) {
  const text = sanitizeCell(raw);
  if (!text) {
    return { ok: false, error: "empty" };
  }

  const parsed = mergeLabelAndValue(parseLabeledSelection(text), domLabel);
  return addUnorganisedFields(
    {
      label: String(parsed.label ?? "").slice(0, MAX_CELL_LENGTH),
      value: String(sanitizeCell(parsed.value) || text).slice(0, MAX_CELL_LENGTH),
    },
    "selection"
  );
}

let lastScrapAt = 0;
let lastScrapText = "";
let lastScrapAs = "";
let lastScrapField = null;

async function scrapActiveTab(as, fieldIndex) {
  const captured = await getLatestCapture();
  const text = sanitizeCell(captured?.text);
  if (!text) {
    return { ok: false, error: "empty" };
  }

  const scrapTab = await loadScrapTab();
  const mode =
    as === "label" || as === "value" || as === "value-to-last" || as === "headered"
      ? as
      : scrapTab === "headered"
        ? "headered"
        : "auto";
  const now = Date.now();
  if (text === lastScrapText && mode === lastScrapAs && fieldIndex === lastScrapField && now - lastScrapAt < 800) {
    return { ok: true, duplicate: true };
  }
  lastScrapAt = now;
  lastScrapText = text;
  lastScrapAs = mode;
  lastScrapField = fieldIndex;

  if (mode === "label") {
    return addUnorganisedFields({ label: text, value: "" }, "label");
  }
  if (mode === "value") {
    return addUnorganisedFields({ label: "", value: text }, "selection");
  }
  if (mode === "value-to-last") {
    const last = lastLabeledItem(await loadUnorganisedItems());
    if (!last) {
      return { ok: false, error: "no-label" };
    }
    return setUnorganisedValue(last.id, text);
  }
  if (mode === "headered") {
    return fillHeaderedField(text, fieldIndex);
  }

  return addUnorganisedItem(text, captured?.label);
}

async function getLatestCapture() {
  const tab = await getTargetTab();
  if (tab?.id) {
    const live = await captureFromTab(tab.id);
    if (sanitizeCell(live?.text)) {
      return live;
    }
  }

  try {
    const stored = await chrome.storage.session.get(LAST_CAPTURE_KEY);
    const saved = stored[LAST_CAPTURE_KEY];
    if (saved && sanitizeCell(saved.text) && Date.now() - Number(saved.at || 0) < 120000) {
      return { text: saved.text, label: saved.label || "" };
    }
  } catch (_error) {
    // session storage may be unavailable
  }

  return { text: "", label: "" };
}

async function getTargetTab() {
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const usable = focused.find((tab) => isHttpTab(tab));
  if (usable) {
    return usable;
  }
  const current = await chrome.tabs.query({ active: true, currentWindow: true });
  return current.find((tab) => isHttpTab(tab)) || current[0] || null;
}

function isHttpTab(tab) {
  const url = String(tab?.url ?? "");
  return url.startsWith("http://") || url.startsWith("https://");
}

async function captureFromTab(tabId) {
  try {
    const fromScript = await chrome.tabs.sendMessage(tabId, { type: "get-capture" });
    if (sanitizeCell(fromScript?.text)) {
      return fromScript;
    }
  } catch (_error) {
    // Content script may not be injected yet.
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: injectedCapture,
    });
    const captures = (results || [])
      .map((entry) => entry?.result)
      .filter((entry) => sanitizeCell(entry?.text));
    captures.sort((a, b) => String(b.text).length - String(a.text).length);
    return captures[0] || { text: "", label: "" };
  } catch (_error) {
    return { text: "", label: "" };
  }
}

function injectedCapture() {
  function clean(text) {
    return String(text || "")
      .replace(/\u0000/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*[:：*＊]+\s*$/g, "")
      .trim()
      .slice(0, 80);
  }

  function isField(el) {
    if (!el || !el.tagName) {
      return false;
    }
    if (el.tagName === "TEXTAREA") {
      return true;
    }
    if (el.tagName !== "INPUT") {
      return false;
    }
    const type = String(el.type || "text").toLowerCase();
    return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
  }

  function activeField() {
    const active = document.activeElement;
    if (isField(active)) {
      return active;
    }
    const nested = active?.shadowRoot?.activeElement;
    return isField(nested) ? nested : null;
  }

  function selectedText(field) {
    if (field && typeof field.selectionStart === "number" && field.selectionEnd > field.selectionStart) {
      return field.value.slice(field.selectionStart, field.selectionEnd);
    }
    return window.getSelection()?.toString() || "";
  }

  function controlLabel(el) {
    if (el.labels && el.labels.length > 0) {
      const labelEl = el.labels[0];
      const clone = labelEl.cloneNode(true);
      clone.querySelectorAll("input, textarea, select, button").forEach((node) => node.remove());
      const text = clean(clone.textContent);
      if (text) {
        return text;
      }
    }
    const aria = clean(el.getAttribute("aria-label"));
    if (aria) {
      return aria;
    }
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const joined = clean(
        labelledBy
          .split(/\s+/)
          .slice(0, 4)
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ")
      );
      if (joined) {
        return joined;
      }
    }
    const header = el.closest("td, th")?.closest("tr")?.querySelector("th");
    return header ? clean(header.textContent) : "";
  }

  const field = activeField();
  const text = selectedText(field);
  const label = field ? controlLabel(field) : "";
  return { text, label };
}

async function addUnorganisedFields(fields, addedAs) {
  const items = await loadUnorganisedItems();
  const blankIndex = items.findIndex((entry) => isBlankUnorganisedItem(entry));

  if (items.length >= MAX_UNORGANISED_ITEMS && blankIndex < 0) {
    return { ok: false, error: "full" };
  }

  const item = {
    id: crypto.randomUUID(),
    label: String(fields.label ?? "").slice(0, MAX_CELL_LENGTH),
    value: String(fields.value ?? "").slice(0, MAX_CELL_LENGTH),
  };

  if (blankIndex >= 0) {
    items[blankIndex] = item;
  } else {
    items.push(item);
  }

  ensureTrailingBlank(items);
  await persistUnorganised(items, item, addedAs);
  return { ok: true, item };
}

async function setUnorganisedValue(id, value) {
  const items = await loadUnorganisedItems();
  const index = items.findIndex((entry) => entry?.id === id);
  if (index < 0) {
    return { ok: false, error: "missing" };
  }

  const item = {
    id: items[index].id,
    label: String(items[index].label ?? "").slice(0, MAX_CELL_LENGTH),
    value: String(value ?? "").slice(0, MAX_CELL_LENGTH),
  };
  items[index] = item;
  ensureTrailingBlank(items);
  await persistUnorganised(items, item, "value");
  return { ok: true, item };
}

async function loadUnorganisedItems() {
  const stored = await chrome.storage.local.get(UNORGANISED_KEY);
  const current = stored[UNORGANISED_KEY];
  if (!Array.isArray(current?.items)) {
    return [];
  }
  return current.items.slice(0, MAX_UNORGANISED_ITEMS).map((item, index) => ({
    id: String(item?.id ?? `item-${index}`).slice(0, 80),
    label: String(item?.label ?? "").slice(0, MAX_CELL_LENGTH),
    value: String(item?.value ?? "").slice(0, MAX_CELL_LENGTH),
  }));
}

async function loadScrapTab() {
  const stored = await chrome.storage.local.get(SCRAP_TAB_KEY);
  return stored[SCRAP_TAB_KEY] === "unorganised" ? "unorganised" : "headered";
}

async function loadHeaderedState() {
  const stored = await chrome.storage.local.get(SCRAP_KEY);
  const saved = stored[SCRAP_KEY] || {};
  const headers = Array.isArray(saved.headers)
    ? saved.headers.slice(0, MAX_COLUMNS).map((header) => String(header ?? "").slice(0, MAX_CELL_LENGTH))
    : [];
  if (!headers.length) {
    return { saved, headers: [], rows: [], selectedRow: 0 };
  }
  const sourceRows =
    Array.isArray(saved.rows) && saved.rows.length > 0 ? saved.rows : [Array.isArray(saved.values) ? saved.values : []];
  const rows = sourceRows.slice(0, MAX_ROWS).map((row) =>
    headers.map((_, index) => String(row?.[index] ?? "").slice(0, MAX_CELL_LENGTH))
  );
  if (!rows.length) {
    rows.push(headers.map(() => ""));
  }
  const selectedRow = Math.min(Math.max(0, Number.parseInt(saved.selectedRow, 10) || 0), rows.length - 1);
  return { saved, headers, rows, selectedRow };
}

async function loadHeaderedTargets() {
  const state = await loadHeaderedState();
  if (!state.headers.length) {
    return { error: "no-headers", fields: [] };
  }
  return {
    fields: state.headers.map((header, index) => ({ index, header: String(header ?? "") })),
  };
}

async function fillHeaderedField(raw, fieldIndex) {
  const text = sanitizeCell(raw);
  if (!text) {
    return { ok: false, error: "empty" };
  }
  const state = await loadHeaderedState();
  if (!state.headers.length) {
    return { ok: false, error: "no-headers" };
  }
  const next = nextUnfilledFields(state.headers, state.rows[state.selectedRow], 3);
  const index = Number.isInteger(fieldIndex) ? fieldIndex : next[0]?.index;
  if (!Number.isInteger(index) || index < 0 || index >= state.headers.length) {
    return { ok: false, error: "full" };
  }
  state.rows[state.selectedRow][index] = String(text).slice(0, MAX_CELL_LENGTH);
  await chrome.storage.local.set({
    [SCRAP_KEY]: {
      raw: String(state.saved.raw ?? "").slice(0, MAX_PASTE_CHARS),
      headers: state.headers,
      rows: state.rows,
      selectedRow: state.selectedRow,
      includeHeader: Boolean(state.saved.includeHeader),
      headerOpen: Boolean(state.saved.headerOpen),
    },
  });
  const item = { header: state.headers[index], value: text };
  chrome.runtime.sendMessage({ type: "headered-updated", item }).catch(() => {});
  return { ok: true, item };
}

function labeledUnorganisedItems(items) {
  return items.filter((entry) => SAFE_ITEM_ID.test(String(entry?.id ?? "")) && String(entry?.label ?? "").trim());
}

function lastLabeledItem(items) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const entry = items[index];
    if (SAFE_ITEM_ID.test(String(entry?.id ?? "")) && String(entry?.label ?? "").trim()) {
      return entry;
    }
  }
  return null;
}

function isBlankUnorganisedItem(item) {
  return !String(item?.label ?? "").trim() && !String(item?.value ?? "").trim();
}

function ensureTrailingBlank(items) {
  if (
    items.length < MAX_UNORGANISED_ITEMS &&
    (items.length === 0 || !isBlankUnorganisedItem(items[items.length - 1]))
  ) {
    items.push({ id: crypto.randomUUID(), label: "", value: "" });
  }
}

async function persistUnorganised(items, item, addedAs) {
  await chrome.storage.local.set({ [UNORGANISED_KEY]: { items } });
  chrome.runtime
    .sendMessage({
      type: "unorganised-added",
      item,
      items,
      addedAs: addedAs === "label" || addedAs === "value" ? addedAs : "selection",
    })
    .catch(() => {});
}

function truncateMenuTitle(raw) {
  const text = sanitizeCell(raw).replace(/[\r\n\t]+/g, " ");
  if (text.length <= MENU_TITLE_MAX) {
    return text;
  }
  return `${text.slice(0, MENU_TITLE_MAX - 1)}…`;
}
