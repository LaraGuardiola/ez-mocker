console.log("ISOLATED: Content script loaded in the isolated world");

let activeMocks = [];
let mocksLoaded = false;

// Send mocks to main world
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
        mocksLoaded = true;
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
    } else {
        console.log("ISOLATED: Ignoring message with type:", request.type);
    }

    return true;
});

// Storage is the source of truth: any change (popup, standalone tab, import...)
// reaches every open tab, not only the active one
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.mocks) return;

    const mocks = changes.mocks.newValue;
    activeMocks = Array.isArray(mocks) ? mocks.filter(m => m.isActive) : [];
    console.log("ISOLATED: Rules / mocks changed in storage:", activeMocks);
    sendMocksToMainWorld();
});

// The main world may start listening after our first message: resend when it asks.
// Before storage is loaded we stay quiet, an empty list would be taken as "no mocks"
window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "MAIN_READY") return;
    if (mocksLoaded) sendMocksToMainWorld();
});

loadMocksFromStorage();
