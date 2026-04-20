/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BrowserType } from '../common/browserElements.js';
import { webContents } from 'electron';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const INativeBrowserElementsMainService = createDecorator('browserElementsMainService');
let NativeBrowserElementsMainService = class NativeBrowserElementsMainService extends Disposable {
    constructor(windowsMainService, auxiliaryWindowsMainService) {
        super();
        this.windowsMainService = windowsMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
    }
    get windowId() { throw new Error('Not implemented in electron-main'); }
    async findWebviewTarget(debuggers, windowId, browserType) {
        const { targetInfos } = await debuggers.sendCommand('Target.getTargets');
        let target = undefined;
        const matchingTarget = targetInfos.find((targetInfo) => {
            try {
                const url = new URL(targetInfo.url);
                if (browserType === BrowserType.LiveServer) {
                    return url.searchParams.get('id') && url.searchParams.get('extensionId') === 'ms-vscode.live-server';
                }
                else if (browserType === BrowserType.SimpleBrowser) {
                    return url.searchParams.get('parentId') === windowId.toString() && url.searchParams.get('extensionId') === 'vscode.simple-browser';
                }
                return false;
            }
            catch (err) {
                return false;
            }
        });
        // search for webview via search parameters
        if (matchingTarget) {
            let resultId;
            let url;
            try {
                url = new URL(matchingTarget.url);
                resultId = url.searchParams.get('id');
            }
            catch (e) {
                return undefined;
            }
            target = targetInfos.find((targetInfo) => {
                try {
                    const url = new URL(targetInfo.url);
                    const isLiveServer = browserType === BrowserType.LiveServer && url.searchParams.get('serverWindowId') === resultId;
                    const isSimpleBrowser = browserType === BrowserType.SimpleBrowser && url.searchParams.get('id') === resultId && url.searchParams.has('vscodeBrowserReqId');
                    if (isLiveServer || isSimpleBrowser) {
                        this.currentLocalAddress = url.origin;
                        return true;
                    }
                    return false;
                }
                catch (e) {
                    return false;
                }
            });
            if (target) {
                return target.targetId;
            }
        }
        // fallback: search for webview without parameters based on current origin
        target = targetInfos.find((targetInfo) => {
            try {
                const url = new URL(targetInfo.url);
                return (this.currentLocalAddress === url.origin);
            }
            catch (e) {
                return false;
            }
        });
        if (!target) {
            return undefined;
        }
        return target.targetId;
    }
    async waitForWebviewTargets(debuggers, windowId, browserType) {
        const start = Date.now();
        const timeout = 10000;
        while (Date.now() - start < timeout) {
            const targetId = await this.findWebviewTarget(debuggers, windowId, browserType);
            if (targetId) {
                return targetId;
            }
            // Wait for a short period before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        debuggers.detach();
        return undefined;
    }
    async startDebugSession(windowId, token, browserType, cancelAndDetachId) {
        const window = this.windowById(windowId);
        if (!window?.win) {
            return undefined;
        }
        // Find the simple browser webview
        const allWebContents = webContents.getAllWebContents();
        const simpleBrowserWebview = allWebContents.find(webContent => webContent.id === window.id);
        if (!simpleBrowserWebview) {
            return undefined;
        }
        const debuggers = simpleBrowserWebview.debugger;
        if (!debuggers.isAttached()) {
            debuggers.attach();
        }
        try {
            const matchingTargetId = await this.waitForWebviewTargets(debuggers, windowId, browserType);
            if (!matchingTargetId) {
                if (debuggers.isAttached()) {
                    debuggers.detach();
                }
                throw new Error('No target found');
            }
        }
        catch (e) {
            if (debuggers.isAttached()) {
                debuggers.detach();
            }
            throw new Error('No target found');
        }
        window.win.webContents.on('ipc-message', async (event, channel, closedCancelAndDetachId) => {
            if (channel === `vscode:cancelCurrentSession${cancelAndDetachId}`) {
                if (cancelAndDetachId !== closedCancelAndDetachId) {
                    return;
                }
                if (debuggers.isAttached()) {
                    debuggers.detach();
                }
                if (window.win) {
                    window.win.webContents.removeAllListeners('ipc-message');
                }
            }
        });
    }
    async finishOverlay(debuggers, sessionId) {
        if (debuggers.isAttached() && sessionId) {
            await debuggers.sendCommand('Overlay.setInspectMode', {
                mode: 'none',
                highlightConfig: {
                    showInfo: false,
                    showStyles: false
                }
            }, sessionId);
            await debuggers.sendCommand('Overlay.hideHighlight', {}, sessionId);
            await debuggers.sendCommand('Overlay.disable', {}, sessionId);
            debuggers.detach();
        }
    }
    async getElementData(windowId, rect, token, browserType, cancellationId) {
        const window = this.windowById(windowId);
        if (!window?.win) {
            return undefined;
        }
        // Find the simple browser webview
        const allWebContents = webContents.getAllWebContents();
        const simpleBrowserWebview = allWebContents.find(webContent => webContent.id === window.id);
        if (!simpleBrowserWebview) {
            return undefined;
        }
        const debuggers = simpleBrowserWebview.debugger;
        if (!debuggers.isAttached()) {
            debuggers.attach();
        }
        let targetSessionId = undefined;
        try {
            const targetId = await this.findWebviewTarget(debuggers, windowId, browserType);
            const { sessionId } = await debuggers.sendCommand('Target.attachToTarget', {
                targetId: targetId,
                flatten: true,
            });
            targetSessionId = sessionId;
            await debuggers.sendCommand('DOM.enable', {}, sessionId);
            await debuggers.sendCommand('CSS.enable', {}, sessionId);
            await debuggers.sendCommand('Overlay.enable', {}, sessionId);
            await debuggers.sendCommand('Debugger.enable', {}, sessionId);
            await debuggers.sendCommand('Runtime.enable', {}, sessionId);
            await debuggers.sendCommand('Runtime.evaluate', {
                expression: `(function() {
							const style = document.createElement('style');
							style.id = '__pseudoBlocker__';
							style.textContent = '*::before, *::after { pointer-events: none !important; }';
							document.head.appendChild(style);
						})();`,
            }, sessionId);
            // slightly changed default CDP debugger inspect colors
            await debuggers.sendCommand('Overlay.setInspectMode', {
                mode: 'searchForNode',
                highlightConfig: {
                    showInfo: true,
                    showRulers: false,
                    showStyles: true,
                    showAccessibilityInfo: true,
                    showExtensionLines: false,
                    contrastAlgorithm: 'aa',
                    contentColor: { r: 173, g: 216, b: 255, a: 0.8 },
                    paddingColor: { r: 150, g: 200, b: 255, a: 0.5 },
                    borderColor: { r: 120, g: 180, b: 255, a: 0.7 },
                    marginColor: { r: 200, g: 220, b: 255, a: 0.4 },
                    eventTargetColor: { r: 130, g: 160, b: 255, a: 0.8 },
                    shapeColor: { r: 130, g: 160, b: 255, a: 0.8 },
                    shapeMarginColor: { r: 130, g: 160, b: 255, a: 0.5 },
                    gridHighlightConfig: {
                        rowGapColor: { r: 140, g: 190, b: 255, a: 0.3 },
                        rowHatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                        columnGapColor: { r: 140, g: 190, b: 255, a: 0.3 },
                        columnHatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                        rowLineColor: { r: 120, g: 180, b: 255 },
                        columnLineColor: { r: 120, g: 180, b: 255 },
                        rowLineDash: true,
                        columnLineDash: true
                    },
                    flexContainerHighlightConfig: {
                        containerBorder: {
                            color: { r: 120, g: 180, b: 255 },
                            pattern: 'solid'
                        },
                        itemSeparator: {
                            color: { r: 140, g: 190, b: 255 },
                            pattern: 'solid'
                        },
                        lineSeparator: {
                            color: { r: 140, g: 190, b: 255 },
                            pattern: 'solid'
                        },
                        mainDistributedSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        },
                        crossDistributedSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        },
                        rowGapSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        },
                        columnGapSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        }
                    },
                    flexItemHighlightConfig: {
                        baseSizeBox: {
                            hatchColor: { r: 130, g: 170, b: 255, a: 0.6 }
                        },
                        baseSizeBorder: {
                            color: { r: 120, g: 180, b: 255 },
                            pattern: 'solid'
                        },
                        flexibilityArrow: {
                            color: { r: 130, g: 190, b: 255 }
                        }
                    },
                },
            }, sessionId);
        }
        catch (e) {
            debuggers.detach();
            throw new Error('No target found', e);
        }
        if (!targetSessionId) {
            debuggers.detach();
            throw new Error('No target session id found');
        }
        const nodeData = await this.getNodeData(targetSessionId, debuggers, window.win, cancellationId);
        await this.finishOverlay(debuggers, targetSessionId);
        const zoomFactor = simpleBrowserWebview.getZoomFactor();
        const absoluteBounds = {
            x: rect.x + nodeData.bounds.x,
            y: rect.y + nodeData.bounds.y,
            width: nodeData.bounds.width,
            height: nodeData.bounds.height
        };
        const clippedBounds = {
            x: Math.max(absoluteBounds.x, rect.x),
            y: Math.max(absoluteBounds.y, rect.y),
            width: Math.max(0, Math.min(absoluteBounds.x + absoluteBounds.width, rect.x + rect.width) - Math.max(absoluteBounds.x, rect.x)),
            height: Math.max(0, Math.min(absoluteBounds.y + absoluteBounds.height, rect.y + rect.height) - Math.max(absoluteBounds.y, rect.y))
        };
        const scaledBounds = {
            x: clippedBounds.x * zoomFactor,
            y: clippedBounds.y * zoomFactor,
            width: clippedBounds.width * zoomFactor,
            height: clippedBounds.height * zoomFactor
        };
        return { outerHTML: nodeData.outerHTML, computedStyle: nodeData.computedStyle, bounds: scaledBounds };
    }
    async getNodeData(sessionId, debuggers, window, cancellationId) {
        return new Promise((resolve, reject) => {
            const onMessage = async (event, method, params) => {
                if (method === 'Overlay.inspectNodeRequested') {
                    debuggers.off('message', onMessage);
                    await debuggers.sendCommand('Runtime.evaluate', {
                        expression: `(() => {
										const style = document.getElementById('__pseudoBlocker__');
										if (style) style.remove();
									})();`,
                    }, sessionId);
                    const backendNodeId = params?.backendNodeId;
                    if (!backendNodeId) {
                        throw new Error('Missing backendNodeId in inspectNodeRequested event');
                    }
                    try {
                        await debuggers.sendCommand('DOM.getDocument', {}, sessionId);
                        const { nodeIds } = await debuggers.sendCommand('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [backendNodeId] }, sessionId);
                        if (!nodeIds || nodeIds.length === 0) {
                            throw new Error('Failed to get node IDs.');
                        }
                        const nodeId = nodeIds[0];
                        const { model } = await debuggers.sendCommand('DOM.getBoxModel', { nodeId }, sessionId);
                        if (!model) {
                            throw new Error('Failed to get box model.');
                        }
                        const content = model.content;
                        const margin = model.margin;
                        const x = Math.min(margin[0], content[0]);
                        const y = Math.min(margin[1], content[1]) + 32.4; // 32.4 is height of the title bar
                        const width = Math.max(margin[2] - margin[0], content[2] - content[0]);
                        const height = Math.max(margin[5] - margin[1], content[5] - content[1]);
                        const matched = await debuggers.sendCommand('CSS.getMatchedStylesForNode', { nodeId }, sessionId);
                        if (!matched) {
                            throw new Error('Failed to get matched css.');
                        }
                        const formatted = this.formatMatchedStyles(matched);
                        const { outerHTML } = await debuggers.sendCommand('DOM.getOuterHTML', { nodeId }, sessionId);
                        if (!outerHTML) {
                            throw new Error('Failed to get outerHTML.');
                        }
                        resolve({
                            outerHTML,
                            computedStyle: formatted,
                            bounds: { x, y, width, height }
                        });
                    }
                    catch (err) {
                        debuggers.off('message', onMessage);
                        debuggers.detach();
                        reject(err);
                    }
                }
            };
            window.webContents.on('ipc-message', async (event, channel, closedCancellationId) => {
                if (channel === `vscode:cancelElementSelection${cancellationId}`) {
                    if (cancellationId !== closedCancellationId) {
                        return;
                    }
                    debuggers.off('message', onMessage);
                    await this.finishOverlay(debuggers, sessionId);
                    window.webContents.removeAllListeners('ipc-message');
                }
            });
            debuggers.on('message', onMessage);
        });
    }
    formatMatchedStyles(matched) {
        const lines = [];
        // inline
        if (matched.inlineStyle?.cssProperties?.length) {
            lines.push('/* Inline style */');
            lines.push('element {');
            for (const prop of matched.inlineStyle.cssProperties) {
                if (prop.name && prop.value) {
                    lines.push(`  ${prop.name}: ${prop.value};`);
                }
            }
            lines.push('}\n');
        }
        // matched
        if (matched.matchedCSSRules?.length) {
            for (const ruleEntry of matched.matchedCSSRules) {
                const rule = ruleEntry.rule;
                const selectors = rule.selectorList.selectors.map(s => s.text).join(', ');
                lines.push(`/* Matched Rule from ${rule.origin} */`);
                lines.push(`${selectors} {`);
                for (const prop of rule.style.cssProperties) {
                    if (prop.name && prop.value) {
                        lines.push(`  ${prop.name}: ${prop.value};`);
                    }
                }
                lines.push('}\n');
            }
        }
        // inherited rules
        if (matched.inherited?.length) {
            let level = 1;
            for (const inherited of matched.inherited) {
                const rules = inherited.matchedCSSRules || [];
                for (const ruleEntry of rules) {
                    const rule = ruleEntry.rule;
                    const selectors = rule.selectorList.selectors.map(s => s.text).join(', ');
                    lines.push(`/* Inherited from ancestor level ${level} (${rule.origin}) */`);
                    lines.push(`${selectors} {`);
                    for (const prop of rule.style.cssProperties) {
                        if (prop.name && prop.value) {
                            lines.push(`  ${prop.name}: ${prop.value};`);
                        }
                    }
                    lines.push('}\n');
                }
                level++;
            }
        }
        return '\n' + lines.join('\n');
    }
    windowById(windowId, fallbackCodeWindowId) {
        return this.codeWindowById(windowId) ?? this.auxiliaryWindowById(windowId) ?? this.codeWindowById(fallbackCodeWindowId);
    }
    codeWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        return this.windowsMainService.getWindowById(windowId);
    }
    auxiliaryWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        const contents = webContents.fromId(windowId);
        if (!contents) {
            return undefined;
        }
        return this.auxiliaryWindowsMainService.getWindowByWebContents(contents);
    }
};
NativeBrowserElementsMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IAuxiliaryWindowsMainService)
], NativeBrowserElementsMainService);
export { NativeBrowserElementsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlQnJvd3NlckVsZW1lbnRzTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYnJvd3NlckVsZW1lbnRzL2VsZWN0cm9uLW1haW4vbmF0aXZlQnJvd3NlckVsZW1lbnRzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBK0MsTUFBTSw4QkFBOEIsQ0FBQztBQUd4RyxPQUFPLEVBQWlCLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUd0RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRy9ELE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FBb0MsNEJBQTRCLENBQUMsQ0FBQztBQVMzSCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFLL0QsWUFDdUMsa0JBQXVDLEVBQzlCLDJCQUF5RDtRQUd4RyxLQUFLLEVBQUUsQ0FBQztRQUo4Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzlCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBOEI7SUFJekcsQ0FBQztJQUVELElBQUksUUFBUSxLQUFZLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFOUUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFNBQTRCLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QjtRQUMvRixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcs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