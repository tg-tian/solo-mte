/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Queue, raceTimeout, TimeoutTimer } from '../../../base/common/async.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { equalsIgnoreCase } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { convertAXTreeToMarkdown } from './cdpAccessibilityDomain.js';
/**
 * A web page loader that uses Electron to load web pages and extract their content.
 */
export class WebPageLoader extends Disposable {
    static { this.TIMEOUT = 30000; } // 30 seconds
    static { this.POST_LOAD_TIMEOUT = 5000; } // 5 seconds - increased for dynamic content
    static { this.FRAME_TIMEOUT = 500; } // 0.5 seconds
    static { this.IDLE_DEBOUNCE_TIME = 500; } // 0.5 seconds - wait after last network request
    static { this.MIN_CONTENT_LENGTH = 100; } // Minimum content length to consider extraction successful
    constructor(browserWindowFactory, _logger, _uri, _options) {
        super();
        this._logger = _logger;
        this._uri = _uri;
        this._options = _options;
        this._requests = new Set();
        this._queue = this._register(new Queue());
        this._timeout = this._register(new TimeoutTimer());
        this._idleDebounceTimer = this._register(new TimeoutTimer());
        this._onResult = (_result) => { };
        this._didFinishLoad = false;
        this._window = browserWindowFactory({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                partition: generateUuid(), // do not share any state with the default renderer session
                javascript: true,
                offscreen: true,
                sandbox: true,
                webgl: false,
            }
        });
        this._register(toDisposable(() => this._window.destroy()));
        this._debugger = this._window.webContents.debugger;
        this._debugger.attach('1.1');
        this._debugger.on('message', this.onDebugMessage.bind(this));
        this._window.webContents
            .once('did-start-loading', this.onStartLoading.bind(this))
            .once('did-finish-load', this.onFinishLoad.bind(this))
            .once('did-fail-load', this.onFailLoad.bind(this))
            .once('will-navigate', this.onRedirect.bind(this))
            .once('will-redirect', this.onRedirect.bind(this))
            .on('select-client-certificate', (event) => event.preventDefault());
        this._window.webContents.session.webRequest.onBeforeSendHeaders(this.onBeforeSendHeaders.bind(this));
    }
    trace(message) {
        this._logger.trace(`[WebPageLoader] [${this._uri}] ${message}`);
    }
    /**
     * Loads the web page and extracts its content.
     */
    async load() {
        return await new Promise((resolve) => {
            this._onResult = createSingleCallFunction((result) => {
                switch (result.status) {
                    case 'ok':
                        this.trace(`Loaded web page content, status: ${result.status}, title: '${result.title}', length: ${result.result.length}`);
                        break;
                    case 'redirect':
                        this.trace(`Loaded web page content, status: ${result.status}, toURI: ${result.toURI}`);
                        break;
                    case 'error':
                        this.trace(`Loaded web page content, status: ${result.status}, code: ${result.statusCode}, error: '${result.error}', title: '${result.title}', length: ${result.result?.length ?? 0}`);
                        break;
                }
                const content = result.status !== 'redirect' ? result.result : undefined;
                if (content !== undefined) {
                    this.trace(content.length < 200 ? `Extracted content: '${content}'` : `Extracted content preview: '${content.substring(0, 200)}...'`);
                }
                resolve(result);
                this.dispose();
            });
            this.trace(`Loading web page content`);
            void this._window.loadURL(this._uri.toString(true));
            this.setTimeout(WebPageLoader.TIMEOUT);
        });
    }
    /**
     * Sets a timeout to trigger content extraction regardless of current loading state.
     */
    setTimeout(time) {
        if (this._store.isDisposed) {
            return;
        }
        this.trace(`Setting page load timeout to ${time} ms`);
        this._timeout.cancelAndSet(() => {
            this.trace(`Page load timeout reached`);
            void this._queue.queue(() => this.extractContent());
        }, time);
    }
    /**
     * Updates HTTP headers for each web request.
     */
    onBeforeSendHeaders(details, callback) {
        const headers = { ...details.requestHeaders };
        // Request privacy for web-sites that respect these.
        headers['DNT'] = '1';
        headers['Sec-GPC'] = '1';
        callback({ requestHeaders: headers });
    }
    /**
     * Handles the 'did-start-loading' event, enabling network tracking.
     */
    onStartLoading() {
        if (this._store.isDisposed) {
            return;
        }
        this.trace(`Received 'did-start-loading' event`);
        void this._debugger.sendCommand('Network.enable').catch(() => {
            // This throws when we destroy the window on redirect.
        });
    }
    /**
     * Handles the 'did-finish-load' event, checking for idle state
     * and updating timeout to allow for post-load activities.
     */
    onFinishLoad() {
        if (this._store.isDisposed) {
            return;
        }
        this.trace(`Received 'did-finish-load' event`);
        this._didFinishLoad = true;
        this.scheduleIdleCheck();
        this.setTimeout(WebPageLoader.POST_LOAD_TIMEOUT);
    }
    /**
     * Handles the 'did-fail-load' event, reporting load failures.
     */
    onFailLoad(_event, statusCode, error) {
        if (this._store.isDisposed) {
            return;
        }
        this.trace(`Received 'did-fail-load' event, code: ${statusCode}, error: '${error}'`);
        if (statusCode === -3) {
            this.trace(`Ignoring ERR_ABORTED (-3) as it may be caused by CSP or other measures`);
            void this._queue.queue(() => this.extractContent());
        }
        else {
            void this._queue.queue(() => this.extractContent({ status: 'error', statusCode, error }));
        }
    }
    /**
     * Handles the 'will-navigate' and 'will-redirect' events, managing redirects.
     */
    onRedirect(event, url) {
        if (this._store.isDisposed) {
            return;
        }
        this.trace(`Received 'will-navigate' or 'will-redirect' event, url: ${url}`);
        if (!this._options?.followRedirects) {
            const toURI = URI.parse(url);
            if (!equalsIgnoreCase(toURI.authority, this._uri.authority)) {
                event.preventDefault();
                this._onResult({ status: 'redirect', toURI });
            }
        }
    }
    /**
     * Handles debugger messages related to network requests, tracking their lifecycle.
     * @note DO NOT add logging to this function, microsoft.com will freeze when too many logs are generated
     */
    onDebugMessage(_event, method, params) {
        if (this._store.isDisposed) {
            return;
        }
        const { requestId, type, response } = params;
        switch (method) {
            case 'Network.requestWillBeSent':
                if (requestId !== undefined) {
                    this._requests.add(requestId);
                    this._idleDebounceTimer.cancel();
                }
                break;
            case 'Network.loadingFinished':
            case 'Network.loadingFailed':
                if (requestId !== undefined) {
                    this._requests.delete(requestId);
                    if (this._requests.size === 0 && this._didFinishLoad) {
                        this.scheduleIdleCheck();
                    }
                }
                break;
            case 'Network.responseReceived':
                if (type === 'Document') {
                    const statusCode = response?.status ?? 0;
                    if (statusCode >= 400) {
                        const error = response?.statusText || `HTTP error ${statusCode}`;
                        void this._queue.queue(() => this.extractContent({ status: 'error', statusCode, error }));
                    }
                }
                break;
        }
    }
    /**
     * Schedules an idle check after a debounce period to allow for bursts of network activity.
     * If idle is detected, proceeds to extract content.
     */
    scheduleIdleCheck() {
        if (this._store.isDisposed) {
            return;
        }
        this._idleDebounceTimer.cancelAndSet(async () => {
            if (this._store.isDisposed) {
                return;
            }
            await this.nextFrame();
            if (this._requests.size === 0) {
                this._queue.queue(() => this.extractContent());
            }
            else {
                this.trace(`New network requests detected, deferring content extraction`);
            }
        }, WebPageLoader.IDLE_DEBOUNCE_TIME);
    }
    /**
     * Waits for a rendering frame to ensure the page had a chance to update.
     */
    async nextFrame() {
        if (this._store.isDisposed) {
            return;
        }
        // Wait for a rendering frame to ensure the page had a chance to update.
        await raceTimeout(new Promise((resolve) => {
            try {
                this.trace(`Waiting for a frame to be rendered`);
                this._window.webContents.beginFrameSubscription(false, () => {
                    try {
                        this.trace(`A frame has been rendered`);
                        this._window.webContents.endFrameSubscription();
                    }
                    catch {
                        // ignore errors
                    }
                    resolve();
                });
            }
            catch {
                // ignore errors
                resolve();
            }
        }), WebPageLoader.FRAME_TIMEOUT);
    }
    /**
     * Extracts the content of the loaded web page using the Accessibility domain and reports the result.
     */
    async extractContent(errorResult) {
        if (this._store.isDisposed) {
            return;
        }
        try {
            const title = this._window.webContents.getTitle();
            let result = await this.extractAccessibilityTreeContent() ?? '';
            if (result.length < WebPageLoader.MIN_CONTENT_LENGTH) {
                this.trace(`Accessibility tree extraction yielded insufficient content, trying main DOM element extraction`);
                const domContent = await this.extractMainDomElementContent() ?? '';
                result = domContent.length > result.length ? domContent : result;
            }
            if (result.length === 0) {
                this._onResult({ status: 'error', error: 'Failed to extract meaningful content from the web page' });
            }
            else if (errorResult !== undefined) {
                this._onResult({ ...errorResult, result, title });
            }
            else {
                this._onResult({ status: 'ok', result, title });
            }
        }
        catch (e) {
            if (errorResult !== undefined) {
                this._onResult(errorResult);
            }
            else {
                this._onResult({
                    status: 'error',
                    error: e instanceof Error ? e.message : String(e)
                });
            }
        }
    }
    /**
     * Extracts content from the Accessibility tree of the loaded web page.
     * @return The extracted content, or undefined if extraction fails.
     */
    async extractAccessibilityTreeContent() {
        this.trace(`Extracting content using Accessibility domain`);
        try {
            const { nodes } = await this._debugger.sendCommand('Accessibility.getFullAXTree');
            return convertAXTreeToMarkdown(this._uri, nodes);
        }
        catch (error) {
            this.trace(`Accessibility tree extraction failed: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }
    /**
     * Fallback method for extracting web page content when Accessibility tree extraction yields insufficient content.
     * Attempts to extract meaningful text content from the main DOM elements of the loaded web page.
     * @returns The extracted text content, or undefined if extraction fails.
     */
    async extractMainDomElementContent() {
        try {
            this.trace(`Extracting content from main DOM element`);
            return await this._window.webContents.executeJavaScript(`
				(() => {
					const selectors = ['main','article','[role="main"]','.main-content','#main-content','.article-body','.post-content','.entry-content','.content','body'];
					for (const selector of selectors) {
						const content = document.querySelector(selector)?.textContent?.replace(/[ \\t]+/g, ' ').replace(/\\s{2,}/gm, '\\n').trim();
						if (content && content.length > ${WebPageLoader.MIN_CONTENT_LENGTH}) {
							return content;
						}
					}
					return undefined;
				})();
			`);
        }
        catch (error) {
            this.trace(`DOM extraction failed: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViUGFnZUxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJDb250ZW50RXh0cmFjdG9yL2VsZWN0cm9uLW1haW4vd2ViUGFnZUxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHNUQsT0FBTyxFQUFVLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFTOUU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7YUFDcEIsWUFBTyxHQUFHLEtBQUssQUFBUixDQUFTLEdBQUMsYUFBYTthQUM5QixzQkFBaUIsR0FBRyxJQUFJLEFBQVAsQ0FBUSxHQUFDLDRDQUE0QzthQUN0RSxrQkFBYSxHQUFHLEdBQUcsQUFBTixDQUFPLEdBQUMsY0FBYzthQUNuQyx1QkFBa0IsR0FBRyxHQUFHLEFBQU4sQ0FBTyxHQUFDLGdEQUFnRDthQUMxRSx1QkFBa0IsR0FBRyxHQUFHLEFBQU4sQ0FBTyxHQUFDLDJEQUEyRDtJQVc3RyxZQUNDLG9CQUFpRixFQUNoRSxPQUFvQixFQUNwQixJQUFTLEVBQ1QsUUFBc0M7UUFFdkQsS0FBSyxFQUFFLENBQUM7UUFKUyxZQUFPLEdBQVAsT0FBTyxDQUFh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