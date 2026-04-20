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
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { osPathModule, updateLinkWithRelativeCwd } from './terminalLinkHelpers.js';
import { getTerminalLinkType } from './terminalLocalLinkDetector.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { detectLinks, getLinkSuffix } from './terminalLinkParsing.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
let TerminalLocalFileLinkOpener = class TerminalLocalFileLinkOpener {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open file link without a resolved URI');
        }
        const linkSuffix = link.parsedLink ? link.parsedLink.suffix : getLinkSuffix(link.text);
        let selection = link.selection;
        if (!selection) {
            selection = linkSuffix?.row === undefined ? undefined : {
                startLineNumber: linkSuffix.row ?? 1,
                startColumn: linkSuffix.col ?? 1,
                endLineNumber: linkSuffix.rowEnd,
                endColumn: linkSuffix.colEnd
            };
        }
        await this._editorService.openEditor({
            resource: link.uri,
            options: { pinned: true, selection, revealIfOpened: true }
        });
    }
};
TerminalLocalFileLinkOpener = __decorate([
    __param(0, IEditorService)
], TerminalLocalFileLinkOpener);
export { TerminalLocalFileLinkOpener };
let TerminalLocalFolderInWorkspaceLinkOpener = class TerminalLocalFolderInWorkspaceLinkOpener {
    constructor(_commandService) {
        this._commandService = _commandService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open folder in workspace link without a resolved URI');
        }
        await this._commandService.executeCommand('revealInExplorer', link.uri);
    }
};
TerminalLocalFolderInWorkspaceLinkOpener = __decorate([
    __param(0, ICommandService)
], TerminalLocalFolderInWorkspaceLinkOpener);
export { TerminalLocalFolderInWorkspaceLinkOpener };
let TerminalLocalFolderOutsideWorkspaceLinkOpener = class TerminalLocalFolderOutsideWorkspaceLinkOpener {
    constructor(_hostService) {
        this._hostService = _hostService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open folder in workspace link without a resolved URI');
        }
        this._hostService.openWindow([{ folderUri: link.uri }], { forceNewWindow: true });
    }
};
TerminalLocalFolderOutsideWorkspaceLinkOpener = __decorate([
    __param(0, IHostService)
], TerminalLocalFolderOutsideWorkspaceLinkOpener);
export { TerminalLocalFolderOutsideWorkspaceLinkOpener };
let TerminalSearchLinkOpener = class TerminalSearchLinkOpener {
    constructor(_capabilities, _initialCwd, _localFileOpener, _localFolderInWorkspaceOpener, _getOS, _fileService, instantiationService, _quickInputService, _searchService, _logService, _workbenchEnvironmentService, _workspaceContextService) {
        this._capabilities = _capabilities;
        this._initialCwd = _initialCwd;
        this._localFileOpener = _localFileOpener;
        this._localFolderInWorkspaceOpener = _localFolderInWorkspaceOpener;
        this._getOS = _getOS;
        this._fileService = _fileService;
        this._quickInputService = _quickInputService;
        this._searchService = _searchService;
        this._logService = _logService;
        this._workbenchEnvironmentService = _workbenchEnvironmentService;
        this._workspaceContextService = _workspaceContextService;
        this._fileQueryBuilder = instantiationService.createInstance(QueryBuilder);
    }
    async open(link) {
        const osPath = osPathModule(this._getOS());
        const pathSeparator = osPath.sep;
        // Remove file:/// and any leading ./ or ../ since quick access doesn't understand that format
        let text = link.text.replace(/^file:\/\/\/?/, '');
        text = osPath.normalize(text).replace(/^(\.+[\\/])+/, '');
        // Try extract any trailing line and column numbers by matching the text against parsed
        // links. This will give a search link `foo` on a line like `"foo", line 10` to open the
        // quick pick with `foo:10` as the contents.
        //
        // This also normalizes the path to remove suffixes like :10 or :5.0-4
        if (link.contextLine) {
            // Skip suffix parsing if the text looks like it contains an ISO 8601 timestamp format
            const iso8601Pattern = /:\d{2}:\d{2}[+-]\d{2}:\d{2}\.[a-z]+/;
            if (!iso8601Pattern.test(link.text)) {
                const parsedLinks = detectLinks(link.contextLine, this._getOS());
                // Optimistically check that the link _starts with_ the parsed link text. If so,
                // continue to use the parsed link
                const matchingParsedLink = parsedLinks.find(parsedLink => parsedLink.suffix && link.text.startsWith(parsedLink.path.text));
                if (matchingParsedLink) {
                    if (matchingParsedLink.suffix?.row !== undefined) {
                        // Normalize the path based on the parsed link
                        text = matchingParsedLink.path.text;
                        text += `:${matchingParsedLink.suffix.row}`;
                        if (matchingParsedLink.suffix?.col !== undefined) {
                            text += `:${matchingParsedLink.suffix.col}`;
                        }
                    }
                }
            }
        }
        // Remove `:<one or more non number characters>` from the end of the link.
        // Examples:
        // - Ruby stack traces: <link>:in ...
        // - Grep output: <link>:<result line>
        // This only happens when the colon is _not_ followed by a forward- or back-slash as that
        // would break absolute Windows paths (eg. `C:/Users/...`).
        text = text.replace(/:[^\\/\d][^\d]*$/, '');
        // Remove any trailing periods after the line/column numbers, to prevent breaking the search feature, #200257
        // Examples:
        // "Check your code Test.tsx:12:45." -> Test.tsx:12:45
        // "Check your code Test.tsx:12." -> Test.tsx:12
        text = text.replace(/\.$/, '');
        // If any of the names of the folders in the workspace matches
        // a prefix of the link, remove that prefix and continue
        this._workspaceContextService.getWorkspace().folders.forEach((folder) => {
            if (text.substring(0, folder.name.length + 1) === folder.name + pathSeparator) {
                text = text.substring(folder.name.length + 1);
                return;
            }
        });
        let cwdResolvedText = text;
        if (this._capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            cwdResolvedText = updateLinkWithRelativeCwd(this._capabilities, link.bufferRange.start.y, text, osPath, this._logService)?.[0] || text;
        }
        // Try open the cwd resolved link first
        if (await this._tryOpenExactLink(cwdResolvedText, link)) {
            return;
        }
        // If the cwd resolved text didn't match, try find the link without the cwd resolved, for
        // example when a command prints paths in a sub-directory of the current cwd
        if (text !== cwdResolvedText) {
            if (await this._tryOpenExactLink(text, link)) {
                return;
            }
        }
        // Fallback to searching quick access
        return this._quickInputService.quickAccess.show(text);
    }
    async _getExactMatch(sanitizedLink) {
        // Make the link relative to the cwd if it isn't absolute
        const os = this._getOS();
        const pathModule = osPathModule(os);
        const isAbsolute = pathModule.isAbsolute(sanitizedLink);
        let absolutePath = isAbsolute ? sanitizedLink : undefined;
        if (!isAbsolute && this._initialCwd.length > 0) {
            absolutePath = pathModule.join(this._initialCwd, sanitizedLink);
        }
        // Try open as an absolute link
        let resourceMatch;
        if (absolutePath) {
            let normalizedAbsolutePath = absolutePath;
            if (os === 1 /* OperatingSystem.Windows */) {
                normalizedAbsolutePath = absolutePath.replace(/\\/g, '/');
                if (normalizedAbsolutePath.match(/[a-z]:/i)) {
                    normalizedAbsolutePath = `/${normalizedAbsolutePath}`;
                }
            }
            let uri;
            if (this._workbenchEnvironmentService.remoteAuthority) {
                uri = URI.from({
                    scheme: Schemas.vscodeRemote,
                    authority: this._workbenchEnvironmentService.remoteAuthority,
                    path: normalizedAbsolutePath
                });
            }
            else {
                uri = URI.file(normalizedAbsolutePath);
            }
            try {
                const fileStat = await this._fileService.stat(uri);
                resourceMatch = { uri, isDirectory: fileStat.isDirectory };
            }
            catch {
                // File or dir doesn't exist, continue on
            }
        }
        // Search the workspace if an exact match based on the absolute path was not found
        if (!resourceMatch) {
            const results = await this._searchService.fileSearch(this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
                filePattern: sanitizedLink,
                maxResults: 2
            }));
            if (results.results.length > 0) {
                if (results.results.length === 1) {
                    // If there's exactly 1 search result, return it regardless of whether it's
                    // exact or partial.
                    resourceMatch = { uri: results.results[0].resource };
                }
                else if (!isAbsolute) {
                    // For non-absolute links, exact link matching is allowed only if there is a single an exact
                    // file match. For example searching for `foo.txt` when there is no cwd information
                    // available (ie. only the initial cwd) should open the file directly only if there is a
                    // single file names `foo.txt` anywhere within the folder. These same rules apply to
                    // relative paths with folders such as `src/foo.txt`.
                    const results = await this._searchService.fileSearch(this._fileQueryBuilder.file(this._workspaceContextService.getWorkspace().folders, {
                        filePattern: `**/${sanitizedLink}`
                    }));
                    // Find an exact match if it exists
                    const exactMatches = results.results.filter(e => e.resource.toString().endsWith(sanitizedLink));
                    if (exactMatches.length === 1) {
                        resourceMatch = { uri: exactMatches[0].resource };
                    }
                }
            }
        }
        return resourceMatch;
    }
    async _tryOpenExactLink(text, link) {
        const sanitizedLink = text.replace(/:\d+(:\d+)?$/, '');
        try {
            const result = await this._getExactMatch(sanitizedLink);
            if (result) {
                const { uri, isDirectory } = result;
                const linkToOpen = {
                    // Use the absolute URI's path here so the optional line/col get detected
                    text: result.uri.path + (text.match(/:\d+(:\d+)?$/)?.[0] || ''),
                    uri,
                    bufferRange: link.bufferRange,
                    type: link.type
                };
                if (uri) {
                    await (isDirectory ? this._localFolderInWorkspaceOpener.open(linkToOpen) : this._localFileOpener.open(linkToOpen));
                    return true;
                }
            }
        }
        catch {
            return false;
        }
        return false;
    }
};
TerminalSearchLinkOpener = __decorate([
    __param(5, IFileService),
    __param(6, IInstantiationService),
    __param(7, IQuickInputService),
    __param(8, ISearchService),
    __param(9, ITerminalLogService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IWorkspaceContextService)
], TerminalSearchLinkOpener);
export { TerminalSearchLinkOpener };
let TerminalUrlLinkOpener = class TerminalUrlLinkOpener {
    constructor(_isRemote, _localFileOpener, _localFolderInWorkspaceOpener, _localFolderOutsideWorkspaceOpener, _openerService, _configurationService, _fileService, _uriIdentityService, _workspaceContextService, _logService) {
        this._isRemote = _isRemote;
        this._localFileOpener = _localFileOpener;
        this._localFolderInWorkspaceOpener = _localFolderInWorkspaceOpener;
        this._localFolderOutsideWorkspaceOpener = _localFolderOutsideWorkspaceOpener;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        this._logService = _logService;
    }
    async open(link) {
        if (!link.uri) {
            throw new Error('Tried to open a url without a resolved URI');
        }
        // Handle file:// URIs by delegating to appropriate file/folder openers
        if (link.uri.scheme === Schemas.file) {
            return this._openFileSchemeLink(link);
        }
        // It's important to use the raw string value here to avoid converting pre-encoded values
        // from the URL like `%2B` -> `+`.
        this._openerService.open(link.text, {
            allowTunneling: this._isRemote && this._configurationService.getValue('remote.forwardOnOpen'),
            allowContributedOpeners: true,
            openExternal: true
        });
    }
    async _openFileSchemeLink(link) {
        if (!link.uri) {
            return;
        }
        try {
            const stat = await this._fileService.stat(link.uri);
            const isDirectory = stat.isDirectory;
            const linkType = getTerminalLinkType(link.uri, isDirectory, this._uriIdentityService, this._workspaceContextService);
            // Delegate to appropriate opener based on link type
            switch (linkType) {
                case "LocalFile" /* TerminalBuiltinLinkType.LocalFile */:
                    await this._localFileOpener.open(link);
                    return;
                case "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */:
                    await this._localFolderInWorkspaceOpener.open(link);
                    return;
                case "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */:
                    await this._localFolderOutsideWorkspaceOpener.open(link);
                    return;
                case "Url" /* TerminalBuiltinLinkType.Url */:
                    await this.open(link);
                    return;
            }
        }
        catch (error) {
            this._logService.warn('Open file via native file explorer');
        }
        this._openerService.open(link.text, {
            allowTunneling: this._isRemote && this._configurationService.getValue('remote.forwardOnOpen'),
            allowContributedOpeners: true,
            openExternal: true
        });
    }
};
TerminalUrlLinkOpener = __decorate([
    __param(4, IOpenerService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IUriIdentityService),
    __param(8, IWorkspaceContextService),
    __param(9, ITerminalLogService)
], TerminalUrlLinkOpener);
export { TerminalUrlLinkOpener };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rT3BlbmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtPcGVuZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFD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