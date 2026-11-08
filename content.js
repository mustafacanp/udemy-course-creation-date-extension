(function () {
  "use strict";

  // Cache course information
  const courseCache = new Map();

  // Rate limiting
  let lastRequestTime = 0;
  const REQUEST_DELAY = 1000; // 1 second

  // Get course ID
  function getCourseId() {
    const body = document.querySelector("body");
    const courseId = body?.getAttribute("data-clp-course-id");
    return courseId ? parseInt(courseId) : null;
  }

  // Format date as MM/YYYY, matching Udemy's "Last updated" format
  function formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${month}/${date.getFullYear()}`;
  }

  // Labels in the page language (falls back to English)
  const LABELS = {
    en: { created: "Created", loading: "Loading creation date…", error: "Unable to fetch creation date" },
    tr: { created: "Oluşturulma tarihi:", loading: "Oluşturulma tarihi yükleniyor…", error: "Oluşturulma tarihi alınamadı" },
    de: { created: "Erstellt" },
    fr: { created: "Créé le" },
    es: { created: "Creado" },
    it: { created: "Creato" },
    pt: { created: "Criado em" },
    ja: { created: "作成日" },
    ko: { created: "생성일" },
    zh: { created: "创建于" },
  };

  function getLabel(key) {
    const lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
    return LABELS[lang]?.[key] || LABELS.en[key];
  }

  // Calendar icon used when Udemy's own icon can't be cloned
  const FALLBACK_ICON = `
    <svg class="creation-date-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"
         fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"></rect>
      <path d="M16 2v4M8 2v4M3 10h18"></path>
    </svg>`;

  // Fetch course data from API
  async function fetchCourseData(courseId) {
    // Check cache
    if (courseCache.has(courseId)) {
      return courseCache.get(courseId);
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }

    try {
      const url = `https://www.udemy.com/api-2.0/courses/${courseId}/?fields[course]=created,title`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      lastRequestTime = Date.now();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Save to cache
      courseCache.set(courseId, data);

      return data;
    } catch (error) {
      console.error("Error fetching course information:", error);
      throw error;
    }
  }

  // "Last updated" label in the languages Udemy supports
  const LAST_UPDATE_TEXT =
    /(last updated|son güncelleme|zuletzt aktualisiert|dernière mise à jour|última actualización|ultimo aggiornamento|última atualização|laatst bijgewerkt|ostatnia aktualizacja|последнее обновление|最終更新|最近更新|上次更新|마지막 업데이트|terakhir diperbarui|อัปเดตล่าสุด|cập nhật lần cuối)/i;

  // Find the "Last updated" element on the course page
  function findLastUpdateElement() {
    const bySelector = document.querySelector(
      '[data-purpose="last-update-date"], .last-update-date, [class*="last-update-date"]'
    );
    if (bySelector) return bySelector;

    // Fallback: search text nodes (Udemy class names change often)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest(".course-creation-date, script, style")) {
          return NodeFilter.FILTER_REJECT;
        }
        return LAST_UPDATE_TEXT.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const textNode = walker.nextNode();
    return textNode ? textNode.parentElement : null;
  }

  // The "Last updated" date usually sits in a horizontal row together with the
  // language info. Climb up to that whole row so the creation date gets its own
  // line right above it instead of being squeezed into the row.
  function getRowContainer(element) {
    let target = element;
    while (target.parentElement && target.parentElement !== document.body) {
      const parent = target.parentElement;
      if (parent.querySelector("h1")) break; // never climb above the title area

      const parentStyle = getComputedStyle(parent);
      const isHorizontalFlex =
        parentStyle.display.includes("flex") && parentStyle.flexDirection.startsWith("row");
      const isInline = getComputedStyle(target).display.startsWith("inline");

      if (!isHorizontalFlex && !isInline) break;
      target = parent;
    }
    return target;
  }

  // Decide where to insert: before the "Last updated" row, or before the title as last resort
  function findInsertionPoint() {
    const lastUpdate = findLastUpdateElement();
    if (lastUpdate) return getRowContainer(lastUpdate);
    return document.querySelector("h1");
  }

  // Wait briefly for the "Last updated" element in case the page is still rendering
  async function waitForInsertionPoint(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const lastUpdate = findLastUpdateElement();
      if (lastUpdate) return getRowContainer(lastUpdate);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return findInsertionPoint();
  }

  function insertDateElement(element, anchor) {
    document.querySelectorAll(".course-creation-date").forEach((el) => el.remove());
    if (!anchor) return;
    anchor.insertAdjacentElement("beforebegin", element);
  }

  // Build the date row so it looks like Udemy's own "Last updated" row:
  // same icon, same text color and size
  function buildDateElement(text, stateClass) {
    const container = document.createElement("div");
    container.className = `course-creation-date ${stateClass || ""}`.trim();

    const lastUpdate = findLastUpdateElement();
    const udemyIcon = lastUpdate?.querySelector("svg");
    if (udemyIcon) {
      const icon = udemyIcon.cloneNode(true);
      icon.classList.add("creation-date-icon");
      container.appendChild(icon);
    } else {
      container.insertAdjacentHTML("beforeend", FALLBACK_ICON);
    }

    const label = document.createElement("span");
    label.className = "creation-date";
    label.textContent = text;
    container.appendChild(label);

    // Copy typography from the "Last updated" text so both rows match
    if (lastUpdate) {
      const style = getComputedStyle(lastUpdate);
      container.style.color = style.color;
      container.style.fontSize = style.fontSize;
      container.style.lineHeight = style.lineHeight;
      container.style.fontFamily = style.fontFamily;
    }

    return container;
  }

  // Display creation date
  async function displayCreationDate(courseData) {
    const anchor = await waitForInsertionPoint();
    const text = `${getLabel("created")} ${formatDate(courseData.created)}`;
    insertDateElement(buildDateElement(text), anchor);
  }

  // Show loading indicator
  function showLoadingIndicator() {
    insertDateElement(buildDateElement(getLabel("loading"), "loading"), findInsertionPoint());
  }

  // Show error (replaces the loading indicator)
  function showError(error) {
    const loadingIndicator = document.querySelector(".course-creation-date.loading");
    if (!loadingIndicator) return;
    const errorElement = buildDateElement(`${getLabel("error")} (${error.message})`, "error");
    loadingIndicator.replaceWith(errorElement);
  }

  // Main function
  async function init() {
    const courseId = getCourseId();

    if (!courseId) {
      console.log("Course ID not found");
      return;
    }

    try {
      showLoadingIndicator();
      const courseData = await fetchCourseData(courseId);
      await displayCreationDate(courseData);
    } catch (error) {
      showError(error);
    }
  }

  // Run when page loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Observer for SPA navigation
  const observer = new MutationObserver((mutations) => {
    const hasSignificantChange = mutations.some((mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0);

    if (hasSignificantChange) {
      // Timeout for debouncing
      clearTimeout(window.courseExtensionTimeout);
      window.courseExtensionTimeout = setTimeout(() => {
        const newCourseId = getCourseId();
        if (newCourseId && newCourseId !== window.lastProcessedCourseId) {
          window.lastProcessedCourseId = newCourseId;
          init();
        }
      }, 1000);
    }
  });

  // Observe body
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Cleanup
  window.addEventListener("beforeunload", () => {
    observer.disconnect();
    clearTimeout(window.courseExtensionTimeout);
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCourseInfo") {
      const courseId = getCourseId();

      if (!courseId) {
        sendResponse({ success: false, error: "Course ID not found" });
        return true; // async response
      }

      fetchCourseData(courseId)
        .then((data) => {
          sendResponse({
            success: true,
            title: data.title,
            created: data.created,
          });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message || "Fetch failed" });
        });

      return true; // Will respond asynchronously
    }
  });
})();
