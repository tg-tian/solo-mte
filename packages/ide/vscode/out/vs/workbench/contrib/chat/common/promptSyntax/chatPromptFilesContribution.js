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
import { localize } from '../../../../../nls.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { joinPath, isEqualOrParent } from '../../../../../base/common/resources.js';
import { IPromptsService } from './service/promptsService.js';
import { PromptsType } from './promptTypes.js';
import { DisposableMap } from '../../../../../base/common/lifecycle.js';
function registerChatFilesExtensionPoint(point) {
    return extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: point,
        jsonSchema: {
            description: localize('chatContribution.schema.description', 'Contributes {0} for chat prompts.', point),
            type: 'array',
            items: {
                additionalProperties: false,
                type: 'object',
                defaultSnippets: [{
                        body: {
                            path: './relative/path/to/file.md',
                        }
                    }],
                required: ['path'],
                properties: {
                    path: {
                        description: localize('chatContribution.property.path', 'Path to the file relative to the extension root.'),
                        type: 'string'
                    },
                    name: {
                        description: localize('chatContribution.property.name', '(Optional) Name for this entry.'),
                        deprecationMessage: localize('chatContribution.property.name.deprecated', 'Specify "name" in the prompt file itself instead.'),
                        type: 'string'
                    },
                    description: {
                        description: localize('chatContribution.property.description', '(Optional) Description of the entry.'),
                        deprecationMessage: localize('chatContribution.property.description.deprecated', 'Specify "description" in the prompt file itself instead.'),
                        type: 'string'
                    }
                }
            }
        }
    });
}
const epPrompt = registerChatFilesExtensionPoint('chatPromptFiles');
const epInstructions = registerChatFilesExtensionPoint('chatInstructions');
const epAgents = registerChatFilesExtensionPoint('chatAgents');
function pointToType(contributionPoint) {
    switch (contributionPoint) {
        case 'chatPromptFiles': return PromptsType.prompt;
        case 'chatInstructions': return PromptsType.instructions;
        case 'chatAgents': return PromptsType.agent;
    }
}
function key(extensionId, type, path) {
    return `${extensionId.value}/${type}/${path}`;
}
let ChatPromptFilesExtensionPointHandler = class ChatPromptFilesExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatPromptFilesExtensionPointHandler'; }
    constructor(promptsService) {
        this.promptsService = promptsService;
        this.registrations = new DisposableMap();
        this.handle(epPrompt, 'chatPromptFiles');
        this.handle(epInstructions, 'chatInstructions');
        this.handle(epAgents, 'chatAgents');
    }
    handle(extensionPoint, contributionPoint) {
        extensionPoint.setHandler((_extensions, delta) => {
            for (const ext of delta.added) {
                const type = pointToType(contributionPoint);
                for (const raw of ext.value) {
                    if (!raw.path) {
                        ext.collector.error(localize('extension.missing.path', "Extension '{0}' cannot register {1} entry without path.", ext.description.identifier.value, contributionPoint));
                        continue;
                    }
                    const fileUri = joinPath(ext.description.extensionLocation, raw.path);
                    if (!isEqualOrParent(fileUri, ext.description.extensionLocation)) {
                        ext.collector.error(localize('extension.invalid.path', "Extension '{0}' {1} entry '{2}' resolves outside the extension.", ext.description.identifier.value, contributionPoint, raw.path));
                        continue;
                    }
                    try {
                        const d = this.promptsService.registerContributedFile(type, fileUri, ext.description, raw.name, raw.description);
                        this.registrations.set(key(ext.description.identifier, type, raw.path), d);
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        ext.collector.error(localize('extension.registration.failed', "Extension '{0}' {1}. Failed to register {2}: {3}", ext.description.identifier.value, contributionPoint, raw.path, msg));
                    }
                }
            }
            for (const ext of delta.removed) {
                const type = pointToType(contributionPoint);
                for (const raw of ext.value) {
                    this.registrations.deleteAndDispose(key(ext.description.identifier, type, raw.path));
                }
            }
        });
    }
};
ChatPromptFilesExtensionPointHandler = __decorate([
    __param(0, IPromptsService)
], ChatPromptFilesExtensionPointHandler);
export { ChatPromptFilesExtensionPointHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEZpbGVzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jaGF0UHJvbXB0RmlsZXNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sS0FBSyxrQkFBa0IsTUFBTSw4REFBOEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBVXhFLFNBQVMsK0JBQStCLENBQUMsS0FBNEI7SUFDcEUsT0FBTyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBNkI7UUFDL0YsY0FBYyxFQUFFLEtBQUs7UUFDckIsVUFBVSxFQUFFO1lBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxtQ0FBbUMsRUFBRSxLQUFLLENBQUM7WUFDeEcsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUU7Z0JBQ04sb0JBQW9CLEVBQUUsS0FBSztnQkFDM0IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsZUFBZSxFQUFFLENBQUM7d0JBQ2pCLElBQUksRUFBRTs0QkFDTCxJQUFJLEVBQUUsNEJBQTRCO3lCQUNsQztxQkFDRCxDQUFDO2dCQUNGLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztnQkFDbEIsVUFBVSxFQUFFO29CQUNYLElBQUks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