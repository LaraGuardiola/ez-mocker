console.log("BACKGROUND: service worker loaded");

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await changeIcons();
  } catch (error) {
    console.error("Error trying to change icon:", error);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await changeIcons();
  } catch (error) {
    console.error("Error trying to change icon on startup:", error);
  }
});

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("BACKGROUND: Received message from popup:", request);
  if (request.type === "UPDATE_RULES") {
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        await changeIcons();
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
          sendResponse({ status: "Popup asked for a json" });
        }).catch(error => {
          sendResponse({ status: "Error asking for json", error: error.message });
        });
      } else {
        sendResponse({ status: "No active tab found" });
      }
    })
  }

  return true
});

async function createImageData(imagePath, size) {
  const response = await fetch(chrome.runtime.getURL(imagePath));
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(bitmap, 0, 0, size, size);

  return ctx.getImageData(0, 0, size, size);
}

async function changeIcons() {
  const { mocks } = await chrome.storage.local.get('mocks');
  const allMocks = Array.isArray(mocks) ? mocks : [];

  const isAnyMockActive = allMocks.some(mock => mock.isActive);

  // Diff sizes for the icons or says Invalid icon every single time
  const imageData16 = isAnyMockActive ? await createImageData('images/ez-mocker.png', 16) : await createImageData('images/ez-mocker-black.png', 16);
  const imageData48 = isAnyMockActive ? await createImageData('images/ez-mocker.png', 48) : await createImageData('images/ez-mocker-black.png', 48);
  const imageData128 = isAnyMockActive ? await createImageData('images/ez-mocker.png', 128) : await createImageData('images/ez-mocker-black.png', 128);

  console.log("Icons loaded from local folder");

  // Change icon using ImageData
  await new Promise((resolve, reject) => {
    chrome.action.setIcon({
      imageData: {
        "16": imageData16,
        "48": imageData48,
        "128": imageData128
      }
    }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}
