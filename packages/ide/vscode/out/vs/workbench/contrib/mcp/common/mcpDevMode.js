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
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Throttler } from '../../../../base/common/async.js';
import * as glob from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { autorun, autorunDelta, derivedOpts } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDebugService } from '../../debug/common/debug.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
let McpDevModeServerAttache = class McpDevModeServerAttache extends Disposable {
    constructor(server, fwdRef, registry, fileService, workspaceContextService) {
        super();
        const workspaceFolder = server.readDefinitions().map(({ collection }) => collection?.presentation?.origin &&
            workspaceContextService.getWorkspaceFolder(collection.presentation?.origin)?.uri);
        const restart = async () => {
            const lastDebugged = fwdRef.lastModeDebugged;
            await server.stop();
            await server.start({ debug: lastDebugged });
        };
        // 1. Auto-start the server, restart if entering debug mode
        let didAutoStart = false;
        this._register(autorun(reader => {
            const defs = server.readDefinitions().read(reader);
            if (!defs.collection || !defs.server || !defs.server.devMode) {
                didAutoStart = false;
                return;
            }
            // don't keep trying to start the server unless it's a new server or devmode is newly turned on
            if (didAutoStart) {
                return;
            }
            const delegates = registry.delegates.read(reader);
            if (!delegates.some(d => d.canStart(defs.collection, defs.server))) {
                return;
            }
            server.start();
            didAutoStart = true;
        }));
        const debugMode = server.readDefinitions().map(d => !!d.server?.devMode?.debug);
        this._register(autorunDelta(debugMode, ({ lastValue, newValue }) => {
            if (!!newValue && !objectsEqual(lastValue, newValue)) {
                restart();
            }
        }));
        // 2. Watch for file changes
        const watchObs = derivedOpts({ equalsFn: arraysEqual }, reader => {
            const def = server.readDefinitions().read(reader);
            const watch = def.server?.devMode?.watch;
            return typeof watch === 'string' ? [watch] : watch;
        });
        const restartScheduler = this._register(new Throttler());
        this._register(autorun(reader => {
            const pattern = watchObs.read(reader);
            const wf = workspaceFolder.read(reader);
            if (!pattern || !wf) {
                return;
            }
            const includes = pattern.filter(p => !p.startsWith('!'));
            const excludes = pattern.filter(p => p.startsWith('!')).map(p => p.slice(1));
            reader.store.add(fileService.watch(wf, { includes, excludes, recursive: true }));
            const ignoreCase = !fileService.hasCapability(wf, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
            const includeParse = includes.map(p => glob.parse({ base: wf.fsPath, pattern: p }, { ignoreCase }));
            const excludeParse = excludes.map(p => glob.parse({ base: wf.fsPath, pattern: p }, { ignoreCase }));
            reader.store.add(fileService.onDidFilesChange(e => {
                for (const change of [e.rawAdded, e.rawDeleted, e.rawUpdated]) {
                    for (const uri of change) {
                        if (includeParse.some(i => i(uri.fsPath)) && !excludeParse.some(e => e(uri.fsPath))) {
                            restartScheduler.queue(restart);
                            break;
                        }
                    }
                }
            }));
        }));
    }
};
McpDevModeServerAttache = __decorate([
    __param(2, IMcpRegistry),
    __param(3, IFileService),
    __param(4, IWorkspaceContextService)
], McpDevModeServerAttache);
export { McpDevModeServerAttache };
export const IMcpDevModeDebugging = createDecorator('mcpDevModeDebugging');
const DEBUG_HOST = '127.0.0.1';
let McpDevModeDebugging = class McpDevModeDebugging {
    constructor(_debugService, _commandService) {
        this._debugService = _debugService;
        this._commandService = _commandService;
    }
    async transform(definition, launch) {
        if (!definition.devMode?.debug || launch.type !== 1 /* McpServerTransportType.Stdio */) {
            return launch;
        }
        const port = await this.getDebugPort();
        const name = `MCP: ${definition.label}`; // for debugging
        const options = { startedByUser: false, suppressDebugView: true };
        const commonConfig = {
            internalConsoleOptions: 'neverOpen',
            suppressMultipleSessionWarning: true,
        };
        switch (definition.devMode.debug.type) {
            case 'node': {
                if (!/node[0-9]*$/.test(launch.command)) {
                    throw new Error(localize('mcp.debug.nodeBinReq', 'MCP server must be launched with the "node" executable to enable debugging, but was launched with "{0}"', launch.command));
                }
                // We intentionally assert types as the DA has additional properties beyong IConfig
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                this._debugService.startDebugging(undefined, {
                    type: 'pwa-node',
                    request: 'attach',
                    name,
                    port,
                    host: DEBUG_HOST,
                    timeout: 30_000,
                    continueOnAttach: true,
                    ...commonConfig,
                }, options);
                return { ...launch, args: [`--inspect-brk=${DEBUG_HOST}:${port}`, ...launch.args] };
            }
            case 'debugpy': {
                if (!/python[0-9.]*$/.test(launch.command)) {
                    throw new Error(localize('mcp.debug.pythonBinReq', 'MCP server must be launched with the "python" executable to enable debugging, but was launched with "{0}"', launch.command));
                }
                let command;
                let args = ['--wait-for-client', '--connect', `${DEBUG_HOST}:${port}`, ...launch.args];
                if (definition.devMode.debug.debugpyPath) {
                    command = definition.devMode.debug.debugpyPath;
                }
                else {
                    try {
                        // The Python debugger exposes a command to get its bundle debugpy module path.  Use that if it's available.
                        const debugPyPath = await this._commandService.executeCommand('python.getDebugpyPackagePath');
                        if (debugPyPath) {
                            command = launch.command;
                            args = [debugPyPath, ...args];
                        }
                    }
                    catch {
                        // ignored, no Python debugger extension installed or an error therein
                    }
                }
                if (!command) {
                    command = 'debugpy';
                }
                await Promise.race([
                    // eslint-disable-next-line local/code-no-dangerous-type-assertions
                    this._debugService.startDebugging(undefined, {
                        type: 'debugpy',
                        name,
                        request: 'attach',
                        listen: {
                            host: DEBUG_HOST,
                            port
                        },
                        ...commonConfig,
                    }, options),
                    this.ensureListeningOnPort(port)
                ]);
                return { ...launch, command, args };
            }
            default:
                assertNever(definition.devMode.debug, `Unknown debug type ${JSON.stringify(definition.devMode.debug)}`);
        }
    }
    ensureListeningOnPort(port) {
        return Promise.resolve();
    }
    getDebugPort() {
        return Promise.resolve(9230);
    }
};
McpDevModeDebugging = __decorate([
    __param(0, IDebugService),
    __param(1, ICommandService)
], McpDevModeDebugging);
export { McpDevModeDebugging };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRGV2TW9kZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcERldk1vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQWtDLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQVcsYUFBYSxFQUF3QixNQUFNLDZCQUE2QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUc5QyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFDdEQsWUFDQyxNQUFrQixF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