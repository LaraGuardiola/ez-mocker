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
  const tabLabelNewRuleInput = document.getElementById("tab1");
  const tabLabelStartStop = document.querySelector("#tab-label-3");
  const optionsContainer = document.querySelector(".options-container");
  const tabLabels = [...document.querySelectorAll(".tab-label")];
  const options = [...document.querySelectorAll(".option")];
  const optionIcons = [...document.querySelectorAll(".option-icon")];
  const aliasInput = document.querySelector("#alias");
  const collectionInput = document.getElementById("collection");
  const collectionList = document.getElementById("collection-list");
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
  const isStandalone = document.body.classList.contains("tab-mode");
  const collectionToggleButton = document.getElementById("collection-toggle");
  const collectionExportButton = document.getElementById("collection-export");

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
  const ruleListSearchSelectCollection = document.querySelector(
    ".section-search #search-select-collection",
  );
  const ruleSearchNameInput = document.getElementById("rule-search-input");
  const ruleSearchClearButton = document.getElementById("rule-search-clear");
  const ruleSearchCount = document.getElementById("rule-search-count");

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

  const ruleRequiredFields = [
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
  let collectionActiveIndex = -1;
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
        collection: collectionInput.value,
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
      if (draft.collection) collectionInput.value = draft.collection;
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
    if (
      urlPatternInput.value !== "" ||
      mockResponseTextarea.value !== "" ||
      collectionInput.value !== ""
    ) {
      urlPatternInput.value = "";
      mockResponseTextarea.value = "";
      updateJsonHighlight();
      httpMethod.value = "get";
      delay.value = "0";
      aliasInput.value = "";
      collectionInput.value = "";
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

  const hideOptions = () => {
    optionsContainer.classList.add("hidden");
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
    const nameTerm = ruleSearchNameInput.value.trim().toLowerCase();

    if (nameTerm) {
      filteredMocks = filteredMocks.filter((mock) => {
        const alias = (mock.alias || "").toLowerCase();
        const urlPattern = (mock.urlPattern || "").toLowerCase();
        return alias.includes(nameTerm) || urlPattern.includes(nameTerm);
      });
    }

    if (filterBy === "method") {
      filteredMocks = filteredMocks.filter(
        (mock) => mock.method.toLowerCase() === searchMethod,
      );
    } else if (filterBy === "httpCode") {
      filteredMocks = filteredMocks.filter(
        (mock) => mock.statusCode.toString() === searchTerm,
      );
    } else if (filterBy === "collection") {
      filteredMocks = filteredMocks.filter(
        (mock) => mock.collection === ruleListSearchSelectCollection.value,
      );
    }

    return filteredMocks;
  };

  // Collections only exist through the rules using them: no rules, no collection
  const getCollections = () =>
    [...new Set(mocks.map((mock) => mock.collection).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );

  const findCollection = (name) =>
    getCollections().find((c) => c.toLowerCase() === name.toLowerCase());

  const getSelectedCollectionRules = () =>
    mocks.filter(
      (mock) => mock.collection === ruleListSearchSelectCollection.value,
    );

  const updateCollectionActions = () => {
    const rules = getSelectedCollectionRules();
    const isVisible =
      ruleListSearchSelect.value === "collection" && rules.length > 0;
    collectionToggleButton.style.display = isVisible ? "inline-block" : "none";
    collectionExportButton.style.display = isVisible ? "inline-block" : "none";
    if (!isVisible) return;

    const anyActive = rules.some((mock) => mock.isActive);
    collectionToggleButton.textContent = anyActive ? "All off" : "All on";
    collectionToggleButton.classList.toggle("turn-off", anyActive);
    const action = anyActive ? "Disable" : "Enable";
    collectionToggleButton.title =
      `${action} every rule in ${ruleListSearchSelectCollection.value}`;
  };

  const renderCollectionFilterOptions = () => {
    const collections = getCollections();
    const selected = ruleListSearchSelectCollection.value;
    ruleListSearchSelectCollection.innerHTML = "";

    if (collections.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "NO COLLECTIONS";
      ruleListSearchSelectCollection.appendChild(option);
      return;
    }

    collections.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      ruleListSearchSelectCollection.appendChild(option);
    });
    ruleListSearchSelectCollection.value = collections.includes(selected)
      ? selected
      : collections[0];
  };

  const renderMocksList = () => {
    mocksListUl.innerHTML = "";

    renderCollectionFilterOptions();
    updateCollectionActions();
    const filteredMocks = setFilteredMocks();
    const isFiltering =
      filteredMocks.length !== mocks.length ||
      ruleSearchNameInput.value.trim() !== "";

    ruleSearchClearButton.hidden = ruleSearchNameInput.value === "";
    ruleSearchCount.textContent = isFiltering
      ? `${filteredMocks.length} / ${mocks.length}`
      : `${mocks.length}`;

    if (filteredMocks.length === 0 && mocks.length > 0) {
      const emptyItem = document.createElement("li");
      emptyItem.classList.add("mocks-list-empty");
      emptyItem.textContent = "No rules match your search";
      mocksListUl.appendChild(emptyItem);
      return;
    }

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

      if (mock.collection) {
        const collectionBadge = document.createElement("span");
        collectionBadge.classList.add("collection-badge");
        collectionBadge.textContent = mock.collection;
        collectionBadge.title = "Collection";
        infoDiv.querySelector("strong").after(collectionBadge);
      }

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

      const duplicateButton = document.createElement("button");
      duplicateButton.textContent = "Duplicate";
      duplicateButton.classList.add("duplicate-btn");
      duplicateButton.addEventListener("click", () => duplicateMock(mock.id));

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-btn");
      deleteButton.addEventListener("click", () => deleteMock(mock.id));

      actionsDiv.appendChild(toggleButton);
      actionsDiv.appendChild(editButton);
      actionsDiv.appendChild(duplicateButton);
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
    // Every response change (typed or programmatic) ends up here
    updateSaveButtonState();
  };

  const updateSaveButtonState = () => {
    const isFormFilled =
      urlPatternInput.value.trim() !== "" &&
      mockResponseTextarea.value.trim() !== "";
    saveMockButton.disabled = !isFormFilled;
    saveMockButton.title = isFormFilled
      ? ""
      : "URL and response body are required";
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
      collectionInput.value = mockToEdit.collection || "";
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

  const toggleSelectedCollection = async () => {
    const name = ruleListSearchSelectCollection.value;
    const rules = getSelectedCollectionRules();
    if (rules.length === 0) return;

    const isActive = !rules.some((mock) => mock.isActive);
    rules.forEach((mock) => (mock.isActive = isActive));

    await saveMocksToStorage();
    renderMocksList();
    notifyBackgroundScriptForRules();
    showHideStartStop();
    renderPopup(`Collection ${name} ${isActive ? "enabled" : "disabled"}`);
  };

  const duplicateMock = async (id) => {
    const mockIndex = mocks.findIndex((m) => m.id === id);
    if (mockIndex === -1) return;

    const original = mocks[mockIndex];
    // Matching picks the first active mock, so the copy starts disabled
    // to avoid silently shadowing (or being shadowed by) the original
    const copy = {
      ...structuredClone(original),
      id: Date.now(),
      alias: original.alias ? `${original.alias} (copy)` : original.alias,
      isActive: false,
    };

    mocks.splice(mockIndex + 1, 0, copy);
    // Keep Start/Stop saved states aligned with mocks indexes
    if (previousMockStates.length > 0) {
      previousMockStates.splice(mockIndex + 1, 0, false);
    }

    await saveMocksToStorage();
    renderMocksList();
    notifyBackgroundScriptForRules();
    showHideStartStop();

    const copyItem = mocksListUl.querySelector(`li[data-id="${copy.id}"]`);
    if (copyItem) {
      copyItem.classList.add("just-duplicated");
      copyItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    renderPopup(
      `Rule ${original.method} ${original.alias ? original.alias : original.urlPattern.length > 20 ? original.urlPattern.substring(0, 20) + "..." : original.urlPattern} has been duplicated`,
    );
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
    const collectionName = collectionInput.value.trim();
    // Reuse an existing collection when only the casing differs
    const collection = collectionName
      ? findCollection(collectionName) || collectionName
      : null;
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
        collection,
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
        collection,
        headers,
      };
    }

    await saveMocksToStorage();
    renderMocksList();
    notifyBackgroundScriptForRules();
    clearForm();
    // Keep the collection: rules of the same flow are usually created in a row
    collectionInput.value = collection || "";
    scheduleSaveDraft();
    showHideStartStop();
    isNewSave
      ? renderPopup("Rule saved")
      : renderPopup(
          `Rule ${mocks[mockIndex].method} ${mocks[mockIndex].alias !== "" ? mocks[mockIndex].alias : mocks[mockIndex].urlPattern.length > 20 ? mocks[mockIndex].urlPattern.substring(0, 20) + "..." : mocks[mockIndex].urlPattern} has been edited`,
        );
  };

  const showHideSearchInput = () => {
    const filterBy = ruleListSearchSelect.value;
    ruleListSearchInput.style.display = "none";
    ruleListSearchSelectMethod.style.display = "none";
    ruleListSearchSelectCollection.style.display = "none";

    if (filterBy === "httpCode") {
      ruleListSearchInput.type = "number";
      ruleListSearchInput.value = "200";
      ruleListSearchInput.style.display = "inline-block";
    } else if (filterBy === "method") {
      ruleListSearchSelectMethod.style.display = "inline-block";
    } else if (filterBy === "collection") {
      ruleListSearchSelectCollection.style.display = "inline-block";
    }
  };

  const closeCollectionList = () => {
    collectionList.hidden = true;
    collectionActiveIndex = -1;
    collectionInput.setAttribute("aria-expanded", "false");
  };

  const renderCollectionOptions = () => {
    const term = collectionInput.value.trim();
    const lowerTerm = term.toLowerCase();
    const collections = getCollections();
    const options = collections
      .filter((name) => name.toLowerCase().includes(lowerTerm))
      .map((name) => ({ name, label: name, isNew: false }));

    if (term && !findCollection(term)) {
      options.push({ name: term, label: `Create "${term}"`, isNew: true });
    }

    collectionList.innerHTML = "";
    collectionActiveIndex = -1;

    options.forEach(({ name, label, isNew }) => {
      const li = document.createElement("li");
      li.classList.add("combobox-option");
      if (isNew) li.classList.add("combobox-option-new");
      li.setAttribute("role", "option");
      li.textContent = label;
      li.title = label;
      // mousedown fires before the input blur, click would be too late
      li.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selectCollection(name);
      });
      collectionList.appendChild(li);
    });

    collectionList.hidden = options.length === 0;
    collectionInput.setAttribute("aria-expanded", String(!collectionList.hidden));
  };

  const selectCollection = (name) => {
    collectionInput.value = name;
    closeCollectionList();
    scheduleSaveDraft();
  };

  const moveCollectionActive = (step) => {
    const items = [...collectionList.children];
    if (items.length === 0) return;
    collectionActiveIndex =
      (collectionActiveIndex + step + items.length) % items.length;
    items.forEach((item, index) =>
      item.classList.toggle("active", index === collectionActiveIndex),
    );
    items[collectionActiveIndex].scrollIntoView({ block: "nearest" });
  };

  const handleCollectionKeydown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (collectionList.hidden) renderCollectionOptions();
      moveCollectionActive(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && collectionActiveIndex > -1) {
      event.preventDefault();
      collectionList.children[collectionActiveIndex].dispatchEvent(
        new MouseEvent("mousedown"),
      );
    } else if (event.key === "Escape" && !collectionList.hidden) {
      event.preventDefault();
      closeCollectionList();
    }
  };

  const toggleOptionsVisibility = () => {
    optionsContainer.classList.toggle("hidden");
  };

  const downloadRules = (rules, fileName) => {
    const jsonString = JSON.stringify(rules, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportRules = () => {
    downloadRules(mocks, "ez-mocker-rules");
    toggleOptionsVisibility();
    renderPopup(`Exported ${mocks.length} rules`);
  };

  const exportSelectedCollection = () => {
    const name = ruleListSearchSelectCollection.value;
    const rules = mocks.filter((mock) => mock.collection === name);
    if (rules.length === 0) return;
    const fileName = name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "");
    downloadRules(rules, `ez-mocker-${fileName || "collection"}`);
    renderPopup(`Exported collection ${name} (${rules.length} rules)`);
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
            `Imported rules: ${newCount} new, ${updatedCount} modified`,
          );
        } catch (error) {
          console.error("Error parsing imported rules file:", error);
          renderPopup("Invalid rules file");
        }
      };

      reader.readAsText(file);
    }
  };

  const importRules = () => {
    // The popup closes as soon as the native file dialog takes the focus,
    // so the import has to happen in the standalone tab
    if (!isStandalone) {
      chrome.tabs.create({
        url: chrome.runtime.getURL("standalone.html?import=1"),
      });
      window.close();
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", handleJson);
    input.click();
    toggleOptionsVisibility();
  };

  const validateJSON = (json) => {
    if (!Array.isArray(json)) {
      renderPopup("Invalid rules file");
      return false;
    }

    for (let i = 0; i < json.length; i++) {
      const mock = json[i];

      for (const field of ruleRequiredFields) {
        if (!(field in mock)) {
          renderPopup(`Field ${field} is missing`);
          return false;
        }
      }

      if (mock["urlPattern"] === "" || typeof mock["urlPattern"] !== "string") {
        renderPopup("Invalid rules file: urlPattern invalid");
        return false;
      }
      if (
        mock["rawResponse"] === "" ||
        JSON.parse(mock["rawResponse"]) === undefined
      ) {
        renderPopup("Invalid rules file: rawResponse invalid");
        return false;
      }
      if (!httpMethodNames.includes(mock["method"])) {
        renderPopup("Invalid rules file: method invalid");
        return false;
      }
      if (
        typeof mock["statusCode"] !== "number" ||
        mock["statusCode"] < 200 ||
        mock["statusCode"] >= 600
      ) {
        renderPopup("Invalid rules file: statusCode invalid");
        return false;
      }
      if (!matchTypeNames.includes(mock["matchType"])) {
        renderPopup("Invalid rules file");
        return false;
      }
      if (typeof mock["id"] !== "number") {
        renderPopup("Invalid rules file: id invalid");
        return false;
      }
      if (typeof mock["isActive"] !== "boolean") {
        renderPopup("Invalid rules file: isActive invalid");
        return false;
      }
      // Optional, so exports made before collections existed still import
      if (
        "collection" in mock &&
        mock["collection"] !== null &&
        typeof mock["collection"] !== "string"
      ) {
        renderPopup("Invalid rules file: collection invalid");
        return false;
      }
      if (typeof mock["response"] === "Object") {
        renderPopup("Invalid rules file");
        return false;
      }
      if (typeof mock["headers"] === "Object") {
        renderPopup("Invalid rules file: Invalid headers");
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

      // fetch / XHR can only expose 200-599 to the page
      if (value < 200 || value > 599) {
        if (value < 200) {
          domInput.value = 200;
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
  tabLabels[0].onclick = hideOptions;
  tabLabels[1].onclick = hideOptions;
  tabLabels[2].onclick = handleStartStopLabel;
  tabLabels[3].onclick = handleOptionsLabel;
  const openTabBtn = document.getElementById("tab-label-open-tab");
  if (openTabBtn) {
    openTabBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("standalone.html") });
      window.close();
    });
  }
  headerPopup.addEventListener(
    "load",
    () => (headerPopup.style.display = "flex"),
  );

  // create rule section
  mockResponseTextarea.addEventListener("blur", parseJson);
  randomJson.addEventListener("click", notifyBackgroundScriptForJson);
  saveMockButton.addEventListener("click", saveOrEditMock);
  urlPatternInput.addEventListener("input", updateSaveButtonState);
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
  // also on change: picking an option with the keyboard fires no click
  ruleListSearchSelect.addEventListener("change", showHideSearchInput);
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
  ruleSearchNameInput.addEventListener("input", renderMocksList);
  ruleSearchNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ruleSearchNameInput.value !== "") {
      event.preventDefault();
      ruleSearchNameInput.value = "";
      renderMocksList();
    }
  });
  ruleListSearchSelectCollection.addEventListener("change", renderMocksList);
  collectionToggleButton.addEventListener("click", toggleSelectedCollection);
  collectionExportButton.addEventListener("click", exportSelectedCollection);
  collectionInput.addEventListener("focus", renderCollectionOptions);
  collectionInput.addEventListener("input", renderCollectionOptions);
  collectionInput.addEventListener("blur", closeCollectionList);
  collectionInput.addEventListener("keydown", handleCollectionKeydown);
  ruleSearchClearButton.addEventListener("click", () => {
    ruleSearchNameInput.value = "";
    renderMocksList();
    ruleSearchNameInput.focus();
  });

  // Options menu
  options[0].onmouseenter = () =>
    (optionIcons[0].src = "images/import-white.svg");
  options[0].onmouseleave = () =>
    (optionIcons[0].src = "images/import-black.svg");
  options[1].onmouseenter = () =>
    (optionIcons[1].src = "images/export-white.svg");
  options[1].onmouseleave = () =>
    (optionIcons[1].src = "images/export-black.svg");
  options[0].addEventListener("click", importRules);
  options[1].addEventListener("click", exportRules);

  // Auto-save draft on form changes
  const formInputs = [
    urlPatternInput,
    urlMatchTypeSelect,
    httpMethod,
    httpStatusCodeInput,
    delay,
    mockResponseTextarea,
    aliasInput,
    collectionInput,
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

  // Ctrl/Cmd + S saves the rule while the create tab is visible
  document.addEventListener("keydown", (event) => {
    const isSaveShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
    if (!isSaveShortcut) return;
    event.preventDefault();
    if (tabLabelNewRuleInput.checked && !saveMockButton.disabled) {
      saveOrEditMock();
    }
  });

  // Opened from the popup's Import: the file dialog needs a click, so point to it
  if (isStandalone && new URLSearchParams(location.search).has("import")) {
    history.replaceState(null, "", location.pathname);
    optionsContainer.classList.remove("hidden");
    renderPopup("Click Import to choose your rules file");
  }

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
