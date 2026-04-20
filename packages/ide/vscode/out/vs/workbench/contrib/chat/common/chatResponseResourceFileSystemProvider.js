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
import { decodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { newWriteableStream } from '../../../../base/common/stream.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, FileType, IFileService } from '../../../../platform/files/common/files.js';
import { ChatResponseResource } from './chatModel.js';
import { IChatService, IChatToolInvocation } from './chatService.js';
import { isToolResultInputOutputDetails } from './languageModelToolsService.js';
let ChatResponseResourceFileSystemProvider = class ChatResponseResourceFileSystemProvider extends Disposable {
    static { this.ID = 'workbench.contrib.chatResponseResourceFileSystemProvider'; }
    constructor(chatService, _fileService) {
        super();
        this.chatService = chatService;
        this._fileService = _fileService;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
        this.capabilities = 0 /* FileSystemProviderCapabilities.None */
            | 2048 /* FileSystemProviderCapabilities.Readonly */
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */
            | 16 /* FileSystemProviderCapabilities.FileReadStream */
            | 16384 /* FileSystemProviderCapabilities.FileAtomicRead */
            | 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this._register(this._fileService.registerProvider(ChatResponseResource.scheme, this));
    }
    readFile(resource) {
        return Promise.resolve(this.lookupURI(resource));
    }
    readFileStream(resource) {
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        Promise.resolve(this.lookupURI(resource)).then(v => stream.end(v));
        return stream;
    }
    async stat(resource) {
        const r = await this.lookupURI(resource);
        return {
            type: FileType.File,
            ctime: 0,
            mtime: 0,
            size: r.length,
        };
    }
    delete() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    watch() {
        return Disposable.None;
    }
    mkdir() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    readdir() {
        return Promise.resolve([]);
    }
    rename() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    writeFile() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    findMatchingInvocation(uri) {
        const parsed = ChatResponseResource.parseUri(uri);
        if (!parsed) {
            throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        const { sessionResource, toolCallId, index } = parsed;
        const session = this.chatService.getSession(sessionResource);
        if (!session) {
            throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        const requests = session.getRequests();
        for (let k = requests.length - 1; k >= 0; k--) {
            const req = requests[k];
            const tc = req.response?.entireResponse.value.find((r) => (r.kind === 'toolInvocation' || r.kind === 'toolInvocationSerialized') && r.toolCallId === toolCallId);
            if (tc) {
                return { result: tc, index };
            }
        }
        throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
    }
    lookupURI(uri) {
        const { result, index } = this.findMatchingInvocation(uri);
        const details = IChatToolInvocation.resultDetails(result);
        if (!isToolResultInputOutputDetails(details)) {
            throw createFileSystemProviderError(`Tool does not have I/O`, FileSystemProviderErrorCode.FileNotFound);
        }
        const part = details.output.at(index);
        if (!part) {
            throw createFileSystemProviderError(`Tool does not have part`, FileSystemProviderErrorCode.FileNotFound);
        }
        if (part.type === 'ref') {
            return this._fileService.readFile(part.uri).then(r => r.value.buffer);
        }
        return part.isText ? new TextEncoder().encode(part.value) : decodeBase64(part.value).buffer;
    }
};
ChatResponseResourceFileSystemProvider = __decorate([
    __param(0, IChatService),
    __param(1, IFileService)
], ChatResponseResourceFileSystemProvider);
export { ChatResponseResourceFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlc3BvbnNlUmVzb3VyY2VGaWxlU3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFJlc3BvbnNlUmVzb3VyY2VGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBd0IsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RixPQUFPLEVBQUUsNkJBQTZCLEVBQWtDLDJCQUEyQixFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQTJKLE1BQU0sNENBQTRDLENBQUM7QUFFelUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFlBQVksRUFBRSxtQkFBbUIsRUFBaUMsTUFBTSxrQkFBa0IsQ0FBQztBQUNwRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RSxJQUFNLHNDQUFzQyxHQUE1QyxNQUFNLHNDQUF1QyxTQUFRLFVBQVU7YUFNOUMsT0FBRSxHQUFHLDBEQUEwRCxBQUE3RCxDQUE4RDtJQVl2RixZQUNlLFdBQTBDLEVBQzFDLFlBQTJDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBSHVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBWjFDLDRCQUF1QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDckMsb0JBQWUsR0FB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