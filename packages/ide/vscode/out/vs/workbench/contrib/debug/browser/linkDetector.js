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
import { getWindow, isHTMLElement, reset } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Schemas } from '../../../../base/common/network.js';
import * as osPath from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { Iterable } from '../../../../base/common/iterator.js';
const CONTROL_CODES = '\\u0000-\\u0020\\u007f-\\u009f';
const WEB_LINK_REGEX = new RegExp('(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' + CONTROL_CODES + '"]{2,}[^\\s' + CONTROL_CODES + '"\')}\\],:;.!?]', 'ug');
const WIN_ABSOLUTE_PATH = /(?:[a-zA-Z]:(?:(?:\\|\/)[\w\s\.@\-\(\)\[\]{}!#$%^&'`~+=]+)+)/;
const WIN_RELATIVE_PATH = /(?:(?:\~|\.+)(?:(?:\\|\/)[\w\s\.@\-\(\)\[\]{}!#$%^&'`~+=]+)+)/;
const WIN_PATH = new RegExp(`(${WIN_ABSOLUTE_PATH.source}|${WIN_RELATIVE_PATH.source})`);
const POSIX_PATH = /((?:\~|\.+)?(?:\/[\w\s\.@\-\(\)\[\]{}!#$%^&'`~+=]+)+)/;
// Support both ":line 123" and ":123:45" formats for line/column numbers
const LINE_COLUMN = /(?::(?:line\s+)?([\d]+))?(?::([\d]+))?/;
const PATH_LINK_REGEX = new RegExp(`${platform.isWindows ? WIN_PATH.source : POSIX_PATH.source}${LINE_COLUMN.source}`, 'g');
const LINE_COLUMN_REGEX = /:(?:line\s+)?([\d]+)(?::([\d]+))?$/;
const MAX_LENGTH = 2000;
export var DebugLinkHoverBehavior;
(function (DebugLinkHoverBehavior) {
    /** A nice workbench hover */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["Rich"] = 0] = "Rich";
    /**
     * Basic browser hover
     * @deprecated Consumers should adopt `rich` by propagating disposables appropriately
     */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["Basic"] = 1] = "Basic";
    /** No hover */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["None"] = 2] = "None";
})(DebugLinkHoverBehavior || (DebugLinkHoverBehavior = {}));
let LinkDetector = class LinkDetector {
    constructor(editorService, fileService, openerService, pathService, tunnelService, environmentService, configurationService, hoverService) {
        this.editorService = editorService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.pathService = pathService;
        this.tunnelService = tunnelService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        // noop
    }
    /**
     * Matches and handles web urls, absolute and relative file links in the string provided.
     * Returns <span/> element that wraps the processed string, where matched links are replaced by <a/>.
     * 'onclick' event is attached to all anchored links that opens them in the editor.
     * When splitLines is true, each line of the text, even if it contains no links, is wrapped in a <span>
     * and added as a child of the returned <span>.
     * If a `hoverBehavior` is passed, hovers may be added using the workbench hover service.
     * This should be preferred for new code where hovers are desirable.
     */
    linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights) {
        return this._linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights);
    }
    _linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights, defaultRef) {
        if (splitLines) {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
                lines[i] = lines[i] + '\n';
            }
            if (!lines[lines.length - 1]) {
                // Remove the last element ('') that split added.
                lines.pop();
            }
            const elements = lines.map(line => this._linkify(line, false, workspaceFolder, includeFulltext, hoverBehavior, highlights, defaultRef));
            if (elements.length === 1) {
                // Do not wrap single line with extra span.
                return elements[0];
            }
            const container = document.createElement('span');
            elements.forEach(e => container.appendChild(e));
            return container;
        }
        const container = document.createElement('span');
        for (const part of this.detectLinks(text)) {
            try {
                let node;
                switch (part.kind) {
                    case 'text':
                        node = defaultRef ? this.linkifyLocation(part.value, defaultRef.locationReference, defaultRef.session, hoverBehavior) : document.createTextNode(part.value);
                        break;
                    case 'web':
                        node = this.createWebLink(includeFulltext ? text : undefined, part.value, hoverBehavior);
                        break;
                    case 'path': {
                        const path = part.captures[0];
                        const lineNumber = part.captures[1] ? Number(part.captures[1]) : 0;
                        const columnNumber = part.captures[2] ? Number(part.captures[2]) : 0;
                        node = this.createPathLink(includeFulltext ? text : undefined, part.value, path, lineNumber, columnNumber, workspaceFolder, hoverBehavior);
                        break;
                    }
                    default:
                        node = document.createTextNode(part.value);
                }
                container.append(...this.applyHighlights(node, part.index, part.value.length, highlights));
            }
            catch (e) {
                container.appendChild(document.createTextNode(part.value));
            }
        }
        return container;
    }
    applyHighlights(node, startIndex, length, highlights) {
        const children = [];
        let currentIndex = startIndex;
        const endIndex = startIndex + length;
        for (const highlight of highlights || []) {
            if (highlight.end <= currentIndex || highlight.start >= endIndex) {
                continue;
            }
            if (highlight.start > currentIndex) {
                children.push(node.textContent.substring(currentIndex - startIndex, highlight.start - startIndex));
                currentIndex = highlight.start;
            }
            const highlightEnd = Math.min(highlight.end, endIndex);
            const highlightedText = node.textContent.substring(currentIndex - startIndex, highlightEnd - startIndex);
            const highlightSpan = document.createElement('span');
            highlightSpan.classList.add('highlight');
            if (highlight.extraClasses) {
                highlightSpan.classList.add(...highlight.extraClasses);
            }
            highlightSpan.textContent = highlightedText;
            children.push(highlightSpan);
            currentIndex = highlightEnd;
        }
        if (currentIndex === startIndex) {
            return Iterable.single(node); // no changes made
        }
        if (currentIndex < endIndex) {
            children.push(node.textContent.substring(currentIndex - startIndex));
        }
        // reuse the element if it's a link
        if (isHTMLElement(node)) {
            reset(node, ...children);
            return Iterable.single(node);
        }
        return children;
    }
    /**
     * Linkifies a location reference.
     */
    linkifyLocation(text, locationReference, session, hoverBehavior) {
        const link = this.createLink(text);
        this.decorateLink(link, undefined, text, hoverBehavior, async (preserveFocus) => {
            const location = await session.resolveLocationReference(locationReference);
            await location.source.openInEditor(this.editorService, {
                startLineNumber: location.line,
                startColumn: location.column,
                endLineNumber: location.endLine ?? location.line,
                endColumn: location.endColumn ?? location.column,
            }, preserveFocus);
        });
        return link;
    }
    /**
     * Makes an {@link ILinkDetector} that links everything in the output to the
     * reference if they don't have other explicit links.
     */
    makeReferencedLinkDetector(locationReference, session) {
        return {
            linkify: (text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights) => this._linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights, { locationReference, session }),
            linkifyLocation: this.linkifyLocation.bind(this),
        };
    }
    createWebLink(fulltext, url, hoverBehavior) {
        const link = this.createLink(url);
        let uri = URI.parse(url);
        // if the URI ends with something like `foo.js:12:3`, parse
        // that into a fragment to reveal that location (#150702)
        const lineCol = LINE_COLUMN_REGEX.exec(uri.path);
        if (lineCol) {
            uri = uri.with({
                path: uri.path.slice(0, lineCol.index),
                fragment: `L${lineCol[0].slice(1)}`
            });
        }
        this.decorateLink(link, uri, fulltext, hoverBehavior, async () => {
            if (uri.scheme === Schemas.file) {
                // Just using fsPath here is unsafe: https://github.com/microsoft/vscode/issues/109076
                const fsPath = uri.fsPath;
                const path = await this.pathService.path;
                const fileUrl = osPath.normalize(((path.sep === osPath.posix.sep) && platform.isWindows) ? fsPath.replace(/\\/g, osPath.posix.sep) : fsPath);
                const fileUri = URI.parse(fileUrl);
                const exists = await this.fileService.exists(fileUri);
                if (!exists) {
                    return;
                }
                await this.editorService.openEditor({
                    resource: fileUri,
                    options: {
                        pinned: true,
                        selection: lineCol ? { startLineNumber: +lineCol[1], startColumn: lineCol[2] ? +lineCol[2] : 1 } : undefined,
                    },
                });
                return;
            }
            this.openerService.open(url, { allowTunneling: (!!this.environmentService.remoteAuthority && this.configurationService.getValue('remote.forwardOnOpen')) });
        });
        return link;
    }
    createPathLink(fulltext, text, path, lineNumber, columnNumber, workspaceFolder, hoverBehavior) {
        if (path[0] === '/' && path[1] === '/') {
            // Most likely a url part which did not match, for example ftp://path.
            return document.createTextNode(text);
        }
        // Only set selection if we have a valid line number (greater than 0)
        const options = lineNumber > 0
            ? { selection: { startLineNumber: lineNumber, startColumn: columnNumber > 0 ? columnNumber : 1 } }
            : {};
        if (path[0] === '.') {
            if (!workspaceFolder) {
                return document.createTextNode(text);
            }
            const uri = workspaceFolder.toResource(path);
            const link = this.createLink(text);
            this.decorateLink(link, uri, fulltext, hoverBehavior, (preserveFocus) => this.editorService.openEditor({ resource: uri, options: { ...options, preserveFocus } }));
            return link;
        }
        if (path[0] === '~') {
            const userHome = this.pathService.resolvedUserHome;
            if (userHome) {
                path = osPath.join(userHome.fsPath, path.substring(1));
            }
        }
        const link = this.createLink(text);
        link.tabIndex = 0;
        const uri = URI.file(osPath.normalize(path));
        this.fileService.stat(uri).then(stat => {
            if (stat.isDirectory) {
                return;
            }
            this.decorateLink(link, uri, fulltext, hoverBehavior, (preserveFocus) => this.editorService.openEditor({ resource: uri, options: { ...options, preserveFocus } }));
        }).catch(() => {
            // If the uri can not be resolved we should not spam the console with error, remain quite #86587
        });
        return link;
    }
    createLink(text) {
        const link = document.createElement('a');
        link.textContent = text;
        return link;
    }
    decorateLink(link, uri, fulltext, hoverBehavior, onClick) {
        link.classList.add('link');
        const followLink = uri && this.tunnelService.canTunnel(uri) ? localize('followForwardedLink', "follow link using forwarded port") : localize('followLink', "follow link");
        const title = link.ariaLabel = fulltext
            ? (platform.isMacintosh ? localize('fileLinkWithPathMac', "Cmd + click to {0}\n{1}", followLink, fulltext) : localize('fileLinkWithPath', "Ctrl + click to {0}\n{1}", followLink, fulltext))
            : (platform.isMacintosh ? localize('fileLinkMac', "Cmd + click to {0}", followLink) : localize('fileLink', "Ctrl + click to {0}", followLink));
        if (hoverBehavior?.type === 0 /* DebugLinkHoverBehavior.Rich */) {
            hoverBehavior.store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), link, title));
        }
        else if (hoverBehavior?.type !== 2 /* DebugLinkHoverBehavior.None */) {
            link.title = title;
        }
        link.onmousemove = (event) => { link.classList.toggle('pointer', platform.isMacintosh ? event.metaKey : event.ctrlKey); };
        link.onmouseleave = () => link.classList.remove('pointer');
        link.onclick = (event) => {
            const selection = getWindow(link).getSelection();
            if (!selection || selection.type === 'Range') {
                return; // do not navigate when user is selecting
            }
            if (!(platform.isMacintosh ? event.metaKey : event.ctrlKey)) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            onClick(false);
        };
        link.onkeydown = e => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 3 /* KeyCode.Enter */ || event.keyCode === 10 /* KeyCode.Space */) {
                event.preventDefault();
                event.stopPropagation();
                onClick(event.keyCode === 10 /* KeyCode.Space */);
            }
        };
    }
    detectLinks(text) {
        if (text.length > MAX_LENGTH) {
            return [{ kind: 'text', value: text, captures: [], index: 0 }];
        }
        const regexes = [WEB_LINK_REGEX, PATH_LINK_REGEX];
        const kinds = ['web', 'path'];
        const result = [];
        const splitOne = (text, regexIndex, baseIndex) => {
            if (regexIndex >= regexes.length) {
                result.push({ value: text, kind: 'text', captures: [], index: baseIndex });
                return;
            }
            const regex = regexes[regexIndex];
            let currentIndex = 0;
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
                const stringBeforeMatch = text.substring(currentIndex, match.index);
                if (stringBeforeMatch) {
                    splitOne(stringBeforeMatch, regexIndex + 1, baseIndex + currentIndex);
                }
                const value = match[0];
                result.push({
                    value: value,
                    kind: kinds[regexIndex],
                    captures: match.slice(1),
                    index: baseIndex + match.index
                });
                currentIndex = match.index + value.length;
            }
            const stringAfterMatches = text.substring(currentIndex);
            if (stringAfterMatches) {
                splitOne(stringAfterMatches, regexIndex + 1, baseIndex + currentIndex);
            }
        };
        splitOne(text, 0, 0);
        return result;
    }
};
LinkDetector = __decorate([
    __param(0, IEditorService),
    __param(1, IFileService),
    __param(2, IOpenerService),
    __param(3, IPathService),
    __param(4, ITunnelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IConfigurationService),
    __param(7, IHoverService)
], LinkDetector);
export { LinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvbGlua0RldGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBR3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssTUFBTSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsTUFBTSxhQUFhLEdBQUcsZ0NBQWdDLENBQUM7QUFDdkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxNQUFNLENBQUMseURBQXlELEdBQUcsYUFBYSxHQUFHLGFBQWEsR0FBRyxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFFdkssTUFBTSxpQkFBaUIsR0FBRyw4REFBOEQsQ0FBQztBQUN6RixNQUFNLGlCQUFpQixHQUFHLCtEQUErRCxDQUFDO0FBQzFGLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksaUJBQWlCLENBQUMsTUFBTSxJQUFJLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDekYsTUFBTSxVQUFVLEdBQUcsdURBQXVELENBQUM7QUFDM0UseUVBQXlFO0FBQ3pFLE1BQU0sV0FBVyxHQUFHLHdDQUF3QyxDQUFDO0FBQzdELE1BQU0sZUFBZSxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUgsTUFBTSxpQkFBaUIsR0FBRyxvQ0FBb0MsQ0FBQztBQUUvRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFVeEIsTUFBTSxDQUFOLElBQWtCLHNCQVVqQjtBQVZELFdBQWtCLHNCQUFzQjtJQUN2Qyw2QkFBNkI7SUFDN0IsbUVBQUksQ0FBQTtJQUNKOzs7T0FHRztJQUNILHFFQUFLLENBQUE7SUFDTCxlQUFlO0lBQ2YsbUVBQUksQ0FBQTtBQUNMLENBQUMsRUFWaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQVV2QztBQVdNLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQVk7SUFDeEIsWUFDa0MsYUFBNkIsRUFDL0IsV0FBeUIsRUFDdkIsYUFBNkIsRUFDL0IsV0FBeUIsRUFDdkIsYUFBNkIsRUFDZixrQkFBZ0QsRUFDdkQsb0JBQTJDLEVBQ25ELFlBQTJCO1FBUDFCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMvQixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDL0IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ2YsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE4QjtRQUN2RCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRTNELE9BQU87SUFDUixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxPQUFPLENBQUMsSUFBWSxFQUFFLFVBQW9CLEVBQUUsZUFBa0MsRUFBRSxlQUF5QixFQUFFLGFBQThDLEVBQUUsVUFBeUI7UUFDbkwsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsVUFBb0IsRUFBRSxlQUFrQyxFQUFFLGVBQXlCLEVBQUUsYUFBOEMsRUFBRSxVQUF5QixFQUFFLFVBQWtFO1FBQ2hRLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0MsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDNUIsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5QixpREFBaUQ7Z0JBQ2pELEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNiLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3hJLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsMkNBQTJDO2dCQUMzQyxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQztnQkFDSixJQUFJLElBQVUsQ0FBQztnQkFDZixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxNQUFNO3dCQUNWLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQzVKLE1BQU07b0JBQ1AsS0FBSyxLQUFLO3dCQUNULElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQzt3QkFDekYsTUFBTTtvQkFDUCxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7d0JBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNuRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JFLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUM7d0JBQzNJLE1BQU07b0JBQ1AsQ0FBQztvQkFDRDt3QkFDQyxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdDLENBQUM7Z0JBRUQsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM1RixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixTQUFTLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDNUQsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU8sZUFBZSxDQUFDLElBQVUsRUFBRSxVQUFrQixFQUFFLE1BQWMsRUFBRSxVQUFvQztRQUMzRyxNQUFNLFFBQVEsR0FBc0IsRUFBRSxDQUFDO1FBQ3ZDLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDO1FBRXJDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQzFDLElBQUksU0FBUyxDQUFDLEdBQUcsSUFBSSxZQUFZLElBQUksU0FBUyxDQUFDLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDbEUsU0FBUztZQUNWLENBQUM7WUFFRCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7Z0JBQ3BDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsRUFBRSxTQUFTLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BHLFlBQVksR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQ2hDLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsRUFBRSxZQUFZLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDMUcsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRCxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN6QyxJQUFJLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDNUIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEQsQ0FBQztZQUNELGFBQWEsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQzVDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0IsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUM3QixDQUFDO1FBRUQsSUFBSSxZQUFZLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDakMsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsa0JBQWtCO1FBQ2pELENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxRQUFRLEVBQUUsQ0FBQztZQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFZLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6QixLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUM7WUFDekIsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxlQUFlLENBQUMsSUFBWSxFQUFFLGlCQUF5QixFQUFFLE9BQXNCLEVBQUUsYUFBOEM7UUFDOUgsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsYUFBc0IsRUFBRSxFQUFFO1lBQ3hGLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLHdCQUF3QixDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDM0UsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO2dCQUN0RCxlQUFlLEVBQUUsUUFBUSxDQUFDLElBQUk7Z0JBQzlCLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTTtnQkFDNUIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLElBQUk7Z0JBQ2hELFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxNQUFNO2FBQ2hELEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7O09BR0c7SUFDSCwwQkFBMEIsQ0FBQyxpQkFBeUIsRUFBRSxPQUFzQjtRQUMzRSxPQUFPO1lBQ04sT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUMxRixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDN0gsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztTQUNoRCxDQUFDO0lBQ0gsQ0FBQztJQUVPLGFBQWEsQ0FBQyxRQUE0QixFQUFFLEdBQVcsRUFBRSxhQUE4QztRQUM5RyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWxDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekIsMkRBQTJEO1FBQzNELHlEQUF5RDtRQUN6RCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDZCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUM7Z0JBQ3RDLFFBQVEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDbkMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBRWhFLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pDLHNGQUFzRjtnQkFDdEYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztnQkFDMUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztnQkFDekMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRTdJLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDYixPQUFPO2dCQUNSLENBQUM7Z0JBRUQsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztvQkFDbkMsUUFBUSxFQUFFLE9BQU87b0JBQ2pCLE9BQU8sRUFBRTt3QkFDUixNQUFNLEVBQUUsSUFBSTt3QkFDWixTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7cUJBQzVHO2lCQUNELENBQUMsQ0FBQztnQkFDSCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3SixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLGNBQWMsQ0FBQyxRQUE0QixFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsVUFBa0IsRUFBRSxZQUFvQixFQUFFLGVBQTZDLEVBQUUsYUFBOEM7UUFDdk4sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN4QyxzRUFBc0U7WUFDdEUsT0FBTyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxxRUFBcUU7UUFDckUsTUFBTSxPQUFPLEdBQUcsVUFBVSxHQUFHLENBQUM7WUFDN0IsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNsRyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRU4sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN0QixPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsQ0FBQztZQUNELE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxDQUFDLGFBQXNCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1SyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNyQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDO1lBQ25ELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEQsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN0QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdEIsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxDQUFDLGFBQXNCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3SyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ2IsZ0dBQWdHO1FBQ2pHLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sVUFBVSxDQUFDLElBQVk7UUFDOUIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTyxZQUFZLENBQUMsSUFBaUIsRUFBRSxHQUFvQixFQUFFLFFBQTRCLEVBQUUsYUFBeUQsRUFBRSxPQUF5QztRQUMvTCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzQixNQUFNLFVBQVUsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzFLLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUTtZQUN0QyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUseUJBQXlCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzVMLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUVoSixJQUFJLGFBQWEsRUFBRSxJQUFJLHdDQUFnQyxFQUFFLENBQUM7WUFDekQsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvRyxDQUFDO2FBQU0sSUFBSSxhQUFhLEVBQUUsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO1lBQ2hFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFILElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3hCLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQzlDLE9BQU8sQ0FBQyx5Q0FBeUM7WUFDbEQsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxPQUFPO1lBQ1IsQ0FBQztZQUVELEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN2QixLQUFLLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEIsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksS0FBSyxDQUFDLE9BQU8sMEJBQWtCLElBQUksS0FBSyxDQUFDLE9BQU8sMkJBQWtCLEVBQUUsQ0FBQztnQkFDeEUsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN2QixLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTywyQkFBa0IsQ0FBQyxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDLENBQUM7SUFDSCxDQUFDO0lBRU8sV0FBVyxDQUFDLElBQVk7UUFDL0IsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBYSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM1RCxNQUFNLEtBQUssR0FBZSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQyxNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7UUFFOUIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsVUFBa0IsRUFBRSxTQUFpQixFQUFFLEVBQUU7WUFDeEUsSUFBSSxVQUFVLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0JBQzNFLE9BQU87WUFDUixDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLEtBQUssQ0FBQztZQUNWLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM1QyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO29CQUN2QixRQUFRLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxHQUFHLENBQUMsRUFBRSxTQUFTLEdBQUcsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZFLENBQUM7Z0JBQ0QsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLEtBQUssRUFBRSxLQUFLO29CQUNaLElBQUksRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDO29CQUN2QixRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLEtBQUssRUFBRSxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUs7aUJBQzlCLENBQUMsQ0FBQztnQkFDSCxZQUFZLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQzNDLENBQUM7WUFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUN4QixRQUFRLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxHQUFHLENBQUMsRUFBRSxTQUFTLEdBQUcsWUFBWSxDQUFDLENBQUM7WUFDeEUsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNELENBQUE7QUFsVVksWUFBWTtJQUV0QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0dBVEgsWUFBWSxDQWtVeEIifQ==