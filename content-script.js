(function () {
    'use strict';

    console.log("MAIN: Content script loaded in the main world");

    let activeMocks = [];

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        console.log("MAIN: Received message:", event.data);
        
        if (event.data && event.data.type === "FROM_ISOLATED_TO_MAIN") {
            console.log(`MAIN: ${event.data.payload.length} mocks received from isolated world:`, event.data.payload);
            activeMocks = event.data.payload || [];
        }
    });

    const originalFetch = window.fetch;

    const findMatchingMock = (url) => {

        for (let mock of activeMocks) {

            if (!mock.isActive) continue;

            let isUrlMatch = false;
            const pattern = mock.urlPattern;
            try {
                switch (mock.matchType) {
                    case 'exact':
                        isUrlMatch = (url === pattern);
                        break;
                    case 'contains':
                        isUrlMatch = url.includes(pattern);
                        break;
                    case 'startsWith':
                        isUrlMatch = url.startsWith(pattern);
                        break;
                    case 'endsWith':
                        isUrlMatch = url.endsWith(pattern);
                        break;
                    case 'regex':
                        const regex = new RegExp(pattern);
                        isUrlMatch = regex.test(url);
                        break;
                    default:
                        isUrlMatch = false;
                }
            } catch (e) {
                console.error(`Error processing rule pattern: type=${mock.matchType}, pattern=${pattern}`, e);
                isUrlMatch = false;
            }

            if (isUrlMatch) {
                return mock;
            }
        }
        return null;
    }

    window.fetch = function (resource, init) {
        const url = typeof resource === 'string' ? resource : resource.url;

        console.log('🔴 INTERCEPTING fetch request:', url);

        const mock = findMatchingMock(url);

        if (!mock) {
            console.log('🔴 No matching mock found for:', url);
            return originalFetch(resource, init);
        }

        const headers = new Headers({
            'Content-Type': 'application/json',
            'X-Intercepted-By': 'EZ mocker'
        })

        const mockResponse = new Response(
            JSON.stringify(mock.response),
            {
                status: 200,
                statusText: 'OK',
                headers: headers
            }
        );

        console.log('🔴 Returning mock:', mock.response);
        return Promise.resolve(mockResponse);
    };
})();