// Popup JavaScript
document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("loading");
  const notCoursePageEl = document.getElementById("not-course-page");
  const courseDataEl = document.getElementById("course-data");
  const courseTitleEl = document.getElementById("course-title");
  const courseDateEl = document.getElementById("course-date");
  const successStatusEl = document.getElementById("success-status");
  const errorStatusEl = document.getElementById("error-status");
  const refreshBtn = document.getElementById("refresh-btn");

  // Aktif tab'i kontrol et
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("udemy.com/course/")) {
      loadingEl.style.display = "none";
      notCoursePageEl.style.display = "block";
      return;
    }

    // Content script'ten bilgi al
    chrome.tabs.sendMessage(tab.id, { action: "getCourseInfo" }, (response) => {
      loadingEl.style.display = "none";
      courseDataEl.style.display = "block";

      if (response && response.success) {
        courseTitleEl.textContent = response.title || "Unknown Course";
        courseDateEl.textContent = response.created
          ? new Date(response.created).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Date not found";

        successStatusEl.style.display = "block";
        errorStatusEl.style.display = "none";
      } else {
        courseTitleEl.textContent = "Information not found";
        courseDateEl.textContent = response?.error || "Unknown error";
        successStatusEl.style.display = "none";
        errorStatusEl.style.display = "block";
      }
    });
  } catch (error) {
    loadingEl.style.display = "none";
    notCoursePageEl.style.display = "block";
    console.error("Popup error:", error);
  }

  // Yenile butonu
  refreshBtn.addEventListener("click", () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "🔄 Refreshing...";

    setTimeout(() => {
      window.location.reload();
    }, 500);
  });
});
