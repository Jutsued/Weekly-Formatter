// ============================================================
//  DOCX UPLOAD — file handling & UI
// ============================================================

const docxUpload = document.getElementById("docxUpload");
const uploadZone = document.getElementById("uploadZone");
const uploadStatus = document.getElementById("uploadStatus");
const outputSection = document.getElementById("outputSection");

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () =>
  uploadZone.classList.remove("drag-over")
);
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.name.toLowerCase().endsWith(".docx")) {
    processDocx(file);
  } else {
    setStatus("❌ Please drop a .docx file.", "status-error");
  }
});

docxUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) processDocx(file);
  e.target.value = "";
});

function processDocx(file) {
  setStatus("⏳ Processing " + file.name + "…", "status-processing");
  const reader = new FileReader();
  reader.onload = function (e) {
    mammoth
      .convertToHtml({ arrayBuffer: e.target.result })
      .then(function (result) {
        const { output, docType, dateRange, count } = parseAdvisory(
          result.value
        );

        // Split the output into per-borough/section cards and render them
        const sections = splitIntoSections(output);
        renderSections(sections, output);
        outputSection.style.display = "block";

        const typeLabel =
          docType === "weekly" ? "📅 Weekly Advisory" : "🗓️ Weekend Advisory";
        const dateLabel = dateRange ? " &nbsp;|&nbsp; " + dateRange : "";
        setStatus(
          "✅ " +
            typeLabel +
            dateLabel +
            " &nbsp;|&nbsp; <strong>" +
            count +
            "</strong> entries" +
            " &nbsp;|&nbsp; <strong>" +
            sections.length +
            "</strong> sections",
          "status-success"
        );
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          "❌ Could not read file. Make sure it is a valid .docx.",
          "status-error"
        );
      });
  };
  reader.onerror = () => setStatus("❌ File read error.", "status-error");
  reader.readAsArrayBuffer(file);
}

function setStatus(html, className) {
  uploadStatus.innerHTML = html;
  uploadStatus.className = className;
}

// Copy All — grabs the stored full output from the container's data attribute
document.getElementById("btn-copy-all").addEventListener("click", function () {
  const full =
    document.getElementById("sectionsContainer").dataset.fullOutput || "";
  copyToClipboard(full, "notificationUpload", "All sections copied!");
});

document
  .getElementById("btn-clear-upload")
  .addEventListener("click", function () {
    const sc = document.getElementById("sectionsContainer");
    sc.innerHTML = "";
    sc.dataset.fullOutput = "";
    outputSection.style.display = "none";
    uploadStatus.textContent = "";
    uploadStatus.className = "";
  });

// ============================================================
//  SECTION ANCHOR MAP
// ============================================================

// ============================================================
//  FORMAT HELPERS
// ============================================================

// Strips ":00" from exact-hour times  →  10:00pm → 10pm,  5:00 → 5
function formatText(text) {
  text = text.replace(/\b(\d+):00\s*(am|pm)\b/gi, "$1$2");
  text = text.replace(/\b(\d+):00\b/g, "$1");
  return text;
}

// ============================================================
//  SECTION META MAP  (ALL-CAPS key → { id, display name })
// ============================================================

const SECTION_META = {
  "EAST RIVER BRIDGE CROSSINGS": {
    id: "east",
    display: "East River Bridge Crossings",
  },
  "EAST RIVER BRIDGE AND TUNNEL CROSSINGS": {
    id: "east",
    display: "East River Bridge and Tunnel Crossings",
  },
  "HARLEM RIVER BRIDGE CROSSINGS": {
    id: "harlem",
    display: "Harlem River Bridge Crossings",
  },
  "HARLEM RIVER BRIDGE AND TUNNEL CROSSINGS": {
    id: "harlem",
    display: "Harlem River Bridge and Tunnel Crossings",
  },
  "HUDSON RIVER BRIDGE AND TUNNEL CROSSINGS": {
    id: "hudson",
    display: "Hudson River Bridge and Tunnel Crossings",
  },
  "HUDSON RIVER BRIDGE CROSSINGS": {
    id: "hudson",
    display: "Hudson River Bridge Crossings",
  },
  "STATEN ISLAND / NEW JERSEY CROSSINGS": {
    id: "sinj",
    display: "Staten Island / New Jersey Crossings",
  },
  "STATEN ISLAND/NEW JERSEY CROSSINGS": {
    id: "sinj",
    display: "Staten Island / New Jersey Crossings",
  },
  "STATEN ISLAND / BROOKLYN CROSSINGS": {
    id: "sibk",
    display: "Staten Island / Brooklyn Crossings",
  },
  "STATEN ISLAND/BROOKLYN CROSSINGS": {
    id: "sibk",
    display: "Staten Island / Brooklyn Crossings",
  },
  "STATEN ISLAND": { id: "statenisland", display: "Staten Island" },
  BRONX: { id: "bronx", display: "Bronx" },
  "BRONX/MANHATTAN": { id: "bxman", display: "Bronx/Manhattan" },
  BROOKLYN: { id: "brooklyn", display: "Brooklyn" },
  "BROOKLYN/MANHATTAN": { id: "brman", display: "Brooklyn/Manhattan" },
  MANHATTAN: { id: "manhattan", display: "Manhattan" },
  "MANHATTAN/BROOKLYN": { id: "manbr", display: "Manhattan/Brooklyn" },
  "MANHATTAN/BRONX": { id: "manbx", display: "Manhattan/Bronx" },
  "MANHATTAN/NEW JERSEY": { id: "mannj", display: "Manhattan/New Jersey" },
  "MANHATTAN/QUEENS": { id: "manqn", display: "Manhattan/Queens" },
  QUEENS: { id: "queens", display: "Queens" },
};

// Returns  <h2 id="manhattan">Manhattan</h2>  for known sections,
// or       <h2>Original Text</h2>              for unknown ones.
function sectionHeaderHtml(text) {
  const key = text.replace(/\s+/g, " ").trim().toUpperCase();
  const meta = SECTION_META[key];
  if (meta) return '<h2 id="' + meta.id + '">' + meta.display + "</h2>";
  // Fallback: simple title-case
  const titleCase = text.replace(
    /\w\S*/g,
    (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()
  );
  return "<h2>" + titleCase + "</h2>";
}

// ============================================================
//  ADVISORY PARSER
// ============================================================

const BOILERPLATE_STARTS = [
  "weekly traffic advisory",
  "weekend traffic advisory",
  "nyc department",
  "of transportation",
  "press office",
  "www.nyc.gov",
  "as part of its citywide",
  "the city of new york",
  "lane closings may also",
  "major road, lane",
  "check the weekend",
  "check the special",
  "check gridlock",
  "other state and local",
  "permits for parades",
  "for up-to-the-minute",
  "subscribe to traffic",
  "visit the nyc",
  "visit the office",
  "bold text indicates",
  "schedules are subject",
  "information about scheduled maintenance",
  "note: bold print",
  "note: bold text",
  "preliminary", // weekend doc header before the actual sections
];

function shouldSkip(text) {
  const lower = text.toLowerCase().trim();
  if (lower.length < 3) return true;
  if (
    /^(friday|saturday|sunday|monday|tuesday|wednesday|thursday)\s/i.test(
      text
    ) &&
    !text.includes(":")
  )
    return true;
  if (/^https?:\/\//i.test(lower)) return true;
  return BOILERPLATE_STARTS.some((phrase) => lower.startsWith(phrase));
}

function getBoldFraction(innerHTML) {
  const total = innerHTML
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!total.length) return 0;
  const boldText = (innerHTML.match(/<strong>([\s\S]*?)<\/strong>/g) || [])
    .join("")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return boldText.length / total.length;
}

function isSectionHeader(text) {
  if (!text || text.length > 90) return false;
  const lettersOnly = text.replace(/[^A-Za-z]/g, "");
  return lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
}

// Event TITLE: bold, mixed-case, no colon, not the description line
function isEventTitle(text, isBold) {
  if (!isBold) return false;
  if (text.includes(":")) return false;
  if (isSectionHeader(text)) return false;
  if (/^the following streets/i.test(text)) return false;
  if (text.length > 100) return false;
  return true;
}

// Event DESCRIPTION: bold, starts with "The following streets will be closed"
function isEventDescription(text, isBold) {
  return isBold && /^the following streets/i.test(text);
}

function getDateRange(html) {
  const m = html.match(
    /(?:Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)\s+\w+\s+\d+,?\s+\d{4}[^<]*/i
  );
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

// Uses FIRST occurrence so the weekly file's boilerplate link to the
// "Weekend Traffic Advisory" page does not trigger a false "weekend" detection.
function detectDocType(html) {
  const lower = html.toLowerCase();
  const weeklyIdx = lower.indexOf("weekly traffic advisory");
  const weekendIdx = lower.indexOf("weekend traffic advisory");
  if (weeklyIdx === -1 && weekendIdx === -1) return "weekly";
  if (weeklyIdx === -1) return "weekend";
  if (weekendIdx === -1) return "weekly";
  return weeklyIdx < weekendIdx ? "weekly" : "weekend";
}

function parseAdvisory(mammothHtml) {
  const docType = detectDocType(mammothHtml);
  const dateRange = getDateRange(mammothHtml);

  // Capture <p>, headings, AND <ul> blocks
  const tagRegex = /<(p|h1|h2|h3|ul)([^>]*)>([\s\S]*?)<\/\1>/g;
  const elements = [];
  let m;
  while ((m = tagRegex.exec(mammothHtml)) !== null) {
    elements.push({ tag: m[1].toLowerCase(), inner: m[3] });
  }

  let output = "";
  let started = false;
  let entryCount = 0;
  let inEvent = false; // currently inside an event block
  let sectionHasEvents = false; // has this section seen its first event yet

  for (const { tag, inner } of elements) {
    // ── UL: event bullet lists (Locations / Formation / Route etc.) ──
    if (tag === "ul") {
      if (!started) continue;
      const liMatches = inner.match(/<li>([\s\S]*?)<\/li>/g) || [];
      const items = liMatches
        .map((li) =>
          li
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean);
      if (items.length) {
        output += "<ul>\n";
        items.forEach((item) => {
          output += "  <li>" + item + "</li>\n";
        });
        output += "</ul>\n\n";
      }
      continue;
    }

    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    if (shouldSkip(text)) continue;

    const isBold = getBoldFraction(inner) > 0.5;

    // ── Heading elements ── always section headers ───────────
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      if (inEvent) {
        output += "<br>\n\n";
        inEvent = false;
      }
      sectionHasEvents = false;
      started = true;
      output += sectionHeaderHtml(text) + "\n\n";
      continue;
    }

    // ── All-caps paragraph = section / borough header ─────────
    if (isSectionHeader(text) && !text.includes(":")) {
      if (inEvent) {
        output += "<br>\n\n";
        inEvent = false;
      }
      sectionHasEvents = false;
      started = true;
      output += sectionHeaderHtml(text) + "\n\n";
      continue;
    }

    // ── Event description ("The following streets will be closed…") ──
    // Only fires AFTER a real section header has been seen (started = true)
    if (started && isEventDescription(text, isBold)) {
      let desc = formatText(text);
      desc = desc.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, (match) =>
        convertDate(match)
      );
      output += "<p>" + desc + "</p>\n\n";
      continue;
    }

    // ── Event title (bold, mixed-case, no colon) ─────────────
    // Only fires AFTER a real section header has been seen (started = true)
    // This prevents intro lines like "(See Last Page…)" from being treated as events.
    if (started && isEventTitle(text, isBold)) {
      if (inEvent) {
        // Between events: close previous with <br>
        output += "<br>\n\n";
      } else if (!sectionHasEvents) {
        // First event in this section — add the Festivals header
        output += "<br />\n<h3>Festivals, Parades and Events</h3>\n\n";
        sectionHasEvents = true;
      }
      inEvent = true;
      output += "<h4>" + text + "</h4>\n";
      continue;
    }

    // ── Regular entry (has a colon with content after it) ─────
    const colonIdx = text.indexOf(":");
    if (colonIdx > 0) {
      started = true;

      const location = text.substring(0, colonIdx).trim();
      const desc = text.substring(colonIdx + 1).trim();

      // Empty after colon = sub-label (Locations:, Formation:, Route:, etc.)
      if (!desc) {
        output += "<strong>" + formatText(location) + ":</strong>\n";
        continue;
      }

      // A normal traffic entry coming after an event block — close the event
      if (inEvent) {
        output += "<br>\n\n";
        inEvent = false;
      }

      let description = formatText(desc);
      description = description.replace(
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
        (match) => convertDate(match)
      );

      const locationHtml = "<strong>" + formatText(location) + "</strong>";
      const descHtml =
        docType === "weekly" && isBold
          ? "<p><strong>" + description + "</strong></p>"
          : "<p>" + description + "</p>";

      output += locationHtml + "\n" + descHtml + "\n\n";
      entryCount++;
    }
    // Remaining bold no-colon lines that aren't event titles → skip silently
  }

  if (inEvent) output += "<br>\n\n"; // close any open event at end of document

  return { output: output.trim(), docType, dateRange, count: entryCount };
}

// ============================================================
//  SECTION SPLITTING & CARD RENDERING
// ============================================================

/**
 * Color palette — one accent color per borough / crossing group.
 * These are used as the left border and header tint of each card.
 */
const SECTION_COLORS = {
  east: "#3b82f6", // blue
  harlem: "#6366f1", // indigo
  hudson: "#8b5cf6", // violet
  sinj: "#f59e0b", // amber
  sibk: "#f59e0b", // amber
  statenisland: "#f59e0b", // amber
  bronx: "#f97316", // orange
  bxman: "#fb923c", // light-orange
  brooklyn: "#22c55e", // green
  brman: "#4ade80", // light-green
  manhattan: "#e11d48", // rose  (matches app theme)
  manbr: "#f43f5e",
  manbx: "#fb7185",
  mannj: "#fda4af",
  manqn: "#fecdd3",
  queens: "#a855f7", // purple
};

function getSectionColor(id) {
  return SECTION_COLORS[id] || "#64748b"; // slate fallback
}

/**
 * Splits the full output string on <h2 boundaries so each borough /
 * crossing section becomes its own { id, name, content, copyContent } object.
 * copyContent = content with the <h2> line stripped out.
 */
function splitIntoSections(outputHtml) {
  const parts = outputHtml.split(/(?=<h2[\s>])/);

  return parts
    .map((part) => {
      part = part.trim();
      if (!part) return null;

      // Pull id and display name out of the opening <h2>
      const h2Match = part.match(/<h2(?:\s+id="([^"]*)")?[^>]*>([^<]*)<\/h2>/);

      // Strip the <h2...>...</h2> line (and any trailing blank line) from
      // what gets copied — the card header already shows the borough name
      const copyContent = part
        .replace(/<h2(?:[^>]*)>[^<]*<\/h2>\n?/, "")
        .trim();

      return {
        id: h2Match && h2Match[1] ? h2Match[1] : "",
        name: h2Match && h2Match[2] ? h2Match[2].trim() : "Section",
        content: part, // full content (for display)
        copyContent: copyContent, // h2-stripped (for clipboard)
      };
    })
    .filter(Boolean);
}

/**
 * Builds one card DOM element per section and appends them to
 * #sectionsContainer. Also stores the full output string for "Copy All".
 *
 * Behaviour:
 *  - Clicking Copy: copies copyContent (no h2), collapses the pre block,
 *    shows a "✓ Done — click to expand" hint in the header.
 *  - Clicking the chevron (or anywhere on the header after collapse):
 *    re-expands the pre block.
 */
function renderSections(sections, fullOutput) {
  const container = document.getElementById("sectionsContainer");
  container.innerHTML = "";
  container.dataset.fullOutput = fullOutput;

  sections.forEach(function (section, index) {
    const color = getSectionColor(section.id);

    const card = document.createElement("div");
    card.className = "section-card";
    card.style.setProperty("--card-color", color);

    // ── Header ────────────────────────────────────────────────
    const header = document.createElement("div");
    header.className = "section-card-header";

    const numBadge = document.createElement("span");
    numBadge.className = "section-num";
    numBadge.textContent = index + 1;

    const nameSpan = document.createElement("span");
    nameSpan.className = "section-name";
    nameSpan.textContent = section.name;

    // Chevron — rotates when collapsed
    const chevron = document.createElement("span");
    chevron.className = "section-chevron";
    chevron.innerHTML = "&#8964;"; // ⌄
    chevron.title = "Toggle section";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-section-copy";
    copyBtn.textContent = "Copy";

    header.appendChild(numBadge);
    header.appendChild(nameSpan);
    header.appendChild(chevron);
    header.appendChild(copyBtn);

    // ── Content pre ───────────────────────────────────────────
    const pre = document.createElement("pre");
    pre.className = "section-html";
    pre.textContent = section.content;

    // ── Copy logic — copies stripped content, then collapses ──
    copyBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // don't bubble to header toggle
      copyToClipboard(section.copyContent, null, null, copyBtn);

      // Collapse after a brief delay so the "✓ Copied!" label is visible
      setTimeout(function () {
        collapseCard(card, pre, chevron);
      }, 800);
    });

    // ── Header click — toggle open/closed ─────────────────────
    header.addEventListener("click", function (e) {
      // Ignore clicks directly on the Copy button
      if (e.target === copyBtn || copyBtn.contains(e.target)) return;
      if (card.classList.contains("is-collapsed")) {
        expandCard(card, pre, chevron);
      } else {
        collapseCard(card, pre, chevron);
      }
    });

    card.appendChild(header);
    card.appendChild(pre);
    container.appendChild(card);
  });
}

function collapseCard(card, pre, chevron) {
  pre.style.overflowY = "hidden"; // lock scroll during animation
  pre.style.maxHeight = pre.scrollHeight + "px";
  requestAnimationFrame(function () {
    pre.style.maxHeight = "0";
    pre.style.paddingTop = "0";
    pre.style.paddingBottom = "0";
  });
  card.classList.add("is-collapsed");
  chevron.style.transform = "rotate(-90deg)";
}

function expandCard(card, pre, chevron) {
  pre.style.overflowY = "hidden"; // lock scroll during animation
  pre.style.maxHeight = pre.scrollHeight + "px";
  pre.style.paddingTop = "";
  pre.style.paddingBottom = "";
  card.classList.remove("is-collapsed");
  chevron.style.transform = "";

  pre.addEventListener("transitionend", function handler() {
    if (!card.classList.contains("is-collapsed")) {
      pre.style.maxHeight = "240px";
      pre.style.overflowY = "auto"; // restore scrolling once open
    }
    pre.removeEventListener("transitionend", handler);
  });
}

/**
 * Copies text to clipboard.
 * notificationId  — if provided, shows the floating "copied!" badge
 * notificationMsg — message for that badge
 * btn             — if provided, temporarily changes its label to "✓ Copied!"
 */
function copyToClipboard(text, notificationId, notificationMsg, btn) {
  // Try the modern Clipboard API first (requires HTTPS or localhost)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(fallback);
  } else {
    fallback();
  }

  function fallback() {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    onSuccess();
  }

  function onSuccess() {
    if (notificationId)
      showNotification(notificationId, notificationMsg || "Copied!");
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "✓ Copied!";
      btn.classList.add("copied");
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 2000);
    }
  }
}

// ============================================================
//  MANUAL PASTE FORMATTER  (original — unchanged)
// ============================================================

function formatClosureInfo() {
  const inputText = document.getElementById("closureInfo").value;
  const formattedOutput = document.getElementById("formattedOutput");
  let output = "";

  const lines = inputText.split("\n");
  lines.forEach((line) => {
    const splitIndex = line.indexOf(":");
    if (splitIndex !== -1) {
      const strongPart = line.substring(0, splitIndex).trim();
      let paragraphPart = line.substring(splitIndex + 1).trim();
      paragraphPart = paragraphPart.replace(
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
        (match) => convertDate(match)
      );
      const location = "<strong>" + formatText(strongPart) + "</strong>";
      const details = "<p>" + formatText(paragraphPart) + "</p>";
      output += location + "\n" + details + "\n\n";
    } else {
      console.log('Invalid entry (missing ":"): ' + line);
    }
  });

  formattedOutput.value = output.trim();
}

function resetInput() {
  document.getElementById("closureInfo").value = "";
  document.getElementById("formattedOutput").value = "";
}

function copyResult() {
  const ta = document.getElementById("formattedOutput");
  copyToClipboard(ta.value, "notificationOutput", "Text copied to clipboard!");
}

function showNotification(id, message) {
  const el = document.getElementById(id) || document.querySelector("." + id);
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

document
  .getElementById("btn-format")
  .addEventListener("click", formatClosureInfo);
document.getElementById("btn-reset").addEventListener("click", resetInput);
document.getElementById("btn-copy").addEventListener("click", copyResult);
