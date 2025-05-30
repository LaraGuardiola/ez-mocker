(function () {
    'use strict';
    
    console.log('Content script loaded');
    
    const originalFetch = window.fetch;

    window.fetch = function (resource, init) {
        const url = typeof resource === 'string' ? resource : resource.url;

        console.log('🔴 INTERCEPTING fetch request:', url);

        // lettting the original fetch request proceed
        originalFetch(resource, init).catch(() => { });

        const headers = new Headers({
            'Content-Type': 'application/json',
            'X-Intercepted-By': 'EZ mocker'
        })

        const mockResponse = new Response(
            JSON.stringify({
                intercepted: true,
                url: url,
                message: "Response intercepted by EZ mocker",
            }),
            {
                status: 500,
                statusText: 'shieet',
                headers: headers
            }
        );

        console.log('🔴 Returning mock:', mockResponse);
        return Promise.resolve(mockResponse);
    };
})();