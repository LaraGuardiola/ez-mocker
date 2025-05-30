console.log("ISOLATED: Content script loaded in the isolated world");

let activeMocks = [];

// Función para enviar mocks al main world
function sendMocksToMainWorld() {
    console.log("ISOLATED: Sending mocks to main world:", activeMocks);
    window.postMessage({ type: "FROM_ISOLATED_TO_MAIN", payload: activeMocks }, "*");
  }
  
  // load mocks from chrome.storage.local
  function loadMocksFromStorage() {
    chrome.storage.local.get('mocks', (data) => {
      if (data.mocks && Array.isArray(data.mocks)) {
        activeMocks = data.mocks.filter(m => m.isActive);
        console.log("ISOLATED: Active rules / mocks loaded:", activeMocks);
      } else {
        activeMocks = [];
        console.log("ISOLATED: There are no rules / mocks stored in chrome.storage.local.");
      }
      // Enviar mocks después de cargarlos
      sendMocksToMainWorld();
    });
  }
  
  // Listener to handle messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("ISOLATED: Received message from background:", request);
    
    if (request.type === "UPDATE_RULES") { 
      console.log("ISOLATED: Updating rules / mocks in memory:", request.mocks);
      if (request.mocks && Array.isArray(request.mocks)) {
        activeMocks = request.mocks.filter(m => m.isActive);
      } else {
        activeMocks = [];
      }
      sendMocksToMainWorld();
      sendResponse({ status: "Mocks updated in isolated world", count: activeMocks.length });
    }
    return true;
  });
  
  loadMocksFromStorage();
//send mocks to main world
console.log(activeMocks)
window.postMessage({ type: "FROM_ISOLATED_TO_MAIN", payload: activeMocks }, "*");