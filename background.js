chrome.runtime.onInstalled.addListener(() => {
  console.log("Udemy Course Creation Date Extension installed");
});

// Update extension badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (tab.url.includes("udemy.com/course/")) {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: "📅",
      });
      chrome.action.setBadgeBackgroundColor({
        color: "#007bff",
      });
    } else {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: "",
      });
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCourseInfo") {
    // This functionality can be handled in content script
    sendResponse({ success: true });
  }
});

// Error reporting
chrome.runtime.onStartup.addListener(() => {
  console.log("Udemy Extension started");
});

chrome.runtime.onSuspend.addListener(() => {
  console.log("Udemy Extension suspended");
});
