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

        // console.log("MAIN: Received message:", event.data);

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

        const mock = findMatchingMock(url);

        if (!mock) {
            // console.log('🔴 No matching mock found for:', url);
            return originalFetch(resource, init);
        }

        console.log('🔴 INTERCEPTING fetch request:', url);

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

        console.log('🔴 Returning mock:', {
            response: mock.response,
            status: mockResponse.status,
            statusText: mockResponse.statusText,
            headers: mockResponse.headers
        });

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
        let isIntercepted = false;

        const originalOpen = xhr.open;
        xhr.open = function (reqMethod, reqUrl, async = true, user, password) {
            method = reqMethod;
            url = reqUrl;
            return originalOpen.call(xhr, reqMethod, reqUrl, async, user, password);
        };

        const originalSend = xhr.send;
        xhr.send = function (...args) {
            
            mock = findMatchingMock(url);

            if (!mock) {
                // console.log('🔵 No matching mock found for:', url);
                return originalSend.apply(xhr, args);
            }

            console.log('🔵 INTERCEPTING XHR request:', method, url);
            isIntercepted = true;

            // Capture original handler before sending
            const originalOnReadyStateChange = xhr.onreadystatechange;

            // Prepare mock before sending
            const mockResponse = JSON.stringify(mock.response);
            const status = mock.statusCode || 200;
            const statusText = httpStatusTexts[status] || 'Mocked';

            // Headers base
            const baseHeaders = {
                'content-type': 'application/json',
                'x-intercepted-by': 'EZ mocker'
            };

            let mockHeaders = { ...baseHeaders };

            if (mock.headers && typeof mock.headers === 'object') {
                // all headers to lowerCase makes life easier when pulling up this kind of stuff
                Object.entries(mock.headers).forEach(([key, value]) => {
                    mockHeaders[key.toLowerCase()] = value;
                });
            }

            // overwrite all header methods
            xhr.getResponseHeader = function (name) {
                if (!name) return null;
                const headerName = name.toLowerCase();
                return mockHeaders[headerName] || null;
            };

            xhr.getAllResponseHeaders = function () {
                return Object.entries(mockHeaders)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\r\n');
            };

            // Overwrite RIGHT BEFORE the SEND event
            xhr.onreadystatechange = function (event) {
                if (!isIntercepted) {
                    if (originalOnReadyStateChange) {
                        return originalOnReadyStateChange.apply(this, arguments);
                    }
                    return;
                }

                if (xhr.readyState === 4) {
                    // Prevent original request replacing our mock response
                    event && event.stopImmediatePropagation && event.stopImmediatePropagation();

                    // Overwrite response properties
                    overrideReadonlyProperty(xhr, 'responseText', mockResponse);
                    overrideReadonlyProperty(xhr, 'response', mockResponse);
                    overrideReadonlyProperty(xhr, 'status', status);
                    overrideReadonlyProperty(xhr, 'statusText', statusText);

                    console.log('🔵 Returning mock:', {
                        response: mock.response,
                        status: mock.statusCode,
                        statusText: httpStatusTexts[mock.statusCode],
                        headers: mockHeaders
                    });

                    // Call original handler if exists
                    if (originalOnReadyStateChange) {
                        try {
                            originalOnReadyStateChange.apply(this, arguments);
                        } catch (e) {
                            console.warn('⚠️ Error in original onreadystatechange:', e);
                        }
                    }
                } else {
                    // for states before 4, call if it exists original handler
                    if (originalOnReadyStateChange) {
                        originalOnReadyStateChange.apply(this, arguments);
                    }
                }
            };

            // Send original request but intercept it with the mock
            return originalSend.apply(xhr, args);
        };

        return xhr;
    }

    // Overwrite readonly properties
    function overrideReadonlyProperty(obj, prop, value) {
        try {
            Object.defineProperty(obj, prop, {
                value: value,
                writable: false,
                configurable: true
            });
        } catch (e) {
            try {
                Object.defineProperty(obj, prop, {
                    get: typeof value === 'function' ? value : () => value,
                    configurable: true
                });
            } catch (e2) {
                console.warn(`⚠️ Failed to override ${prop}:`, e2);
            }
        }
    }

    window.XMLHttpRequest = EzXHR;
})();
