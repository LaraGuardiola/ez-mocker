document.addEventListener('DOMContentLoaded', () => {
    const urlPatternInput = document.getElementById('url-pattern');
    const urlMatchTypeSelect = document.getElementById('url-match-type');
    const httpMethod = document.querySelector('#url-method');
    const mockResponseTextarea = document.getElementById('mock-response');
    const jsonError = document.getElementById('json-error');
    const randomJson = document.getElementById('random-json');
    const saveMockButton = document.getElementById('save-mock');
    const mocksListUl = document.getElementById('mocks-list');
    const httpStatusCodeInput = document.getElementById('http-status-code');
    const editMockIdInput = document.getElementById('edit-mock-id');
    const tabLabelNewRule = document.querySelector('#tab-label-1');
    const aliasInput = document.querySelector('#alias');
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

    let mocks = [];
    let json = null;

    const clearForm = () => {
        urlPatternInput.value = '';
        mockResponseTextarea.value = '';
        aliasInput.value = '';
        httpStatusCodeInput.value = '200';
        urlMatchTypeSelect.value = 'contains';
        editMockIdInput.value = '';
        jsonError.style.display = 'none';
        urlPatternInput.focus();
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
                renderMocksList();
            }
        });
    }

    const loadJson = () => {
        chrome.storage.local.get('json', (data) => {
            if (data.json) {
                json = data.json;
                console.log(json)
            }
        });
    }

    const renderMocksList = () => {
        mocksListUl.innerHTML = ''; 
        mocks.forEach(mock => {
            const listItem = document.createElement('li');
            let color = httpColorList[mock.method.toLowerCase()] || httpColorList.any
            listItem.dataset.id = mock.id;
            listItem.style.borderLeft = `3px solid ${color}`;

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('mock-info');
            infoDiv.innerHTML = `
          <strong>${ mock.method } ${ !mock.alias ? mock.urlPattern: mock.alias }</strong> <small>(${mock.matchType}) - HTTP ${mock.statusCode}</small>
          <pre style="font-size:0.8em; max-height: 100px; overflow:auto; background:#efefef; padding:3px;">${mock.rawResponse.substring(0, 300)}${mock.rawResponse.length > 500 ?"...":""}</pre>
        `;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('actions');

            const toggleButton = document.createElement('button');
            toggleButton.textContent = mock.isActive ? 'Off' : 'On';
            toggleButton.style.backgroundColor = mock.isActive ? '#28a745' : '#ffc107';
            toggleButton.style.color = mock.isActive ? 'white' : 'black';
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
            document.querySelector('#tab1').checked = true;
            urlPatternInput.value = mockToEdit.urlPattern;
            urlMatchTypeSelect.value = mockToEdit.matchType;
            mockResponseTextarea.value = mockToEdit.rawResponse;
            httpStatusCodeInput.value = mockToEdit.statusCode;
            aliasInput.value = mockToEdit.alias || null;
            editMockIdInput.value = mockToEdit.id; //Save the ID in order to know we are editing an existing mock
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
    }

    const deleteMock = async (id) => {
        mocks = mocks.filter(mock => mock.id !== id);
        await saveMocksToStorage();
        renderMocksList();
        notifyBackgroundScriptForRules();
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
            } else {
                console.log("Background notified:", response);;
                loadJson();
                populateTextAreaWithJson();
            }
        });
    }

    const populateTextAreaWithJson = () => {
        setTimeout(() => {
            mockResponseTextarea.value = json ? json : '';
        }, 50) // Wait a bit to ensure the background script has time to respond
    }
    
    const saveOrEditMock = async () => {
        const urlPattern = urlPatternInput.value.trim();
        const matchType = urlMatchTypeSelect.value;
        const method = httpMethod.value.toUpperCase();
        const responseStr = mockResponseTextarea.value.trim();
        const statusCode = parseInt(httpStatusCodeInput.value) || 200;
        const alias = aliasInput.value.trim();
        const editingId = editMockIdInput.value ? parseInt(editMockIdInput.value) : null;

        if (!urlPattern || !responseStr) {
            alert('URL pattern and response are required.');
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

        if(!editingId) {
            const newMock = {
                id: Date.now(),
                urlPattern,
                matchType,
                method,
                response: mockResponseJSON,
                rawResponse: responseStr,
                statusCode,
                alias: alias ?? null,
                isActive: true, 
            };
            mocks.push(newMock);
        }

        const mockIndex = mocks.findIndex(m => m.id === editingId);
        if (mockIndex > -1) {
            mocks[mockIndex] = {
                ...mocks[mockIndex],
                urlPattern,
                matchType,
                method,
                response: mockResponseJSON,
                rawResponse: responseStr, 
                statusCode,
                alias: alias ?? null
            };
        }

        await saveMocksToStorage();
        renderMocksList();
        notifyBackgroundScriptForRules();
        clearForm();
    }

    loadMocks();

    tabLabelNewRule.addEventListener('click', clearForm);
    mockResponseTextarea.addEventListener('blur', parseJson);
    randomJson.addEventListener('click', notifyBackgroundScriptForJson);
    saveMockButton.addEventListener('click', saveOrEditMock);
});
