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

        const headers = new Headers({
            'Content-Type': 'application/json',
            'X-Intercepted-By': 'EZ mocker'
        })

        const mockResponse = new Response(
            JSON.stringify(mock.response),
            {
                status: mock.statusCode || 200,
                statusText: httpStatusTexts[mock.statusCode] || 'Unknown Status',
                headers: headers
            }
        );

        console.log('🔴 Returning mock:', mock.response, mockResponse.status, mockResponse.statusText);
        return Promise.resolve(mockResponse);
    };
})();
