const SHORTCUT_KEY = "handyShortcut";
const DEFAULT_SHORTCUT = {
  alt: true,
  ctrl: false,
  shift: true,
  meta: false,
  code: "KeyS",
};

const LAST_CAPTURE_KEY = "handyLastCapture";
let shortcut = DEFAULT_SHORTCUT;
let lastCapture = { text: "", label: "" };

chrome.storage.local.get(SHORTCUT_KEY).then((stored) => {
  shortcut = normalizeShortcut(stored[SHORTCUT_KEY]);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[SHORTCUT_KEY]) {
    shortcut = normalizeShortcut(changes[SHORTCUT_KEY].newValue);
  }
});

window.addEventListener("keydown", onShortcutKey, true);
document.addEventListener("selectionchange", rememberCapture);
document.addEventListener("select", rememberCapture, true);
document.addEventListener("mouseup", rememberCapture, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "get-capture") {
    return undefined;
  }
  const live = getCapture();
  sendResponse(live.text.trim() ? live : lastCapture);
  return true;
});

function rememberCapture() {
  const captured = getCapture();
  if (!captured.text.trim()) {
    return;
  }
  lastCapture = captured;
  chrome.storage.session
    .set({
      [LAST_CAPTURE_KEY]: {
        text: captured.text.slice(0, 4000),
        label: String(captured.label || "").slice(0, 80),
        at: Date.now(),
      },
    })
    .catch(() => {});
}

function onShortcutKey(event) {
  if (event.repeat || !matchesShortcut(event, shortcut)) {
    return;
  }

  rememberCapture();
  event.preventDefault();
  event.stopPropagation();
  try {
    chrome.runtime.sendMessage({ type: "scrap-active-tab" }, () => {
      void chrome.runtime.lastError;
    });
  } catch (_error) {
    // Extension was reloaded; the next page refresh will reconnect.
  }
}

function getCapture() {
  const field = getActiveTextField();
  const text = getSelectedText();
  const label = field ? getControlLabel(field) : "";
  return { text, label };
}

function getActiveTextField() {
  const active = document.activeElement;
  if (isTextField(active)) {
    return active;
  }
  const shadowActive = active?.shadowRoot?.activeElement;
  if (isTextField(shadowActive)) {
    return shadowActive;
  }
  return null;
}

function getSelectedText() {
  const field = getActiveTextField();
  if (field) {
    const start = field.selectionStart;
    const end = field.selectionEnd;
    if (typeof start === "number" && typeof end === "number" && end > start) {
      return field.value.slice(start, end);
    }
  }

  return window.getSelection()?.toString() ?? "";
}

function getControlLabel(el) {
  if (el.labels && el.labels.length > 0) {
    const fromLabels = cleanDomLabel(labelTextWithoutControls(el.labels[0], el));
    if (fromLabels) {
      return fromLabels;
    }
  }

  const ariaLabel = cleanDomLabel(el.getAttribute("aria-label"));
  if (ariaLabel) {
    return ariaLabel;
  }

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).slice(0, 4).map((id) => {
      const node = document.getElementById(id);
      return node ? cleanDomLabel(node.textContent) : "";
    });
    const joined = cleanDomLabel(parts.filter(Boolean).join(" "));
    if (joined) {
      return joined;
    }
  }

  const cell = el.closest("td, th");
  const rowHeader = cell?.closest("tr")?.querySelector("th");
  if (rowHeader) {
    const header = cleanDomLabel(rowHeader.textContent);
    if (header) {
      return header;
    }
  }

  return "";
}

function labelTextWithoutControls(labelEl, control) {
  const clone = labelEl.cloneNode(true);
  clone.querySelectorAll("input, textarea, select, button").forEach((node) => node.remove());
  if (control?.id) {
    clone.querySelectorAll(`[for="${CSS.escape(control.id)}"]`).forEach((node) => node.remove());
  }
  return clone.textContent || "";
}

function cleanDomLabel(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*[:：*＊]+\s*$/g, "")
    .trim()
    .slice(0, 80);
}

function isTextField(el) {
  if (!el || !el.tagName) {
    return false;
  }
  return el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && isSelectableInput(el));
}

function isSelectableInput(el) {
  const type = String(el.type || "text").toLowerCase();
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
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

function normalizeShortcut(value) {
  if (!value || typeof value !== "object") {
    return DEFAULT_SHORTCUT;
  }
  const code = typeof value.code === "string" ? value.code : "";
  if (!code || code.length > 32) {
    return DEFAULT_SHORTCUT;
  }
  const next = {
    alt: Boolean(value.alt),
    ctrl: Boolean(value.ctrl),
    shift: Boolean(value.shift),
    meta: Boolean(value.meta),
    code,
  };
  if (!next.alt && !next.ctrl && !next.shift && !next.meta) {
    return DEFAULT_SHORTCUT;
  }
  return next;
}
