let activeMocks = [];

// load mocks from chrome.storage.local
function loadMocksFromStorage() {
  chrome.storage.local.get('mocks', (data) => {
    if (data.mocks && Array.isArray(data.mocks)) {
      activeMocks = data.mocks.filter(m => m.isActive);
      console.log("Active rules / mocks loaded:", activeMocks);
    } else {
      activeMocks = [];
      console.log("There are no rules / mocks stored in chrome.storage.local.");
    }
  });
}

chrome.runtime.onStartup.addListener(() => {
  console.log("EZ mocker correctly installed.");
  loadMocksFromStorage();
});

// Listener to handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "UPDATE_RULES") { 
    console.log("Updating rules / mocks in memory:", request.mocks);
    if (request.mocks && Array.isArray(request.mocks)) {
      activeMocks = request.mocks.filter(m => m.isActive);
    } else {
      activeMocks = [];
    }
    sendResponse({ status: "Mocks updated in the background", count: activeMocks.length });
  }
  return true;
});


loadMocksFromStorage(); 

console.log("Service Worker (background.js) loaded and listening.");