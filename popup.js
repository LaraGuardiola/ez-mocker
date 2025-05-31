document.addEventListener('DOMContentLoaded', () => {
    const urlPatternInput = document.getElementById('url-pattern');
    const urlMatchTypeSelect = document.getElementById('url-match-type');
    const httpMethod = document.querySelector('#url-method');
    const statusCode = document.querySelector('#http-status-code');
    const mockResponseTextarea = document.getElementById('mock-response');
    const jsonError = document.getElementById('json-error');
    const randomJson = document.getElementById('random-json');
    const saveMockButton = document.getElementById('save-mock');
    const mocksListUl = document.getElementById('mocks-list');
    const httpStatusCodeInput = document.getElementById('http-status-code');
    const editMockIdInput = document.getElementById('edit-mock-id');
    const tabLabelNewRule = document.querySelector('#tab-label-1');
    const aliasInput = document.querySelector('#alias');
 
    // Selectors for search functionality
    const ruleListSearchSelect = document.querySelector('.section-search #search-select');
    const ruleListSearchSelectMethod = document.querySelector('.section-search #search-select-method');
    const ruleListSearchInput = document.querySelector('.section-search .search-input');
    const ruleListSearchLabel = document.querySelector('.section-search .search-btn');

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
        httpMethod.value = 'get';
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

    const setFilteredMocks = () => {
        let filteredMocks = [...mocks];
        const filterBy = ruleListSearchSelect.value;
        const searchTerm = ruleListSearchInput.value.trim();
        const searchMethod = ruleListSearchSelectMethod.value.toLowerCase().trim();

        if( filterBy === 'all') {
            filteredMocks = mocks;
        }else if ( filterBy === 'method') {
            filteredMocks = mocks.filter(mock => mock.method.toLowerCase() === searchMethod);
        }else if ( filterBy === 'alias') {
            filteredMocks = mocks.filter(mock => {
                const alias = mock.alias;
                const urlPattern = mock.urlPattern;
                
                return alias.includes(searchTerm) && searchTerm.length > 0 || urlPattern.includes(searchTerm) && searchTerm.length > 0;
            });
        }else if(  filterBy === 'httpCode') {
            filteredMocks = mocks.filter(mock => mock.statusCode.toString() === searchTerm);
        }
        console.log(mocks)
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
          <strong>${ mock.method } ${ !mock.alias ? mock.urlPattern: mock.alias }</strong> <small>(${mock.matchType}) - HTTP ${mock.statusCode}</small>
          <pre style="font-size:0.8em; max-height: 100px; overflow:auto; background:#efefef; padding:3px;">${mock.rawResponse.substring(0, 300)}${mock.rawResponse.length > 500 ?"...":""}</pre>
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
            httpMethod.value = mockToEdit.method.toLowerCase();
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

    const showHideSearchInput = () => {
        if(ruleListSearchSelect.value === 'all') {
            ruleListSearchInput.style.display = 'none';
            ruleListSearchSelectMethod.style.display = 'none';
        } else if(ruleListSearchSelect.value === 'httpCode') {
            ruleListSearchInput.type = 'number';
            ruleListSearchInput.value = '200';
            ruleListSearchInput.maxLength = 3;
            ruleListSearchInput.min = 100;
            ruleListSearchInput.max = 599;
            ruleListSearchInput.addEventListener('input', (e) => {
                if (e.target.value.length > 3) {
                    e.target.value = e.target.value.slice(0, 3);
                }
            })
            ruleListSearchInput.style.display = 'inline-block';
            ruleListSearchSelectMethod.style.display = 'none';
        }else if(ruleListSearchSelect.value === 'method') {
            ruleListSearchInput.style.display = 'none';
            ruleListSearchSelectMethod.style.display = 'inline-block';
        }else if(ruleListSearchSelect.value === 'alias'){
            ruleListSearchInput.type = 'text';
            ruleListSearchInput.value = '';
            ruleListSearchInput.style.display = 'inline-block';
            ruleListSearchSelectMethod.style.display = 'none';
        }
        
    }

    loadMocks();

    tabLabelNewRule.addEventListener('click', clearForm);
    mockResponseTextarea.addEventListener('blur', parseJson);
    randomJson.addEventListener('click', notifyBackgroundScriptForJson);
    saveMockButton.addEventListener('click', saveOrEditMock);
    ruleListSearchSelect.addEventListener('click', showHideSearchInput);
    ruleListSearchSelect.addEventListener('click', renderMocksList);
    ruleListSearchSelect.addEventListener('change', renderMocksList);
    ruleListSearchSelectMethod.addEventListener('change', renderMocksList);
    ruleListSearchInput.addEventListener('input', renderMocksList);
    ruleListSearchLabel.addEventListener('click', renderMocksList);
    statusCode.addEventListener('input', (e) => {
        if (e.target.value.length > 3) {
            e.target.value = e.target.value.slice(0, 3);
        }
    })
});
