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

  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      year: "numeric",
    });
  }

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

  // Display creation date
  function displayCreationDate(courseData) {
    document.querySelectorAll(".course-creation-date").forEach(el => el.remove());
    const titleElement =
      document.querySelector('.last-update-date') || document.querySelector('[data-purpose="last-update-date"]') || document.querySelector("h1");

    if (!titleElement) return;

    // Create date information
    const dateContainer = document.createElement("div");
    dateContainer.className = "course-creation-date";
    dateContainer.innerHTML = `
        <div class="creation-date-info">
          <span class="creation-date">📅&nbsp; Created ${formatDate(courseData.created)}</span>
        </div>
      `;

    // Add below title
    titleElement.insertAdjacentElement("beforebegin", dateContainer);
  }

  // Show loading indicator
  function showLoadingIndicator() {
    document.querySelectorAll(".course-creation-date").forEach(el => el.remove());
    const titleElement =
      document.querySelector('.last-update-date') || document.querySelector('[data-purpose="last-update-date"]') || document.querySelector("h1");

    if (!titleElement) return;

    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "course-creation-date loading";
    loadingIndicator.innerHTML = `
        <div class="creation-date-info">
          <span class="creation-date">📅&nbsp; Loading...</span>
        </div>
      `;

    titleElement.insertAdjacentElement("beforebegin", loadingIndicator);
  }

  // Show error
  function showError(error) {
    const loadingIndicator = document.querySelector(".course-creation-date.loading");
    if (loadingIndicator) {
      loadingIndicator.innerHTML = `
          <div class="creation-date-info error">
            <span class="creation-date">📅&nbsp; Unable to fetch creation date (${error.message})</span>
          </div>
        `;
      loadingIndicator.classList.remove("loading");
    }
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
      displayCreationDate(courseData);
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
