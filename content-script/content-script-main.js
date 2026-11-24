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

        if (event.data && event.data.type === "FROM_ISOLATED_TO_MAIN") {
            console.log(`MAIN: ${event.data.payload.length} mocks received from isolated world:`, event.data.payload);
            activeMocks = event.data.payload || [];
            mocksReceived = true;
            resolveMocksReady();
        }
    });

    // We run at document_start but mocks arrive asynchronously from the isolated world.
    // Requests fired before that (page load) wait for them, up to a limit
    const MOCKS_WAIT_LIMIT = 1000;
    let mocksReceived = false;
    let resolveMocksReady;
    const mocksReady = new Promise((resolve) => {
        resolveMocksReady = resolve;
    });

    const waitForMocks = () => {
        if (mocksReceived) return Promise.resolve();
        return Promise.race([
            mocksReady,
            new Promise((resolve) => setTimeout(resolve, MOCKS_WAIT_LIMIT)),
        ]);
    };

    // These statuses can't carry a body: new Response() throws if one is given
    const NULL_BODY_STATUSES = [204, 205, 304];

    // fetch/XHR can only expose 200-599 to JS (new Response() throws otherwise)
    const getMockStatus = (mock) => {
        const status = Number(mock.statusCode) || 200;
        if (status >= 200 && status <= 599) return status;
        console.warn(`MAIN: Status ${status} can't be mocked, using 200 instead`);
        return 200;
    };

    const getMockBody = (mock, status, method) => {
        if (NULL_BODY_STATUSES.includes(status) || method === 'HEAD') return null;
        return JSON.stringify(mock.response);
    };

    const originalFetch = window.fetch;

    const findMatchingMock = (url, method = 'GET') => {
        const requestMethod = String(method).toUpperCase();

        for (let mock of activeMocks) {

            if (!mock.isActive) continue;
            if (mock.method && mock.method.toUpperCase() !== requestMethod) continue;

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

    window.fetch = async function (resource, init) {
        // resource can be a string, a URL object or a Request
        const url = resource instanceof Request ? resource.url : String(resource);
        const method = String(
            init?.method || (resource instanceof Request ? resource.method : 'GET')
        ).toUpperCase();

        await waitForMocks();
        const mock = findMatchingMock(url, method);

        if (!mock) {
            return originalFetch(resource, init);
        }

        console.log('🔴 INTERCEPTING fetch request:', url);

        const headers = Object.assign({
            'Content-Type': 'application/json',
            'X-Intercepted-By': 'EZ mocker'
        }, mock?.headers);

        const status = getMockStatus(mock);
        const mockResponse = new Response(
            getMockBody(mock, status, method),
            {
                status,
                statusText: httpStatusTexts[status] || 'Unknown Status',
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

    // Mocked requests never reach the network: the whole XHR lifecycle is simulated,
    // so no server is needed (same behaviour as the fetch override)
    class EzXHR extends originalXHR {
        #method = 'GET';
        #url = '';
        #async = true;
        #mocked = null;
        #waitingForMocks = false;

        open(method, url, async = true, user, password) {
            this.#method = String(method).toUpperCase();
            this.#url = String(url);
            this.#async = async !== false;
            this.#waitingForMocks = false;
            this.#clearMocked();
            // Real open keeps setRequestHeader, timeout, etc. working
            return super.open(method, url, async, user, password);
        }

        send(body) {
            // Sync requests can't wait: they use whatever mocks are loaded
            if (mocksReceived || !this.#async) return this.#send(body);

            this.#waitingForMocks = true;
            waitForMocks().then(() => {
                if (!this.#waitingForMocks) return; // aborted or reopened meanwhile
                this.#waitingForMocks = false;
                this.#send(body);
            });
        }

        #send(body) {
            const mock = findMatchingMock(this.#url, this.#method);

            if (!mock) {
                return super.send(body);
            }

            console.log('🔵 INTERCEPTING XHR request:', this.#method, this.#url);

            const headers = {
                'content-type': 'application/json',
                'x-intercepted-by': 'EZ mocker',
            };
            if (mock.headers && typeof mock.headers === 'object') {
                // lowercase keys so getResponseHeader is case insensitive
                Object.entries(mock.headers).forEach(([key, value]) => {
                    headers[key.toLowerCase()] = String(value);
                });
            }

            const status = getMockStatus(mock);

            this.#mocked = {
                mock,
                headers,
                body: getMockBody(mock, status, this.#method) ?? '',
                mockStatus: status,
                readyState: originalXHR.OPENED,
                status: 0,
                statusText: '',
                responseURL: '',
                timers: [],
            };

            if (!this.#async) {
                this.#respond();
                return;
            }

            this.#emitProgress('loadstart', 0);

            const state = this.#mocked;
            state.timers.push(setTimeout(() => this.#respond(), mock.delay || 0));

            if (this.timeout > 0) {
                state.timers.push(setTimeout(() => this.#fail('timeout'), this.timeout));
            }
        }

        abort() {
            this.#waitingForMocks = false;
            if (!this.#isPending()) return super.abort();
            this.#fail('abort');
            this.#mocked.readyState = originalXHR.UNSENT;
        }

        get readyState() {
            return this.#mocked ? this.#mocked.readyState : super.readyState;
        }

        get status() {
            return this.#mocked ? this.#mocked.status : super.status;
        }

        get statusText() {
            return this.#mocked ? this.#mocked.statusText : super.statusText;
        }

        get responseURL() {
            return this.#mocked ? this.#mocked.responseURL : super.responseURL;
        }

        get responseText() {
            if (!this.#mocked) return super.responseText;
            return this.#isDone() ? this.#mocked.body : '';
        }

        get response() {
            if (!this.#mocked) return super.response;
            if (!this.#isDone()) return this.responseType === 'json' ? null : '';

            const { body, headers } = this.#mocked;
            switch (this.responseType) {
                case 'json':
                    try {
                        return JSON.parse(body);
                    } catch (e) {
                        return null;
                    }
                case 'blob':
                    return new Blob([body], { type: headers['content-type'] });
                case 'arraybuffer':
                    return new TextEncoder().encode(body).buffer;
                case 'document':
                    return null;
                default:
                    return body;
            }
        }

        getResponseHeader(name) {
            if (!this.#mocked) return super.getResponseHeader(name);
            if (!this.#isDone() || !name) return null;
            return this.#mocked.headers[String(name).toLowerCase()] ?? null;
        }

        getAllResponseHeaders() {
            if (!this.#mocked) return super.getAllResponseHeaders();
            if (!this.#isDone()) return '';
            return Object.entries(this.#mocked.headers)
                .map(([key, value]) => `${key}: ${value}\r\n`)
                .join('');
        }

        #respond() {
            const state = this.#mocked;
            if (!state || this.#isDone()) return;
            this.#clearTimers();

            const { mock, body } = state;
            state.status = state.mockStatus;
            state.statusText = httpStatusTexts[state.status] || 'Unknown Status';
            state.responseURL = new URL(this.#url, location.href).href;

            state.readyState = originalXHR.HEADERS_RECEIVED;
            this.#emit('readystatechange');
            state.readyState = originalXHR.LOADING;
            this.#emit('readystatechange');
            this.#emitProgress('progress', body.length);
            state.readyState = originalXHR.DONE;
            this.#emit('readystatechange');

            console.log('🔵 Returning mock:', {
                response: mock.response,
                status: state.status,
                statusText: state.statusText,
                headers: state.headers,
            });

            this.#emitProgress('load', body.length);
            this.#emitProgress('loadend', body.length);
        }

        // abort / timeout: same events a real XHR fires, with status 0
        #fail(type) {
            const state = this.#mocked;
            if (!state || this.#isDone()) return;
            this.#clearTimers();

            state.readyState = originalXHR.DONE;
            state.status = 0;
            state.statusText = '';
            state.body = '';
            state.headers = {};
            this.#emit('readystatechange');
            this.#emitProgress(type, 0);
            this.#emitProgress('loadend', 0);
        }

        #emit(type) {
            this.dispatchEvent(new Event(type));
        }

        #emitProgress(type, loaded) {
            this.dispatchEvent(
                new ProgressEvent(type, { lengthComputable: loaded > 0, loaded, total: loaded })
            );
        }

        #isDone() {
            return this.#mocked && this.#mocked.readyState === originalXHR.DONE;
        }

        #isPending() {
            return this.#mocked && this.#mocked.readyState === originalXHR.OPENED;
        }

        #clearTimers() {
            if (this.#mocked) this.#mocked.timers.forEach(clearTimeout);
        }

        #clearMocked() {
            this.#clearTimers();
            this.#mocked = null;
        }
    }

    window.XMLHttpRequest = EzXHR;

    // Ask the isolated world for the mocks in case it loaded them before we were listening
    window.postMessage({ type: 'MAIN_READY' }, '*');
})();
