document.addEventListener("DOMContentLoaded", () => {
  const urlPatternInput = document.getElementById("url-pattern");
  const urlMatchTypeSelect = document.getElementById("url-match-type");
  const httpMethod = document.querySelector("#url-method");
  const statusCode = document.querySelector("#http-status-code");
  const delay = document.querySelector("#delay");
  const mockResponseTextarea = document.getElementById("mock-response");
  const jsonError = document.getElementById("json-error");
  const randomJson = document.getElementById("random-json");
  const saveMockButton = document.getElementById("save-mock");
  const mocksListUl = document.getElementById("mocks-list");
  const httpStatusCodeInput = document.getElementById("http-status-code");
  const editMockIdInput = document.getElementById("edit-mock-id");
  const tabLabelNewRule = document.querySelector("#tab-label-1");
  const tabLabelStartStop = document.querySelector("#tab-label-3");
  const optionsContainer = document.querySelector(".options-container");
  const tabLabels = [...document.querySelectorAll(".tab-label")];
  const tabInputs = [...document.querySelectorAll(".tab-input")];
  const options = [...document.querySelectorAll(".option")];
  const optionIcons = [...document.querySelectorAll(".option-icon")];
  const aliasInput = document.querySelector("#alias");
  const startStopImg = document.querySelector("#start-stop");
  const headerPopup = document.querySelector(".header-popup");
  const responseBody = document.querySelector(".response-body");
  const responseHeaders = document.querySelector(".response-headers");
  const inputResponseBody = document.querySelector("#tab3");
  const inputResponseHeaders = document.querySelector("#tab4");
  const newHeaderSpan = document.querySelector("#new-header-span");
  const inputHeadersTopKey = document.querySelector("#input-headers-top-key");
  const headersImg = document.querySelector("#header-trash");
  const wholeMockResponse = [inputResponseBody, inputResponseHeaders];
  const popupTimer = 5000;
  let popupTimeoutId;
  let draftTimeoutId;
  const themeToggleInput = document.getElementById("theme-toggle-input");

  // Selectors for search functionality
  const ruleListSearchSelect = document.querySelector(
    ".section-search #search-select",
  );
  const ruleListSearchSelectMethod = document.querySelector(
    ".section-search #search-select-method",
  );
  const ruleListSearchInput = document.querySelector(
    ".section-search .search-input",
  );

  const httpColorList = {
    get: "#4CAF50",
    post: "#2196F3",
    put: "#FF9800",
    patch: "#9C27B0",
    delete: "#F44336",
    options: "#9E9E9E",
    head: "#607D8B",
    any: "#343a40",
  };

  const httpMethodNames = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
    "CONNECT",
    "TRACE",
  ];
  const matchTypeNames = [
    "contains",
    "exact",
    "startsWith",
    "endsWith",
    "regex",
  ];

  const collectionRequiredFields = [
    "alias",
    "id",
    "isActive",
    "matchType",
    "method",
    "delay",
    "rawResponse",
    "response",
    "statusCode",
    "urlPattern",
  ];

  let mocks = [];
  let previousMockStates = [];
  let json = null;
  let areRulesActive = null;
  let jsonErrorPos = -1;

  const deleteAllLiHeaders = () => {
    [...document.querySelectorAll(".header-list-item")].forEach((child) => {
      child.remove();
    });
  };

  const toggleAllHeaderListItems = () => {
    let headers = [...document.querySelectorAll(".header-list-item")];
    if (inputHeadersTopKey.checked) {
      headers.forEach((child) => {
        child.firstChild.checked = true;
      });
    } else {
      headers.forEach((child) => {
        child.firstChild.checked = false;
      });
    }
  };

  const getHeadersList = () => {
    const items = [...document.querySelectorAll(".header-list-item")];
    return items.map((item) => ({
      key: item.querySelector(".header-list-item-key").value,
      value: item.querySelector(".header-list-item-value").value,
      checked: item.querySelector(".header-list-item-checkbox").checked,
    }));
  };

  const saveDraft = () => {
    chrome.storage.session.set({
      formDraft: {
        urlPattern: urlPatternInput.value,
        matchType: urlMatchTypeSelect.value,
        method: httpMethod.value,
        statusCode: httpStatusCodeInput.value,
        delay: delay.value,
        rawResponse: mockResponseTextarea.value,
        alias: aliasInput.value,
        headers: getHeadersList(),
        editingId: editMockIdInput.value,
        activeResponseTab: inputResponseBody.checked ? "body" : "headers",
      },
    });
  };

  const scheduleSaveDraft = () => {
    clearTimeout(draftTimeoutId);
    draftTimeoutId = setTimeout(saveDraft, 300);
  };

  const clearDraft = () => {
    chrome.storage.session.remove("formDraft");
  };

  const loadDraft = () => {
    chrome.storage.session.get("formDraft", (data) => {
      const draft = data.formDraft;
      jsonError.style.display = "none";
      if (!draft) return;
      if (draft.urlPattern) urlPatternInput.value = draft.urlPattern;
      if (draft.matchType) urlMatchTypeSelect.value = draft.matchType;
      if (draft.method) httpMethod.value = draft.method;
      if (draft.statusCode) httpStatusCodeInput.value = draft.statusCode;
      if (draft.delay) delay.value = draft.delay;
      if (draft.rawResponse) mockResponseTextarea.value = draft.rawResponse;
      if (draft.alias) aliasInput.value = draft.alias;
      if (draft.editingId) editMockIdInput.value = draft.editingId;
      if (draft.activeResponseTab === "headers") {
        inputResponseHeaders.checked = true;
        showHideResponseContainer();
      }
      if (draft.headers && draft.headers.length) {
        draft.headers.forEach((h) => addHeaderListItem(h.key, h.value));
        const items = [...document.querySelectorAll(".header-list-item")];
        items.forEach((item, i) => {
          if (draft.headers[i] !== undefined) {
            item.querySelector(".header-list-item-checkbox").checked =
              draft.headers[i].checked;
          }
        });
      }
      updateJsonHighlight();
      parseJson();
    });
  };

  const clearForm = () => {
    if (urlPatternInput.value !== "" || mockResponseTextarea.value !== "") {
      urlPatternInput.value = "";
      mockResponseTextarea.value = "";
      updateJsonHighlight();
      httpMethod.value = "get";
      delay.value = "0";
      aliasInput.value = "";
      httpStatusCodeInput.value = "200";
      urlMatchTypeSelect.value = "contains";
      editMockIdInput.value = "";
      jsonError.style.display = "none";
      deleteAllLiHeaders();
      clearDraft();
      urlPatternInput.focus();
    } else {
      return;
    }
  };

  const showHideStartStop = () => {
    areRulesActive = mocks.some((mock) => mock.isActive);
    if (mocks.length === 0) {
      tabLabelStartStop.style.display = "none";
    } else {
      tabLabelStartStop.style.display = "flex";
      startStopImg.src = areRulesActive
        ? "images/stop.svg"
        : "images/active.svg";
    }
  };

  const showHideOptions = (position) => {
    if (optionsContainer.classList.contains("hidden")) {
      toggleOptionsVisibility();
    }
    optionsContainer.style.left = position;
    toggleOptionsVisibility();
  };

  const showHideResponseContainer = () => {
    if (inputResponseBody.checked) {
      responseBody.style.display = "flex";
      responseHeaders.style.display = "none";
    } else {
      responseBody.style.display = "none";
      responseHeaders.style.display = "flex";
    }
  };

  const handleStartStopLabel = async () => {
    if (areRulesActive) {
      previousMockStates = mocks.map((mock) => mock.isActive);
      mocks.forEach((mock) => (mock.isActive = false));
      renderPopup("HTTP interception stopped");
    } else {
      renderPopup("HTTP interception activated");
      if (previousMockStates.length > 0) {
        mocks.forEach((mock, index) => {
          mock.isActive = previousMockStates[index];
        });
      } else {
        mocks.forEach((mock) => (mock.isActive = true));
      }
    }
    await saveMocksToStorage();
    loadMocks();
    notifyBackgroundScriptForRules();
  };

  const handleOptionsLabel = () => {
    if (tabInputs[0].checked) {
      optionsContainer.style.left = "720px";
    } else {
      optionsContainer.style.left = "1520px";
    }
    toggleOptionsVisibility();
  };

  const saveMocksToStorage = () => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ mocks: mocks }, () => {
        console.log("Rule saved.");
        resolve();
      });
    });
  };

  const loadMocks = () => {
    chrome.storage.local.get("mocks", (data) => {
      if (data.mocks) {
        mocks = data.mocks;
        showHideStartStop();
        renderMocksList();
      }
    });
  };

  const mergeMocks = (existingMocks, importedMocks) => {
    const merged = [...existingMocks];
    let newCount = 0;
    let updatedCount = 0;

    for (const imported of importedMocks) {
      const index = merged.findIndex((m) => m.id === imported.id);
      if (index !== -1) {
        merged[index] = imported;
        updatedCount++;
      } else {
        merged.push(imported);
        newCount++;
      }
    }

    return { merged, newCount, updatedCount };
  };

  const loadJson = () => {
    chrome.storage.local.get("json", (data) => {
      if (data.json) {
        json = data.json;
        console.log(json);
      }
    });
  };

  const setFilteredMocks = () => {
    let filteredMocks = [...mocks];
    const filterBy = ruleListSearchSelect.value;
    const searchTerm = ruleListSearchInput.value.trim();
    const searchMethod = ruleListSearchSelectMethod.value.toLowerCase().trim();

    if (filterBy === "all") {
      filteredMocks = mocks;
    } else if (filterBy === "method") {
      filteredMocks = mocks.filter(
        (mock) => mock.method.toLowerCase() === searchMethod,
      );
    } else if (filterBy === "alias") {
      filteredMocks = mocks.filter((mock) => {
        const alias = mock.alias;
        const urlPattern = mock.urlPattern;

        return (
          (alias.includes(searchTerm) && searchTerm.length > 0) ||
          (urlPattern.includes(searchTerm) && searchTerm.length > 0)
        );
      });
    } else if (filterBy === "httpCode") {
      filteredMocks = mocks.filter(
        (mock) => mock.statusCode.toString() === searchTerm,
      );
    }

    return filteredMocks;
  };

  const renderMocksList = () => {
    mocksListUl.innerHTML = "";

    const filteredMocks = setFilteredMocks();

    filteredMocks.forEach((mock) => {
      const listItem = document.createElement("li");
      let color = httpColorList[mock.method.toLowerCase()] || httpColorList.any;
      listItem.dataset.id = mock.id;
      listItem.style.borderLeft = `3px solid ${color}`;

      const infoDiv = document.createElement("div");
      infoDiv.classList.add("mock-info");
      infoDiv.innerHTML = `
          <strong>${mock.method} ${!mock.alias ? (mock.urlPattern.length > 70 ? mock.urlPattern.substring(0, 70) + "..." : mock.urlPattern) : mock.alias}</strong> <small>(${mock.matchType}) - HTTP ${mock.statusCode} - Delay ${mock.delay}ms</small>
          <pre style="font-size:0.8em; max-height: 60px; overflow:auto;">${mock.rawResponse.substring(0, 300)}${mock.rawResponse.length > 500 ? "..." : ""}</pre>
        `;

      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("actions");

      const toggleButton = document.createElement("button");
      toggleButton.textContent = mock.isActive ? "On" : "Off";
      toggleButton.style.backgroundColor = mock.isActive
        ? "#28a745"
        : "#ffc107";
      toggleButton.style.color = mock.isActive ? "white" : "black";
      toggleButton.classList.add("toggle-btn");
      toggleButton.addEventListener("click", () =>
        toggleMockActiveState(mock.id),
      );

      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.classList.add("edit-btn");
      editButton.addEventListener("click", () => populateFormForEdit(mock.id));

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-btn");
      deleteButton.addEventListener("click", () => deleteMock(mock.id));

      actionsDiv.appendChild(toggleButton);
      actionsDiv.appendChild(editButton);
      actionsDiv.appendChild(deleteButton);

      listItem.appendChild(infoDiv);
      listItem.appendChild(actionsDiv);
      mocksListUl.appendChild(listItem);
    });
  };

  const addHeaderListItem = (key = "", value = "") => {
    const li = document.createElement("li");
    li.className = "header-list-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "header-list-item-checkbox";
    checkbox.checked = true;
    checkbox.title = "Disable header";

    const inputKey = document.createElement("input");
    inputKey.type = "text";
    inputKey.className = "header-list-item-key";
    inputKey.placeholder = "Key";

    const inputValue = document.createElement("input");
    inputValue.type = "text";
    inputValue.className = "header-list-item-value";
    inputValue.placeholder = "Value";

    const span = document.createElement("span");
    span.className = "rotated";
    span.title = "Remove header";
    span.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    span.addEventListener("click", () => {
      li.remove();
      scheduleSaveDraft();
    });

    li.appendChild(checkbox);
    li.appendChild(inputKey);
    li.appendChild(inputValue);
    li.appendChild(span);

    const ul = document.querySelector(".headers-list");
    ul.appendChild(li);

    if (key || value) {
      inputKey.value = key;
      inputValue.value = value;
    }
  };

  const findBracketMismatch = (text) => {
    const stack = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] === '"') {
        i++;
        while (i < text.length) {
          if (text[i] === "\\") i += 2;
          else if (text[i] === '"') { i++; break; }
          else i++;
        }
      } else if (text[i] === "{" || text[i] === "[") {
        stack.push({ char: text[i], pos: i });
        i++;
      } else if (text[i] === "}") {
        const last = stack.pop();
        if (!last || last.char !== "{") {
          return i;
        }
        i++;
      } else if (text[i] === "]") {
        const last = stack.pop();
        if (!last || last.char !== "[") {
          return i;
        }
        i++;
      } else {
        i++;
      }
    }
    if (stack.length > 0) {
      return stack[stack.length - 1].pos;
    }
    return -1;
  };

  const hasBalancedQuotes = (text) => {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '"') {
        let backslashes = 0;
        while (i - backslashes - 1 >= 0 && text[i - backslashes - 1] === "\\") {
          backslashes++;
        }
        if (backslashes % 2 === 0) count++;
      }
    }
    return count % 2 === 0;
  };

  const parseErrorPos = (error) => {
    const match = error.message.match(/position\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  };

  const setErrorPos = (currentJson, error) => {
    const jsonPos = parseErrorPos(error);
    if (!hasBalancedQuotes(currentJson)) {
      jsonErrorPos = jsonPos;
      return;
    }
    const bracketPos = findBracketMismatch(currentJson);
    if (bracketPos >= 0 && !("}]".includes(currentJson[bracketPos]) && currentJson[jsonPos] === ":")) {
      jsonErrorPos = bracketPos;
    } else {
      jsonErrorPos = jsonPos;
    }
  };

  const parseJson = () => {
    try {
      const currentJson = mockResponseTextarea.value;
      if (currentJson) {
        const parsedJson = JSON.parse(currentJson);
        mockResponseTextarea.value = JSON.stringify(parsedJson, null, 2);
        jsonError.style.display = "none";
        jsonErrorPos = -1;
        updateJsonHighlight();
        scheduleSaveDraft();
      } else {
        jsonError.style.display = "none";
        jsonErrorPos = -1;
      }
    } catch (error) {
      setErrorPos(mockResponseTextarea.value, error);
      jsonError.textContent = "Invalid JSON syntax";
      jsonError.style.display = "block";
      jsonError.style.textAlign = "right";
      updateJsonHighlight();
    }
  };

  const validateJsonOnInput = () => {
    const currentJson = mockResponseTextarea.value;
    if (!currentJson) {
      jsonError.style.display = "none";
      jsonErrorPos = -1;
      updateJsonHighlight();
      return;
    }
    try {
      JSON.parse(currentJson);
      jsonError.style.display = "none";
      jsonErrorPos = -1;
      updateJsonHighlight();
    } catch (error) {
      setErrorPos(currentJson, error);
      jsonError.textContent = "Invalid JSON syntax";
      jsonError.style.display = "block";
      jsonError.style.textAlign = "right";
      updateJsonHighlight();
    }
  };

  const highlightJSON = (text, errorPos) => {
    const addSpan = (content, className, start, end) => {
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const inError = errorPos >= 0 && errorPos >= start && errorPos < end;
      const errorClass = inError ? " error-underline" : "";
      return `<span class="${className}${errorClass}">${escaped}</span>`;
    };

    let result = "";
    let i = 0;
    while (i < text.length) {
      const pos = i;
      if (text[i] === '"') {
        i++;
        while (i < text.length) {
          if (text[i] === "\\") i += 2;
          else if (text[i] === '"') {
            i++;
            break;
          } else i++;
        }
        let j = i;
        while (
          j < text.length &&
          (text[j] === " " ||
            text[j] === "\t" ||
            text[j] === "\n" ||
            text[j] === "\r")
        )
          j++;
        const isKey = text[j] === ":";
        result += addSpan(
          text.substring(pos, i),
          isKey ? "json-key" : "json-string",
          pos,
          i,
        );
      } else if (
        (text[i] >= "0" && text[i] <= "9") ||
        (text[i] === "-" &&
          i + 1 < text.length &&
          text[i + 1] >= "0" &&
          text[i + 1] <= "9")
      ) {
        i++;
        while (i < text.length && /[\d.eE]/.test(text[i])) {
          if (
            (text[i] === "+" || text[i] === "-") &&
            text[i - 1] !== "e" &&
            text[i - 1] !== "E"
          )
            break;
          i++;
        }
        result += addSpan(text.substring(pos, i), "json-number", pos, i);
      } else if (text.substring(i, i + 4) === "true") {
        result += addSpan("true", "json-boolean", pos, pos + 4);
        i += 4;
      } else if (text.substring(i, i + 5) === "false") {
        result += addSpan("false", "json-boolean", pos, pos + 5);
        i += 5;
      } else if (text.substring(i, i + 4) === "null") {
        result += addSpan("null", "json-null", pos, pos + 4);
        i += 4;
      } else if ("{}[]".includes(text[i])) {
        result += addSpan(text[i], "json-brace", pos, pos + 1);
        i++;
      } else {
        const ch = text[i];
        const escaped =
          ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch;
        const inError = errorPos >= 0 && errorPos >= pos && errorPos < pos + 1;
        result += inError
          ? `<span class="error-underline">${escaped}</span>`
          : escaped;
        i++;
      }
    }
    return result;
  };

  const updateJsonHighlight = () => {
    const code = document.getElementById("json-highlight");
    if (!code) return;
    const text = mockResponseTextarea.value;
    code.innerHTML = text ? highlightJSON(text, jsonErrorPos) : "";
    if (text.length > 0) {
      mockResponseTextarea.removeAttribute("placeholder");
    } else {
      mockResponseTextarea.setAttribute(
        "placeholder",
        '{ "mock": "hello world" }',
      );
    }
  };

  const syncJsonHighlightScroll = () => {
    const overlay = document.querySelector(".json-editor-overlay");
    if (overlay) {
      overlay.scrollTop = mockResponseTextarea.scrollTop;
      overlay.scrollLeft = mockResponseTextarea.scrollLeft;
    }
  };

  const handleJsonIndentation = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const start = mockResponseTextarea.selectionStart;
      const value = mockResponseTextarea.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : "";
      const trimmedLine = currentLine.trimEnd();
      const lastChar = trimmedLine.slice(-1);
      const needsClosure = lastChar === "{" || lastChar === "[";
      const closingChar = lastChar === "{" ? "}" : "]";
      const extraIndent = needsClosure ? "  " : "";
      const closure = needsClosure ? "\n" + currentIndent + closingChar : "";
      const insertion = "\n" + currentIndent + extraIndent + closure;
      const before = value.substring(0, start);
      const after = value.substring(mockResponseTextarea.selectionEnd);
      mockResponseTextarea.value = before + insertion + after;
      const newPos =
        before.length + 1 + currentIndent.length + extraIndent.length;
      mockResponseTextarea.selectionStart = mockResponseTextarea.selectionEnd =
        newPos;
      scheduleSaveDraft();
      updateJsonHighlight();
    }
  };

  const populateFormForEdit = (id) => {
    const mockToEdit = mocks.find((m) => m.id === id);
    if (mockToEdit) {
      deleteAllLiHeaders();
      document.querySelector("#tab1").checked = true;
      urlPatternInput.value = mockToEdit.urlPattern;
      urlMatchTypeSelect.value = mockToEdit.matchType;
      httpMethod.value = mockToEdit.method.toLowerCase();
      delay.value = mockToEdit.delay;
      mockResponseTextarea.value = mockToEdit.rawResponse;
      jsonErrorPos = -1;
      jsonError.style.display = "none";
      updateJsonHighlight();
      scheduleSaveDraft();
      httpStatusCodeInput.value = mockToEdit.statusCode;
      aliasInput.value = mockToEdit.alias || null;
      editMockIdInput.value = mockToEdit.id; //Save the ID in order to know we are editing an existing mock
      Object.entries(mockToEdit.headers).forEach(([key, value]) => {
        addHeaderListItem(key, value);
      });
      urlPatternInput.focus();
    }
  };

  const toggleMockActiveState = async (id) => {
    const mockIndex = mocks.findIndex((m) => m.id === id);
    if (mockIndex > -1) {
      mocks[mockIndex].isActive = !mocks[mockIndex].isActive;
      await saveMocksToStorage();
      renderMocksList();
      notifyBackgroundScriptForRules();
    }
    showHideStartStop();
  };

  const deleteMock = async (id) => {
    deletedMock = mocks.find((mock) => mock.id === id);
    mocks = mocks.filter((mock) => mock.id !== id);
    await saveMocksToStorage();
    renderMocksList();
    notifyBackgroundScriptForRules();
    showHideStartStop();
    renderPopup(
      `Rule ${deletedMock.method} ${deletedMock.alias !== "" ? deletedMock.alias : deletedMock.urlPattern.length > 20 ? deletedMock.urlPattern.substring(0, 20) + "..." : deletedMock.urlPattern} has been removed`,
    );
  };

  const notifyBackgroundScriptForRules = () => {
    chrome.runtime.sendMessage(
      { type: "UPDATE_RULES", mocks: mocks },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error sending new rule / mock to the background:",
            chrome.runtime.lastError.message,
          );
        } else {
          console.log("Background notified:", response);
        }
      },
    );
  };

  const notifyBackgroundScriptForJson = () => {
    chrome.runtime.sendMessage({ type: "GET_JSON", json: [] }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error asking for json to the background:",
          chrome.runtime.lastError.message,
        );
        renderPopup("Error generating json");
      } else {
        console.log("Background notified:", response);
        loadJson();
        populateTextAreaWithJson();
        renderPopup("Json generated");
      }
    });
  };

  const populateTextAreaWithJson = () => {
    setTimeout(() => {
      mockResponseTextarea.value = json ? json : "";
      jsonErrorPos = -1;
      jsonError.style.display = "none";
      updateJsonHighlight();
      scheduleSaveDraft();
    }, 50); // Wait a bit to ensure the background script has time to respond
  };

  const saveOrEditMock = async () => {
    let isNewSave = null;
    const urlPattern = urlPatternInput.value.trim();
    const matchType = urlMatchTypeSelect.value;
    const method = httpMethod.value.toUpperCase();
    const delayValue = parseInt(delay.value) || 0;
    const responseStr = mockResponseTextarea.value.trim();
    const statusCode = parseInt(httpStatusCodeInput.value) || 200;
    const alias = aliasInput.value.trim();
    const editingId = editMockIdInput.value
      ? parseInt(editMockIdInput.value)
      : null;
    const headers = getHeaders();

    if (!urlPattern || !responseStr) {
      renderPopup("URL pattern and response are required");
      return;
    }

    let mockResponseJSON;
    try {
      mockResponseJSON = JSON.parse(responseStr);
      jsonError.style.display = "none";
    } catch (error) {
      jsonError.textContent = "Invalid JSON syntax";
      jsonError.style.display = "block";
      return;
    }

    if (!editingId) {
      isNewSave = true;
      const newMock = {
        id: Date.now(),
        urlPattern,
        matchType,
        method,
        delay: delayValue,
        response: mockResponseJSON,
        rawResponse: responseStr,
        statusCode,
        alias: alias ?? null,
        isActive: true,
        headers,
      };
      mocks.push(newMock);
    }

    const mockIndex = mocks.findIndex((m) => m.id === editingId);
    if (mockIndex > -1) {
      isNewSave = false;
      mocks[mockIndex] = {
        ...mocks[mockIndex],
        urlPattern,
        matchType,
        method,
        delay: delayValue,
        response: mockResponseJSON,
        rawResponse: responseStr,
        statusCode,
        alias: alias ?? null,
        headers,
      };
    }

    await saveMocksToStorage();
    renderMocksList();
    notifyBackgroundScriptForRules();
    clearForm();
    showHideStartStop();
    isNewSave
      ? renderPopup("Rule saved")
      : renderPopup(
          `Rule ${mocks[mockIndex].method} ${mocks[mockIndex].alias !== "" ? mocks[mockIndex].alias : mocks[mockIndex].urlPattern.length > 20 ? mocks[mockIndex].urlPattern.substring(0, 20) + "..." : mocks[mockIndex].urlPattern} has been edited`,
        );
  };

  const showHideSearchInput = () => {
    if (ruleListSearchSelect.value === "all") {
      ruleListSearchInput.style.display = "none";
      ruleListSearchSelectMethod.style.display = "none";
    } else if (ruleListSearchSelect.value === "httpCode") {
      ruleListSearchInput.type = "number";
      ruleListSearchInput.value = "200";
      ruleListSearchInput.style.display = "inline-block";
      ruleListSearchSelectMethod.style.display = "none";
    } else if (ruleListSearchSelect.value === "method") {
      ruleListSearchInput.style.display = "none";
      ruleListSearchSelectMethod.style.display = "inline-block";
    } else if (ruleListSearchSelect.value === "alias") {
      ruleListSearchInput.type = "text";
      ruleListSearchInput.value = "";
      ruleListSearchInput.style.display = "inline-block";
      ruleListSearchSelectMethod.style.display = "none";
    }
  };

  const toggleOptionsVisibility = () => {
    optionsContainer.classList.toggle("hidden");
  };

  const exportCollection = () => {
    const jsonString = JSON.stringify(mocks, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "my-collection" + ".json";
    link.click();

    URL.revokeObjectURL(url);
    toggleOptionsVisibility();
    renderPopup("Exported JSON collection");
  };

  const handleJson = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();

      reader.onload = async function (e) {
        try {
          validatedMocks = validateJSON(JSON.parse(e.target.result));
          if (!validatedMocks) {
            return;
          }
          const importedMocks = JSON.parse(e.target.result);
          const { merged, newCount, updatedCount } = mergeMocks(
            mocks,
            importedMocks,
          );
          mocks = merged;

          await saveMocksToStorage();
          loadMocks();
          notifyBackgroundScriptForRules();
          clearForm();
          renderPopup(
            `Imported JSON collection. ${newCount} new rules. ${updatedCount} modified.`,
          );
        } catch (error) {
          console.error("Error parsing imported collection:", error);
          renderPopup("Invalid collection format.");
        }
      };

      reader.readAsText(file);
    }
  };

  const importCollection = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", handleJson);
    input.click();
    toggleOptionsVisibility();
  };

  const validateJSON = (json) => {
    if (!Array.isArray(json)) {
      renderPopup("Invalid collection format");
      return false;
    }

    for (let i = 0; i < json.length; i++) {
      const mock = json[i];

      for (const field of collectionRequiredFields) {
        if (!(field in mock)) {
          renderPopup(`Field ${field} is missing`);
          return false;
        }
      }

      if (mock["urlPattern"] === "" || typeof mock["urlPattern"] !== "string") {
        renderPopup("Invalid collection format: urlPattern invalid");
        return false;
      }
      if (
        mock["rawResponse"] === "" ||
        JSON.parse(mock["rawResponse"]) === undefined
      ) {
        renderPopup("Invalid collection format; rawResponse invalid");
        return false;
      }
      if (!httpMethodNames.includes(mock["method"])) {
        renderPopup("Invalid collection format: method invalid");
        return false;
      }
      if (
        typeof mock["statusCode"] !== "number" ||
        mock["statusCode"] <= 99 ||
        mock["statusCode"] >= 600
      ) {
        renderPopup("Invalid collection format: statusCode invalid");
        return false;
      }
      if (!matchTypeNames.includes(mock["matchType"])) {
        renderPopup("Invalid collection format");
        return false;
      }
      if (typeof mock["id"] !== "number") {
        renderPopup("Invalid collection format: id invalid");
        return false;
      }
      if (typeof mock["isActive"] !== "boolean") {
        renderPopup("Invalid collection format: isActive invalid");
        return false;
      }
      if (typeof mock["response"] === "Object") {
        renderPopup("Invalid collection format");
        return false;
      }
      if (typeof mock["headers"] === "Object") {
        renderPopup("Invalid collection format: Invalid headers");
        return false;
      }
    }

    return true;
  };

  const renderPopup = (text) => {
    headerPopup.style.display = "flex";

    const span = document.createElement("span");
    const img = document.createElement("img");

    span.textContent = text;
    img.onclick = function () {
      span.remove();
      img.remove();
      headerPopup.style.display = "none";
      clearTimeout(popupTimeoutId);
    };
    img.src = "images/close.svg";

    if (headerPopup.querySelector("span")) {
      headerPopup.querySelector("span").textContent = span.textContent;
    } else {
      headerPopup.appendChild(span);
      headerPopup.appendChild(img);
    }

    clearTimeout(popupTimeoutId);

    popupTimeoutId = setTimeout(() => {
      span.remove();
      img.remove();
      headerPopup.style.display = "none";
    }, popupTimer);
  };

  function validateStatusCode(input) {
    try {
      let selectedStatusCodeSection = input === "New Rule" ? true : false;
      let domInput = selectedStatusCodeSection
        ? httpStatusCodeInput
        : ruleListSearchInput;
      let value = parseInt(domInput.value);

      if (value < 100 || value > 599) {
        if (value < 100) {
          domInput.value = 100;
        } else {
          domInput.value = 599;
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  const limitToXDigits = (section, limit) => {
    let selectedStatusCodeSection = section === "New Rule" ? true : false;
    let domInput = selectedStatusCodeSection
      ? httpStatusCodeInput
      : ruleListSearchInput;

    if (domInput.value.length > limit) {
      domInput.value = domInput.value.slice(0, limit);
    }
  };

  const getHeaders = () => {
    const lis = document.querySelectorAll(".header-list-item");
    const headers = {};

    lis.forEach((item) => {
      const checkbox = item.querySelector(".header-list-item-checkbox");
      const keyInput = item.querySelector(".header-list-item-key");
      const valueInput = item.querySelector(".header-list-item-value");
      const key = keyInput.value.trim();
      const value = valueInput.value.trim();

      if (key !== "" && checkbox.checked) {
        headers[key] = value;
      }
    });

    return headers;
  };

  loadMocks();
  loadDraft();

  // header
  tabLabelNewRule.addEventListener("click", clearForm);
  tabLabels[0].onclick = () => showHideOptions("720px");
  tabLabels[1].onclick = () => showHideOptions("1520px");
  tabLabels[2].onclick = handleStartStopLabel;
  tabLabels[3].onclick = handleOptionsLabel;
  headerPopup.addEventListener(
    "load",
    () => (headerPopup.style.display = "flex"),
  );

  // create rule section
  mockResponseTextarea.addEventListener("blur", parseJson);
  randomJson.addEventListener("click", notifyBackgroundScriptForJson);
  saveMockButton.addEventListener("click", saveOrEditMock);
  statusCode.addEventListener("blur", () => validateStatusCode("New Rule"));
  statusCode.addEventListener("input", () => limitToXDigits("New Rule", 3));
  wholeMockResponse.forEach((input) => {
    input.addEventListener("click", showHideResponseContainer);
  });
  newHeaderSpan.addEventListener("click", () => {
    addHeaderListItem();
    scheduleSaveDraft();
  });
  headersImg.addEventListener("click", () => {
    deleteAllLiHeaders();
    scheduleSaveDraft();
  });
  inputHeadersTopKey.addEventListener("change", () =>
    toggleAllHeaderListItems(),
  );

  // Rule list section
  ruleListSearchSelect.addEventListener("click", showHideSearchInput);
  ruleListSearchSelect.addEventListener("click", renderMocksList);
  ruleListSearchSelect.addEventListener("change", renderMocksList);
  ruleListSearchSelect.addEventListener("change", () => {
    if (ruleListSearchInput.type === "number") limitToXDigits("Rule List", 3);
    else {
      limitToXDigits("Rule List", 40);
    }
  });
  ruleListSearchSelectMethod.addEventListener("change", renderMocksList);
  ruleListSearchInput.addEventListener("blur", validateStatusCode("Rule List"));
  ruleListSearchInput.addEventListener("input", () => {
    if (ruleListSearchInput.type === "number") limitToXDigits("Rule List", 3);
    else {
      limitToXDigits("Rule List", 40);
    }
  });
  ruleListSearchInput.addEventListener("input", renderMocksList);

  // Options menu
  options[0].onmouseenter = () =>
    (optionIcons[0].src = "images/import-white.svg");
  options[0].onmouseleave = () =>
    (optionIcons[0].src = "images/import-black.svg");
  options[1].onmouseenter = () =>
    (optionIcons[1].src = "images/export-white.svg");
  options[1].onmouseleave = () =>
    (optionIcons[1].src = "images/export-black.svg");
  options[0].addEventListener("click", importCollection);
  options[1].addEventListener("click", exportCollection);

  // Auto-save draft on form changes
  const formInputs = [
    urlPatternInput,
    urlMatchTypeSelect,
    httpMethod,
    httpStatusCodeInput,
    delay,
    mockResponseTextarea,
    aliasInput,
  ];
  formInputs.forEach((el) => {
    el.addEventListener("input", scheduleSaveDraft);
    el.addEventListener("change", scheduleSaveDraft);
  });

  // JSON editor: indentation, highlighting, validation, scroll sync
  mockResponseTextarea.addEventListener("keydown", handleJsonIndentation);
  mockResponseTextarea.addEventListener("input", () => {
    validateJsonOnInput();
    updateJsonHighlight();
  });
  mockResponseTextarea.addEventListener("scroll", syncJsonHighlightScroll);
  updateJsonHighlight();

  // Theme toggle
  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggleInput.checked = true;
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggleInput.checked = false;
    }
  };

  chrome.storage.local.get("theme", (data) => {
    applyTheme(data.theme === "dark");
  });

  themeToggleInput.addEventListener("change", () => {
    const isDark = themeToggleInput.checked;
    applyTheme(isDark);
    chrome.storage.local.set({ theme: isDark ? "dark" : "light" });
  });
});
