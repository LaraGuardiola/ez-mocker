document.addEventListener('DOMContentLoaded', () => {
    const urlPatternInput = document.getElementById('url-pattern');
    const urlMatchTypeSelect = document.getElementById('url-match-type');
    const httpMethod = document.querySelector('#url-method');
    const statusCode = document.querySelector('#http-status-code');
    const delay = document.querySelector('#delay');
    const mockResponseTextarea = document.getElementById('mock-response');
    const jsonError = document.getElementById('json-error');
    const randomJson = document.getElementById('random-json');
    const saveMockButton = document.getElementById('save-mock');
    const mocksListUl = document.getElementById('mocks-list');
    const httpStatusCodeInput = document.getElementById('http-status-code');
    const editMockIdInput = document.getElementById('edit-mock-id');
    const tabLabelNewRule = document.querySelector('#tab-label-1');
    const tabLabelStartStop = document.querySelector('#tab-label-3');
    const optionsContainer = document.querySelector('.options-container');
    const tabLabels = [...document.querySelectorAll('.tab-label')];
    const tabInputs = [...document.querySelectorAll('.tab-input')];
    const options = [...document.querySelectorAll('.option')];
    const optionIcons = [...document.querySelectorAll('.option-icon')];
    const aliasInput = document.querySelector('#alias');
    const startStopImg = document.querySelector('#start-stop');
    const headerPopup = document.querySelector('.header-popup');
    const responseBody = document.querySelector('.response-body');
    const responseHeaders = document.querySelector('.response-headers');
    const inputResponseBody = document.querySelector('#tab3');
    const inputResponseHeaders = document.querySelector('#tab4');
    const newHeaderSpan = document.querySelector('#new-header-span');
    const inputHeadersTopKey = document.querySelector('#input-headers-top-key');
    const headersImg = document.querySelector('#header-trash');
    const wholeMockResponse = [inputResponseBody, inputResponseHeaders];
    const popupTimer = 5000;
    let popupTimeoutId;

    // Selectors for search functionality
    const ruleListSearchSelect = document.querySelector('.section-search #search-select');
    const ruleListSearchSelectMethod = document.querySelector('.section-search #search-select-method');
    const ruleListSearchInput = document.querySelector('.section-search .search-input');

    const httpColorList = {
        get: "#4CAF50",
        post: "#2196F3",
        put: "#FF9800",
        patch: "#9C27B0",
        delete: '#F44336',
        options: '#9E9E9E',
        head: '#607D8B',
        any: '#343a40'
    }

    const httpMethodNames = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "CONNECT", "TRACE"];
    const matchTypeNames = ["contains", "exact", "startsWith", "endsWith", "regex"];

    const collectionRequiredFields = [
        'alias',
        'id',
        'isActive',
        'matchType',
        'method',
        'delay',
        'rawResponse',
        'response',
        'statusCode',
        'urlPattern'
    ];

    let mocks = [];
    let previousMockStates = [];
    let json = null;
    let areRulesActive = null;

    const deleteAllLiHeaders = () => {
        [...document.querySelectorAll('.header-list-item')].forEach(child => {
            child.remove();
        })
    }

    const toggleAllHeaderListItems = () => {
        let headers = [...document.querySelectorAll('.header-list-item')]
        if(inputHeadersTopKey.checked) {
            headers.forEach(child => {
                child.firstChild.checked = true;
            })
        } else {
            headers.forEach(child => {
                child.firstChild.checked = false;
            })
        }
    }

    const clearForm = () => {
        if (urlPatternInput.value !== "" || mockResponseTextarea.value !== "") {
            urlPatternInput.value = '';
            mockResponseTextarea.value = '';
            httpMethod.value = 'get';
            delay.value = '0'
            aliasInput.value = '';
            httpStatusCodeInput.value = '200';
            urlMatchTypeSelect.value = 'contains';
            editMockIdInput.value = '';
            jsonError.style.display = 'none';
            deleteAllLiHeaders();
            urlPatternInput.focus();
        } else {
            return;
        }
    }

    const showHideStartStop = () => {
        areRulesActive = mocks.some(mock => mock.isActive);
        if (mocks.length === 0) {
            tabLabelStartStop.style.display = "none";
        }
        else {
            tabLabelStartStop.style.display = "flex";
            startStopImg.src = areRulesActive
                ? "images/stop.svg"
                : "images/active.svg";
        }
    }

    const showHideOptions = (position) => {
        if (optionsContainer.classList.contains('hidden')) {
            toggleOptionsVisibility();
        }
        optionsContainer.style.left = position;
        toggleOptionsVisibility();
    }

    const showHideResponseContainer = () => {
        if (inputResponseBody.checked) {
            responseBody.style.display = "flex";
            responseHeaders.style.display = "none";
        } else {
            responseBody.style.display = "none";
            responseHeaders.style.display = "flex";
        }
    }

    const handleStartStopLabel = async () => {
        if (areRulesActive) {
            previousMockStates = mocks.map(mock => mock.isActive);
            mocks.forEach(mock => mock.isActive = false);
            renderPopup("HTTP interception stopped")
        } else {
            renderPopup("HTTP interception activated")
            if (previousMockStates.length > 0) {
                mocks.forEach((mock, index) => {
                    mock.isActive = previousMockStates[index];
                });
            } else {
                mocks.forEach(mock => mock.isActive = true);
            }
        }
        await saveMocksToStorage();
        loadMocks();
        notifyBackgroundScriptForRules();
    }

    const handleOptionsLabel = () => {
        if (tabInputs[0].checked) {
            optionsContainer.style.left = "720px";
        } else {
            optionsContainer.style.left = "1520px";
        }
        toggleOptionsVisibility();
    }

    const saveMocksToStorage = () => {
        return new Promise(resolve => {
            chrome.storage.local.set({ mocks: mocks }, () => {
                console.log('Rule saved.');
                resolve();
            });
        });
    }

    const loadMocks = () => {
        chrome.storage.local.get('mocks', (data) => {
            if (data.mocks) {
                mocks = data.mocks;
                showHideStartStop();
                renderMocksList();
            }
        });
    }

    const mergeMocks = (existingMocks, importedMocks) => {
        const merged = [...existingMocks];
        let newCount = 0;
        let updatedCount = 0;

        for (const imported of importedMocks) {
            const index = merged.findIndex(m => m.id === imported.id);
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
        chrome.storage.local.get('json', (data) => {
            if (data.json) {
                json = data.json;
                console.log(json);
            }
        });
    }

    const setFilteredMocks = () => {
        let filteredMocks = [...mocks];
        const filterBy = ruleListSearchSelect.value;
        const searchTerm = ruleListSearchInput.value.trim();
        const searchMethod = ruleListSearchSelectMethod.value.toLowerCase().trim();

        if (filterBy === 'all') {
            filteredMocks = mocks;
        } else if (filterBy === 'method') {
            filteredMocks = mocks.filter(mock => mock.method.toLowerCase() === searchMethod);
        } else if (filterBy === 'alias') {
            filteredMocks = mocks.filter(mock => {
                const alias = mock.alias;
                const urlPattern = mock.urlPattern;

                return alias.includes(searchTerm) && searchTerm.length > 0 || urlPattern.includes(searchTerm) && searchTerm.length > 0;
            });
        } else if (filterBy === 'httpCode') {
            filteredMocks = mocks.filter(mock => mock.statusCode.toString() === searchTerm);
        }

        return filteredMocks;
    }

    const renderMocksList = () => {
        mocksListUl.innerHTML = '';

        const filteredMocks = setFilteredMocks();

        filteredMocks.forEach(mock => {
            const listItem = document.createElement('li');
            let color = httpColorList[mock.method.toLowerCase()] || httpColorList.any
            listItem.dataset.id = mock.id;
            listItem.style.borderLeft = `3px solid ${color}`;

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('mock-info');
            infoDiv.innerHTML = `
          <strong>${mock.method} ${!mock.alias ? mock.urlPattern.length > 70 ? mock.urlPattern.substring(0, 70) + "..." : mock.urlPattern : mock.alias}</strong> <small>(${mock.matchType}) - HTTP ${mock.statusCode} - Delay ${mock.delay}ms</small>
          <pre style="font-size:0.8em; max-height: 100px; overflow:auto; background:#efefef; padding:3px;">${mock.rawResponse.substring(0, 300)}${mock.rawResponse.length > 500 ? "..." : ""}</pre>
        `;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('actions');

            const toggleButton = document.createElement('button');
            toggleButton.textContent = mock.isActive ? 'On' : 'Off';
            toggleButton.style.backgroundColor = mock.isActive ? '#28a745' : '#ffc107';
            toggleButton.style.color = mock.isActive ? 'white' : 'black';
            toggleButton.classList.add('toggle-btn');
            toggleButton.addEventListener('click', () => toggleMockActiveState(mock.id));

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => populateFormForEdit(mock.id));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', () => deleteMock(mock.id));

            actionsDiv.appendChild(toggleButton);
            actionsDiv.appendChild(editButton);
            actionsDiv.appendChild(deleteButton);

            listItem.appendChild(infoDiv);
            listItem.appendChild(actionsDiv);
            mocksListUl.appendChild(listItem);
        });
    }

    const addHeaderListItem = (key = '', value = '') => {
        const li = document.createElement('li');
        li.className = 'header-list-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'header-list-item-checkbox';
        checkbox.checked = true;
        checkbox.title = "Disable header"

        const inputKey = document.createElement('input');
        inputKey.type = 'text';
        inputKey.className = 'header-list-item-key';
        inputKey.placeholder = 'Key';

        const inputValue = document.createElement('input');
        inputValue.type = 'text';
        inputValue.className = 'header-list-item-value';
        inputValue.placeholder = 'Value';

        const span = document.createElement('span');
        span.className = 'rotated';
        span.textContent = '+';
        span.title = "Remove header"

        span.addEventListener('click', () => {
            li.remove();
        });

        li.appendChild(checkbox);
        li.appendChild(inputKey);
        li.appendChild(inputValue);
        li.appendChild(span);

        const ul = document.querySelector('.headers-list');
        ul.appendChild(li);

        if(key || value) {
            inputKey.value = key
            inputValue.value = value
        }
    }


    const parseJson = () => {
        try {
            const currentJson = mockResponseTextarea.value;
            if (currentJson) {
                const parsedJson = JSON.parse(currentJson);
                mockResponseTextarea.value = JSON.stringify(parsedJson, null, 2);
                jsonError.style.display = 'none';
            }
        } catch (error) {
            jsonError.textContent = 'Invalid JSON syntax';
            jsonError.style.display = 'block';
            jsonError.style.textAlign = 'right';
        }
    }

    const populateFormForEdit = (id) => {
        const mockToEdit = mocks.find(m => m.id === id);
        if (mockToEdit) {
            deleteAllLiHeaders();
            document.querySelector('#tab1').checked = true;
            urlPatternInput.value = mockToEdit.urlPattern;
            urlMatchTypeSelect.value = mockToEdit.matchType;
            httpMethod.value = mockToEdit.method.toLowerCase();
            delay.value = mockToEdit.delay;
            mockResponseTextarea.value = mockToEdit.rawResponse;
            httpStatusCodeInput.value = mockToEdit.statusCode;
            aliasInput.value = mockToEdit.alias || null;
            editMockIdInput.value = mockToEdit.id; //Save the ID in order to know we are editing an existing mock
            Object.entries(mockToEdit.headers).forEach(([key, value]) => {
                addHeaderListItem(key, value)
            });
            urlPatternInput.focus();
        }
    }

    const toggleMockActiveState = async (id) => {
        const mockIndex = mocks.findIndex(m => m.id === id);
        if (mockIndex > -1) {
            mocks[mockIndex].isActive = !mocks[mockIndex].isActive;
            await saveMocksToStorage();
            renderMocksList();
            notifyBackgroundScriptForRules();
        }
        showHideStartStop();
    }

    const deleteMock = async (id) => {
        deletedMock = mocks.find(mock => mock.id === id)
        mocks = mocks.filter(mock => mock.id !== id);
        await saveMocksToStorage();
        renderMocksList();
        notifyBackgroundScriptForRules();
        showHideStartStop();
        renderPopup(`Rule ${deletedMock.method} ${deletedMock.alias !== "" ? deletedMock.alias : deletedMock.urlPattern.length > 20 ? deletedMock.urlPattern.substring(0, 20) + "..." : deletedMock.urlPattern} has been removed`)
    }

    const notifyBackgroundScriptForRules = () => {
        chrome.runtime.sendMessage({ type: "UPDATE_RULES", mocks: mocks }, response => {
            if (chrome.runtime.lastError) {
                console.error("Error sending new rule / mock to the background:", chrome.runtime.lastError.message);
            } else {
                console.log("Background notified:", response);
            }
        });
    }

    const notifyBackgroundScriptForJson = () => {
        chrome.runtime.sendMessage({ type: "GET_JSON", json: [] }, response => {
            if (chrome.runtime.lastError) {
                console.error("Error asking for json to the background:", chrome.runtime.lastError.message);
                renderPopup("Error generating json");
            } else {
                console.log("Background notified:", response);;
                loadJson();
                populateTextAreaWithJson();
                renderPopup("Json generated");
            }
        });
    }

    const populateTextAreaWithJson = () => {
        setTimeout(() => {
            mockResponseTextarea.value = json ? json : '';
        }, 50) // Wait a bit to ensure the background script has time to respond
    }

    const saveOrEditMock = async () => {
        let isNewSave = null
        const urlPattern = urlPatternInput.value.trim();
        const matchType = urlMatchTypeSelect.value;
        const method = httpMethod.value.toUpperCase();
        const delayValue = parseInt(delay.value) || 0;
        const responseStr = mockResponseTextarea.value.trim();
        const statusCode = parseInt(httpStatusCodeInput.value) || 200;
        const alias = aliasInput.value.trim();
        const editingId = editMockIdInput.value ? parseInt(editMockIdInput.value) : null;
        const headers =  getHeaders();

        if (!urlPattern || !responseStr) {
            renderPopup('URL pattern and response are required');
            return;
        }

        let mockResponseJSON;
        try {
            mockResponseJSON = JSON.parse(responseStr);
            jsonError.style.display = 'none';
        } catch (error) {
            jsonError.textContent = 'Invalid JSON syntax';
            jsonError.style.display = 'block';
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
                headers
            };
            mocks.push(newMock);
        }

        const mockIndex = mocks.findIndex(m => m.id === editingId);
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
                headers
            };
        }

        await saveMocksToStorage();
        renderMocksList();
        notifyBackgroundScriptForRules();
        clearForm();
        showHideStartStop();
        isNewSave
            ? renderPopup("Rule saved")
            : renderPopup(`Rule ${mocks[mockIndex].method} ${mocks[mockIndex].alias !== "" ? mocks[mockIndex].alias : mocks[mockIndex].urlPattern.length > 20 ? mocks[mockIndex].urlPattern.substring(0, 20) + "..." : mocks[mockIndex].urlPattern} has been edited`)
    }

    const showHideSearchInput = () => {
        if (ruleListSearchSelect.value === 'all') {
            ruleListSearchInput.style.display = 'none';
            ruleListSearchSelectMethod.style.display = 'none';
        } else if (ruleListSearchSelect.value === 'httpCode') {
            ruleListSearchInput.type = 'number';
            ruleListSearchInput.value = '200';
            ruleListSearchInput.style.display = 'inline-block';
            ruleListSearchSelectMethod.style.display = 'none';
        } else if (ruleListSearchSelect.value === 'method') {
            ruleListSearchInput.style.display = 'none';
            ruleListSearchSelectMethod.style.display = 'inline-block';
        } else if (ruleListSearchSelect.value === 'alias') {
            ruleListSearchInput.type = 'text';
            ruleListSearchInput.value = '';
            ruleListSearchInput.style.display = 'inline-block';
            ruleListSearchSelectMethod.style.display = 'none';
        }
    }

    const toggleOptionsVisibility = () => {
        optionsContainer.classList.toggle('hidden');
    }

    const exportCollection = () => {
        const jsonString = JSON.stringify(mocks, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = "my-collection" + '.json';
        link.click();

        URL.revokeObjectURL(url);
        toggleOptionsVisibility();
        renderPopup('Exported JSON collection')
    }

    const handleJson = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/json') {
            const reader = new FileReader();

            reader.onload = async function (e) {
                try {
                    validatedMocks = validateJSON(JSON.parse(e.target.result));
                    if (!validatedMocks) {
                        return;
                    }
                    const importedMocks = JSON.parse(e.target.result)
                    const { merged, newCount, updatedCount } = mergeMocks(mocks, importedMocks)
                    mocks = merged;

                    await saveMocksToStorage();
                    loadMocks();
                    notifyBackgroundScriptForRules();
                    clearForm();
                    renderPopup(`Imported JSON collection. ${newCount} new rules. ${updatedCount} modified.`)
                } catch (error) {
                    console.error('Error parsing imported collection:', error);
                    renderPopup("Invalid collection format.");
                }
            };

            reader.readAsText(file);
        }
    }

    const importCollection = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', handleJson);
        input.click();
        toggleOptionsVisibility();
    }

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

            if (mock['urlPattern'] === '' ||  typeof mock['urlPattern'] !== 'string') {
                renderPopup("Invalid collection format: urlPattern invalid");
                return false;
            }
            if (mock['rawResponse'] === '' || JSON.parse(mock['rawResponse']) === undefined) {
                renderPopup("Invalid collection format; rawResponse invalid");
                return false;
            }
            if (!httpMethodNames.includes(mock['method'])) {
                renderPopup("Invalid collection format: method invalid");
                return false;
            }
            if (
                typeof mock['statusCode'] !== 'number' ||
                mock['statusCode'] <= 99 ||
                mock['statusCode'] >= 600
            ) {
                renderPopup("Invalid collection format: statusCode invalid");
                return false;
            }
            if (!matchTypeNames.includes(mock['matchType'])) {
                renderPopup("Invalid collection format");
                return false;
            }
            if (typeof mock['id'] !== 'number') {
                renderPopup("Invalid collection format: id invalid");
                return false;
            }
            if (typeof mock['isActive'] !== 'boolean') {
                renderPopup("Invalid collection format: isActive invalid");
                return false;
            }
            if (typeof mock['response'] === 'Object') {
                renderPopup("Invalid collection format");
                return false;
            }
            if (typeof mock['headers'] === 'Object') {
                renderPopup("Invalid collection format: Invalid headers");
                return false;
            }
        }

        return true;
    }

    const renderPopup = (text) => {
        headerPopup.style.display = 'flex';

        const span = document.createElement('span');
        const img = document.createElement('img');

        span.textContent = text;
        img.onclick = function () {
            span.remove();
            img.remove();
            headerPopup.style.display = 'none';
            clearTimeout(popupTimeoutId);
        }
        img.src = 'images/close.svg'

        if (headerPopup.querySelector('span')) {
            headerPopup.querySelector('span').textContent = span.textContent;
        } else {
            headerPopup.appendChild(span);
            headerPopup.appendChild(img);
        }

        clearTimeout(popupTimeoutId);

        popupTimeoutId = setTimeout(() => {
            span.remove();
            img.remove();
            headerPopup.style.display = 'none';
        }, popupTimer)
    }

    function validateStatusCode(input) {
        try {
            let selectedStatusCodeSection = input === "New Rule" ? true : false
            let domInput = selectedStatusCodeSection ? httpStatusCodeInput : ruleListSearchInput;
            let value = parseInt(domInput.value);

            if (value < 100 || value > 599) {
                if (value < 100) {
                    domInput.value = 100
                } else {
                    domInput.value = 599
                }
            }

        } catch (error) {
            console.log(error)
        }
    }

    const limitToXDigits = (section, limit) => {
        let selectedStatusCodeSection = section === "New Rule" ? true : false
        let domInput = selectedStatusCodeSection ? httpStatusCodeInput : ruleListSearchInput;

        if (domInput.value.length > limit) {
            domInput.value = domInput.value.slice(0, limit);
        }
    }

    const getHeaders = () => {
        const lis = document.querySelectorAll('.header-list-item');
        const headers = {};

        lis.forEach(item => {
            const checkbox = item.querySelector('.header-list-item-checkbox')
            const keyInput = item.querySelector('.header-list-item-key');
            const valueInput = item.querySelector('.header-list-item-value');
            const key = keyInput.value.trim();
            const value = valueInput.value.trim();

            if (key !== '' && checkbox.checked) {
                headers[key] = value;
            }
        });

        return headers;
    }

    loadMocks();

    // header
    tabLabelNewRule.addEventListener('click', clearForm);
    tabLabels[0].onclick = () => showHideOptions("720px")
    tabLabels[1].onclick = () => showHideOptions("1520px")
    tabLabels[2].onclick = handleStartStopLabel;
    tabLabels[3].onclick = handleOptionsLabel;
    headerPopup.addEventListener('load', () => headerPopup.style.display = 'flex')

    // create rule section
    mockResponseTextarea.addEventListener('blur', parseJson);
    randomJson.addEventListener('click', notifyBackgroundScriptForJson);
    saveMockButton.addEventListener('click', saveOrEditMock);
    statusCode.addEventListener('blur', () => validateStatusCode('New Rule'))
    statusCode.addEventListener('input', () => limitToXDigits('New Rule', 3))
    wholeMockResponse.forEach((input) => {
        input.addEventListener('click', showHideResponseContainer)
    });
    newHeaderSpan.addEventListener('click', () => addHeaderListItem());
    headersImg.addEventListener('click', () => deleteAllLiHeaders());
    inputHeadersTopKey.addEventListener('change', () => toggleAllHeaderListItems());

    // Rule list section
    ruleListSearchSelect.addEventListener('click', showHideSearchInput);
    ruleListSearchSelect.addEventListener('click', renderMocksList);
    ruleListSearchSelect.addEventListener('change', renderMocksList);
    ruleListSearchSelect.addEventListener('change', () => {
        if (ruleListSearchInput.type === "number") limitToXDigits('Rule List', 3)
        else { limitToXDigits('Rule List', 40) }
    });
    ruleListSearchSelectMethod.addEventListener('change', renderMocksList);
    ruleListSearchInput.addEventListener('blur', validateStatusCode('Rule List'));
    ruleListSearchInput.addEventListener('input', () => {
        if (ruleListSearchInput.type === "number") limitToXDigits('Rule List', 3)
        else { limitToXDigits('Rule List', 40) }
    });
    ruleListSearchInput.addEventListener('input', renderMocksList);

    // Options menu
    options[0].onmouseenter = () => optionIcons[0].src = "images/import-white.svg";
    options[0].onmouseleave = () => optionIcons[0].src = "images/import-black.svg";
    options[1].onmouseenter = () => optionIcons[1].src = "images/export-white.svg";
    options[1].onmouseleave = () => optionIcons[1].src = "images/export-black.svg";
    options[0].addEventListener('click', importCollection);
    options[1].addEventListener('click', exportCollection);
});
