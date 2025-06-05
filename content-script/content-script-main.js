(function () {
    'use strict';

    console.log("MAIN: Content script loaded in the main world");

    let activeMocks = [];

    const httpStatusTexts = {
        // 1xx Informational
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        103: 'Early Hints',

        // 2xx Success
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status',
        208: 'Already Reported',
        226: 'IM Used',

        // 3xx Redirection
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Found',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy', // Deprecated
        307: 'Temporary Redirect',
        308: 'Permanent Redirect',

        // 4xx Client Error
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Payload Too Large',
        414: 'URI Too Long',
        415: 'Unsupported Media Type',
        416: 'Range Not Satisfiable',
        417: 'Expectation Failed',
        418: "I'm a teapot", // April Fools' joke
        421: 'Misdirected Request',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        425: 'Too Early',
        426: 'Upgrade Required',
        428: 'Precondition Required',
        429: 'Too Many Requests',
        431: 'Request Header Fields Too Large',
        451: 'Unavailable For Legal Reasons',

        // 5xx Server Error
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
        505: 'HTTP Version Not Supported',
        506: 'Variant Also Negotiates',
        507: 'Insufficient Storage',
        508: 'Loop Detected',
        510: 'Not Extended',
        511: 'Network Authentication Required'
    };

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

        const headers = Object.assign({
            'Content-Type': 'application/json',
            'X-Intercepted-By': 'EZ mocker'
        }, mock?.headers);

        const mockResponse = new Response(
            JSON.stringify(mock.response),
            {
                status: mock.statusCode || 200,
                statusText: httpStatusTexts[mock.statusCode] || 'Unknown Status',
                headers: headers
            }
        );

        console.log('🔴 Returning mock:', mock.response, mockResponse.status, mockResponse.statusText);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(mockResponse);
            }, mock.delay);
        });
    };

    const originalXHR = window.XMLHttpRequest;

    function EzXHR() {
        const xhr = new originalXHR();

        let url = '';
        let method = '';
        let mock = null;

        const originalOpen = xhr.open;
        xhr.open = function (reqMethod, reqUrl, async = true, user, password) {
            method = reqMethod;
            url = reqUrl;
            return originalOpen.call(xhr, reqMethod, reqUrl, async, user, password);
        };

        const originalSend = xhr.send;
        xhr.send = function (...args) {
            console.log('🔵 INTERCEPTING XHR request:', method, url);

            mock = findMatchingMock(url);

            if (!mock) {
                console.log('🔵 No matching mock found for:', url);
                return originalSend.apply(xhr, args);
            }

            // Intercepting onReadyStateChange
            const originalOnReadyStateChange = xhr.onreadystatechange;
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    // response
                    const mockResponse = JSON.stringify(mock.response);
                    const status = mock.statusCode || 200;
                    const statusText = httpStatusTexts[status] || 'Mocked';

                    // headers
                    const mockHeaders = Object.assign({
                        'content-type': 'application/json',
                        'x-intercepted-by': 'EZ mocker'
                    }, mock?.headers);

                    overrideReadonlyProperty(xhr, 'responseText', mockResponse);
                    overrideReadonlyProperty(xhr, 'response', mockResponse);
                    overrideReadonlyProperty(xhr, 'status', status);
                    overrideReadonlyProperty(xhr, 'statusText', statusText);

                    xhr.getResponseHeader = function (name) {
                        if (!name) return null;
                        return mockHeaders[name.toLowerCase()] || null;
                    };

                    xhr.getAllResponseHeaders = function () {
                        return Object.entries(mockHeaders)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('\n');
                    };

                    console.log('🔵 Returning mock:', mock.response, mock.statusCode, httpStatusTexts[mock.statusCode], xhr.getAllResponseHeaders());
                }

                if (originalOnReadyStateChange) {
                    return originalOnReadyStateChange.apply(this, arguments);
                }
            };

            return originalSend.apply(xhr, args);
        };

        return xhr;
    }

    // Override read-only prop in xhr
    function overrideReadonlyProperty(obj, prop, value) {
        try {
            Object.defineProperty(obj, prop, {
                get: typeof value === 'function' ? value : () => value,
                configurable: true
            });
        } catch (e) {
            console.warn(`⚠️ Failed to override ${prop}:`, e);
        }
    }

    window.XMLHttpRequest = EzXHR;
})();
