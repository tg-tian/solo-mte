/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { NullLogService } from '../../../log/common/log.js';
import { WebPageLoader } from '../../electron-main/webPageLoader.js';
class MockWebContents {
    constructor() {
        this._listeners = new Map();
        this.loadURL = sinon.stub().resolves();
        this.getTitle = sinon.stub().returns('Test Page Title');
        this.executeJavaScript = sinon.stub().resolves(undefined);
        this.session = {
            webRequest: {
                onBeforeSendHeaders: sinon.stub()
            }
        };
        this.debugger = new MockDebugger();
    }
    once(event, listener) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(listener);
        return this;
    }
    on(event, listener) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(listener);
        return this;
    }
    emit(event, ...args) {
        const listeners = this._listeners.get(event) || [];
        for (const listener of listeners) {
            listener(...args);
        }
        this._listeners.delete(event);
    }
    beginFrameSubscription(_onlyDirty, callback) {
        setTimeout(() => callback(), 0);
    }
    endFrameSubscription() {
    }
}
class MockDebugger {
    constructor() {
        this._listeners = new Map();
        this.attach = sinon.stub();
        this.sendCommand = sinon.stub().resolves({});
    }
    on(event, listener) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(listener);
        return this;
    }
    emit(event, ...args) {
        const listeners = this._listeners.get(event) || [];
        for (const listener of listeners) {
            listener(...args);
        }
    }
}
class MockBrowserWindow {
    constructor(_options) {
        this.destroy = sinon.stub();
        this.loadURL = sinon.stub().resolves();
        this.webContents = new MockWebContents();
    }
}
suite('WebPageLoader', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let window;
    teardown(() => {
        sinon.restore();
    });
    function createWebPageLoader(uri, options) {
        const loader = new WebPageLoader((options) => {
            window = new MockBrowserWindow(options);
            // eslint-disable-next-line local/code-no-any-casts
            return window;
        }, new NullLogService(), uri, options);
        disposables.add(loader);
        return loader;
    }
    function createMockAXNodes() {
        return [
            {
                nodeId: 'node1',
                ignored: false,
                role: { type: 'role', value: 'paragraph' },
                childIds: ['node2']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: { type: 'role', value: 'StaticText' },
                name: { type: 'string', value: 'Test content from page' }
            }
        ];
    }
    //#region Basic Loading Tests
    test('successful page load returns ok status with content', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate page load events
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
        assert.strictEqual(result.title, 'Test Page Title');
        assert.ok(result.result.includes('Test content from page'));
    }));
    test('page load failure returns error status', async () => {
        const uri = URI.parse('https://example.com/page');
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: createMockAXNodes() });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate page load failure
        const mockEvent = {};
        window.webContents.emit('did-fail-load', mockEvent, -6, 'ERR_CONNECTION_REFUSED');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'error');
        if (result.status === 'error') {
            assert.strictEqual(result.statusCode, -6);
            assert.strictEqual(result.error, 'ERR_CONNECTION_REFUSED');
        }
    });
    test('ERR_ABORTED is ignored and content extraction continues', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate ERR_ABORTED (-3) which should be ignored
        const mockEvent = {};
        window.webContents.emit('did-fail-load', mockEvent, -3, 'ERR_ABORTED');
        const result = await loadPromise;
        // ERR_ABORTED should not cause an error status, content should be extracted
        assert.strictEqual(result.status, 'ok');
        if (result.status === 'ok') {
            assert.ok(result.result.includes('Test content from page'));
        }
    }));
    //#endregion
    //#region Redirect Tests
    test('redirect to different authority returns redirect status when followRedirects is false', async () => {
        const uri = URI.parse('https://example.com/page');
        const redirectUrl = 'https://other-domain.com/redirected';
        const loader = createWebPageLoader(uri, { followRedirects: false });
        window.webContents.debugger.sendCommand.resolves({});
        const loadPromise = loader.load();
        // Simulate redirect to different authority
        const mockEvent = {
            preventDefault: sinon.stub()
        };
        window.webContents.emit('will-redirect', mockEvent, redirectUrl);
        const result = await loadPromise;
        assert.strictEqual(result.status, 'redirect');
        if (result.status === 'redirect') {
            assert.strictEqual(result.toURI.authority, 'other-domain.com');
        }
        assert.ok((mockEvent.preventDefault).called);
    });
    test('redirect to same authority is not treated as redirect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const redirectUrl = 'https://example.com/other-page';
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri, { followRedirects: false });
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate redirect to same authority
        const mockEvent = {
            preventDefault: sinon.stub()
        };
        window.webContents.emit('will-redirect', mockEvent, redirectUrl);
        // Should not prevent default for same-authority redirects
        assert.ok(!(mockEvent.preventDefault).called);
        // Continue with normal load
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
    }));
    test('redirect is followed when followRedirects option is true', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const redirectUrl = 'https://other-domain.com/redirected';
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri, { followRedirects: true });
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate redirect
        const mockEvent = {
            preventDefault: sinon.stub()
        };
        window.webContents.emit('will-redirect', mockEvent, redirectUrl);
        // Should not prevent default when followRedirects is true
        assert.ok(!(mockEvent.preventDefault).called);
        // Continue with normal load after redirect
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
    }));
    //#endregion
    //#region HTTP Error Tests
    test('HTTP error status code returns error with content', async () => {
        const uri = URI.parse('https://example.com/not-found');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate network response with error status
        const mockEvent = {};
        window.webContents.debugger.emit('message', mockEvent, 'Network.responseReceived', {
            requestId: 'req1',
            type: 'Document',
            response: {
                status: 404,
                statusText: 'Not Found'
            }
        });
        const result = await loadPromise;
        assert.strictEqual(result.status, 'error');
        if (result.status === 'error') {
            assert.strictEqual(result.statusCode, 404);
            assert.strictEqual(result.error, 'Not Found');
        }
    });
    test('HTTP 500 error returns server error status', async () => {
        const uri = URI.parse('https://example.com/server-error');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate network response with 500 status
        const mockEvent = {};
        window.webContents.debugger.emit('message', mockEvent, 'Network.responseReceived', {
            requestId: 'req1',
            type: 'Document',
            response: {
                status: 500,
                statusText: 'Internal Server Error'
            }
        });
        const result = await loadPromise;
        assert.strictEqual(result.status, 'error');
        if (result.status === 'error') {
            assert.strictEqual(result.statusCode, 500);
            assert.strictEqual(result.error, 'Internal Server Error');
        }
    });
    test('HTTP error without status text uses fallback message', async () => {
        const uri = URI.parse('https://example.com/error');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate network response without status text
        const mockEvent = {};
        window.webContents.debugger.emit('message', mockEvent, 'Network.responseReceived', {
            requestId: 'req1',
            type: 'Document',
            response: {
                status: 503
            }
        });
        const result = await loadPromise;
        assert.strictEqual(result.status, 'error');
        if (result.status === 'error') {
            assert.strictEqual(result.statusCode, 503);
            assert.strictEqual(result.error, 'HTTP error 503');
        }
    });
    //#endregion
    //#region Network Request Tracking Tests
    test('tracks network requests and waits for completion', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate page starting to load
        window.webContents.emit('did-start-loading');
        // Simulate network requests
        const mockEvent = {};
        window.webContents.debugger.emit('message', mockEvent, 'Network.requestWillBeSent', {
            requestId: 'req1'
        });
        window.webContents.debugger.emit('message', mockEvent, 'Network.requestWillBeSent', {
            requestId: 'req2'
        });
        // Simulate page finish load (but network requests still pending)
        window.webContents.emit('did-finish-load');
        // Simulate network requests completing
        window.webContents.debugger.emit('message', mockEvent, 'Network.loadingFinished', {
            requestId: 'req1'
        });
        window.webContents.debugger.emit('message', mockEvent, 'Network.loadingFinished', {
            requestId: 'req2'
        });
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
    }));
    test('handles network request failures gracefully', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const axNodes = createMockAXNodes();
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        // Simulate page load
        window.webContents.emit('did-start-loading');
        // Simulate a network request that fails
        const mockEvent = {};
        window.webContents.debugger.emit('message', mockEvent, 'Network.requestWillBeSent', {
            requestId: 'req1'
        });
        window.webContents.debugger.emit('message', mockEvent, 'Network.loadingFailed', {
            requestId: 'req1'
        });
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
    }));
    //#endregion
    //#region Accessibility Tree Extraction Tests
    test('extracts content from accessibility tree', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const axNodes = [
            {
                nodeId: 'heading1',
                ignored: false,
                role: { type: 'role', value: 'heading' },
                name: { type: 'string', value: 'Page Title' },
                properties: [{ name: 'level', value: { type: 'integer', value: 1 } }],
                childIds: ['text1']
            },
            {
                nodeId: 'text1',
                ignored: false,
                role: { type: 'role', value: 'StaticText' },
                name: { type: 'string', value: 'Page Title' }
            }
        ];
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: axNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
        if (result.status === 'ok') {
            assert.ok(result.result.includes('# Page Title'));
        }
    }));
    test('falls back to DOM extraction when accessibility tree yields insufficient content', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        // Create AX tree with very short content (less than MIN_CONTENT_LENGTH)
        const shortAXNodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: { type: 'role', value: 'StaticText' },
                name: { type: 'string', value: 'Short' }
            }
        ];
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: shortAXNodes });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        // Mock DOM extraction returning longer content
        const domContent = 'This is much longer content extracted from the DOM that exceeds the minimum content length requirement and should be used instead of the short accessibility tree content.';
        window.webContents.executeJavaScript.resolves(domContent);
        const loadPromise = loader.load();
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'ok');
        if (result.status === 'ok') {
            assert.strictEqual(result.result, domContent);
        }
        // Verify executeJavaScript was called for DOM extraction
        assert.ok(window.webContents.executeJavaScript.called);
    }));
    test('returns error when both accessibility tree and DOM extraction yield no content', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/empty-page');
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    // Return empty accessibility tree
                    return Promise.resolve({ nodes: [] });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        // Mock DOM extraction returning undefined (no content)
        window.webContents.executeJavaScript.resolves(undefined);
        const loadPromise = loader.load();
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        const result = await loadPromise;
        assert.strictEqual(result.status, 'error');
        if (result.status === 'error') {
            assert.ok(result.error.includes('Failed to extract meaningful content'));
        }
        // Verify both extraction methods were attempted
        assert.ok(window.webContents.executeJavaScript.called);
    }));
    //#endregion
    //#region Header Modification Tests
    test('onBeforeSendHeaders adds browser headers for navigation', () => {
        createWebPageLoader(URI.parse('https://example.com/page'));
        // Get the callback passed to onBeforeSendHeaders
        assert.ok(window.webContents.session.webRequest.onBeforeSendHeaders.called);
        const callback = window.webContents.session.webRequest.onBeforeSendHeaders.getCall(0).args[0];
        // Mock callback function
        let modifiedHeaders;
        const mockCallback = (details) => {
            modifiedHeaders = details.requestHeaders;
        };
        // Simulate a request to the same domain
        callback({
            url: 'https://example.com/page',
            requestHeaders: {
                'TestHeader': 'TestValue'
            }
        }, mockCallback);
        // Verify headers were added
        assert.ok(modifiedHeaders);
        assert.strictEqual(modifiedHeaders['DNT'], '1');
        assert.strictEqual(modifiedHeaders['Sec-GPC'], '1');
        assert.strictEqual(modifiedHeaders['TestHeader'], 'TestValue');
    });
    //#endregion
    //#region Disposal Tests
    test('disposes resources after load completes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const uri = URI.parse('https://example.com/page');
        const loader = createWebPageLoader(uri);
        window.webContents.debugger.sendCommand.callsFake((command) => {
            switch (command) {
                case 'Network.enable':
                    return Promise.resolve();
                case 'Accessibility.getFullAXTree':
                    return Promise.resolve({ nodes: createMockAXNodes() });
                default:
                    assert.fail(`Unexpected command: ${command}`);
            }
        });
        const loadPromise = loader.load();
        window.webContents.emit('did-start-loading');
        window.webContents.emit('did-finish-load');
        await loadPromise;
        // The loader should call destroy on the window when disposed
        assert.ok(window.destroy.called);
    }));
    //#endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViUGFnZUxvYWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvdGVzdC9lbGVjdHJvbi1tYWluL3dlYlBhZ2VMb2FkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQU1yRSxNQUFNLGVBQWU7SUFhcEI7UUFaaUIsZUFBVSxHQUFHLElBQUksR0FBRyxFQUE0QyxDQUFDO1FBRTNFLFlBQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbEMsYUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNuRCxzQkFBaUIsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXJELFlBQU8sR0FBRztZQUNoQixVQUFVLEVBQUU7Z0JBQ1gsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRTthQUNqQztTQUNELENBQUM7UUFHRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7SUFDcEMs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