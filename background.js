console.log("BACKGROUND: service worker loaded");

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("BACKGROUND: Received message from popup:", request);
  if (request.type === "UPDATE_RULES") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
          type: "UPDATE_RULES",
          mocks: request.mocks
        }).then(response => {
          sendResponse({ status: "Rules sent to active tab", count: request.mocks?.length || 0 });
        }).catch(error => {
          sendResponse({ status: "Error sending to active tab", error: error.message });
        });
      } else {
        sendResponse({ status: "No active tab found" });
      }
    });
  }

  if (request.type === "GET_JSON") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
          type: "GET_JSON",
        }).then(response => {
          sendResponse({ status: "Popup asked for a json"});
        }).catch(error => {
          sendResponse({ status: "Error asking for json", error: error.message });
        });
      } else {
        sendResponse({ status: "No active tab found" });
      }
    })
  }
  
  return true;
});