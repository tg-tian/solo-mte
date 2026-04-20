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
import { SequencerByKey } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ChatContextKeys } from './chatContextKeys.js';
export var ChatMessageRole;
(function (ChatMessageRole) {
    ChatMessageRole[ChatMessageRole["System"] = 0] = "System";
    ChatMessageRole[ChatMessageRole["User"] = 1] = "User";
    ChatMessageRole[ChatMessageRole["Assistant"] = 2] = "Assistant";
})(ChatMessageRole || (ChatMessageRole = {}));
export var LanguageModelPartAudience;
(function (LanguageModelPartAudience) {
    LanguageModelPartAudience[LanguageModelPartAudience["Assistant"] = 0] = "Assistant";
    LanguageModelPartAudience[LanguageModelPartAudience["User"] = 1] = "User";
    LanguageModelPartAudience[LanguageModelPartAudience["Extension"] = 2] = "Extension";
})(LanguageModelPartAudience || (LanguageModelPartAudience = {}));
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
/**
 * Specifies the detail level of the image.
 */
export var ImageDetailLevel;
(function (ImageDetailLevel) {
    ImageDetailLevel["Low"] = "low";
    ImageDetailLevel["High"] = "high";
})(ImageDetailLevel || (ImageDetailLevel = {}));
export var ILanguageModelChatMetadata;
(function (ILanguageModelChatMetadata) {
    function suitableForAgentMode(metadata) {
        const supportsToolsAgent = typeof metadata.capabilities?.agentMode === 'undefined' || metadata.capabilities.agentMode;
        return supportsToolsAgent && !!metadata.capabilities?.toolCalling;
    }
    ILanguageModelChatMetadata.suitableForAgentMode = suitableForAgentMode;
    function asQualifiedName(metadata) {
        return `${metadata.name} (${metadata.vendor})`;
    }
    ILanguageModelChatMetadata.asQualifiedName = asQualifiedName;
    function matchesQualifiedName(name, metadata) {
        if (metadata.vendor === 'copilot' && name === metadata.name) {
            return true;
        }
        return name === asQualifiedName(metadata);
    }
    ILanguageModelChatMetadata.matchesQualifiedName = matchesQualifiedName;
})(ILanguageModelChatMetadata || (ILanguageModelChatMetadata = {}));
export function isILanguageModelChatSelector(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return ((obj.name === undefined || typeof obj.name === 'string') &&
        (obj.id === undefined || typeof obj.id === 'string') &&
        (obj.vendor === undefined || typeof obj.vendor === 'string') &&
        (obj.version === undefined || typeof obj.version === 'string') &&
        (obj.family === undefined || typeof obj.family === 'string') &&
        (obj.tokens === undefined || typeof obj.tokens === 'number') &&
        (obj.extension === undefined || typeof obj.extension === 'object'));
}
export const ILanguageModelsService = createDecorator('ILanguageModelsService');
const languageModelChatProviderType = {
    type: 'object',
    required: ['vendor', 'displayName'],
    properties: {
        vendor: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.vendor', "A globally unique vendor of language model chat provider.")
        },
        displayName: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.displayName', "The display name of the language model chat provider.")
        },
        managementCommand: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.managementCommand', "A command to manage the language model chat provider, e.g. 'Manage Copilot models'. This is used in the chat model picker. If not provided, a gear icon is not rendered during vendor selection.")
        },
        when: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.when', "Condition which must be true to show this language model chat provider in the Manage Models list.")
        }
    }
};
export const languageModelChatProviderExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelChatProviders',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languageModelChatProviders', "Contribute language model chat providers of a specific vendor."),
        oneOf: [
            languageModelChatProviderType,
            {
                type: 'array',
                items: languageModelChatProviderType
            }
        ]
    },
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            yield `onLanguageModelChatProvider:${contrib.vendor}`;
        }
    }
});
let LanguageModelsService = class LanguageModelsService {
    constructor(_extensionService, _logService, _storageService, _contextKeyService, _configurationService, _chatEntitlementService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._configurationService = _configurationService;
        this._chatEntitlementService = _chatEntitlementService;
        this._store = new DisposableStore();
        this._providers = new Map();
        this._modelCache = new Map();
        this._vendors = new Map();
        this._resolveLMSequencer = new SequencerByKey();
        this._modelPickerUserPreferences = {};
        this._onLanguageModelChange = this._store.add(new Emitter());
        this.onDidChangeLanguageModels = this._onLanguageModelChange.event;
        this._hasUserSelectableModels = ChatContextKeys.languageModelsAreUserSelectable.bindTo(_contextKeyService);
        this._contextKeyService = _contextKeyService;
        this._modelPickerUserPreferences = this._storageService.getObject('chatModelPickerPreferences', 0 /* StorageScope.PROFILE */, this._modelPickerUserPreferences);
        // TODO @lramos15 - Remove after a few releases, as this is just cleaning a bad storage state
        const entitlementChangeHandler = () => {
            if ((this._chatEntitlementService.entitlement === ChatEntitlement.Business || this._chatEntitlementService.entitlement === ChatEntitlement.Enterprise) && !this._chatEntitlementService.isInternal) {
                this._modelPickerUserPreferences = {};
                this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        };
        entitlementChangeHandler();
        this._store.add(this._chatEntitlementService.onDidChangeEntitlement(entitlementChangeHandler));
        this._store.add(this.onDidChangeLanguageModels(() => {
            this._hasUserSelectableModels.set(this._modelCache.size > 0 && Array.from(this._modelCache.values()).some(model => model.isUserSelectable));
        }));
        this._store.add(languageModelChatProviderExtensionPoint.setHandler((extensions) => {
            this._vendors.clear();
            for (const extension of extensions) {
                for (const item of Iterable.wrap(extension.value)) {
                    if (this._vendors.has(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.vendorAlreadyRegistered', "The vendor '{0}' is already registered and cannot be registered twice", item.vendor));
                        continue;
                    }
                    if (isFalsyOrWhitespace(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.emptyVendor', "The vendor field cannot be empty."));
                        continue;
                    }
                    if (item.vendor.trim() !== item.vendor) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.whitespaceVendor', "The vendor field cannot start or end with whitespace."));
                        continue;
                    }
                    this._vendors.set(item.vendor, item);
                    // Have some models we want from this vendor, so activate the extension
                    if (this._hasStoredModelForVendor(item.vendor)) {
                        this._extensionService.activateByEvent(`onLanguageModelChatProvider:${item.vendor}`);
                    }
                }
            }
            for (const [vendor, _] of this._providers) {
                if (!this._vendors.has(vendor)) {
                    this._providers.delete(vendor);
                }
            }
        }));
    }
    _hasStoredModelForVendor(vendor) {
        return Object.keys(this._modelPickerUserPreferences).some(modelId => {
            return modelId.startsWith(vendor);
        });
    }
    dispose() {
        this._store.dispose();
        this._providers.clear();
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        const model = this._modelCache.get(modelIdentifier);
        if (!model) {
            this._logService.warn(`[LM] Cannot update model picker preference for unknown model ${modelIdentifier}`);
            return;
        }
        this._modelPickerUserPreferences[modelIdentifier] = showInModelPicker;
        if (showInModelPicker === model.isUserSelectable) {
            delete this._modelPickerUserPreferences[modelIdentifier];
            this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        else if (model.isUserSelectable !== showInModelPicker) {
            this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        this._onLanguageModelChange.fire(model.vendor);
        this._logService.trace(`[LM] Updated model picker preference for ${modelIdentifier} to ${showInModelPicker}`);
    }
    getVendors() {
        return Array.from(this._vendors.values()).filter(vendor => {
            if (!vendor.when) {
                return true; // No when clause means always visible
            }
            const whenClause = ContextKeyExpr.deserialize(vendor.when);
            return whenClause ? this._contextKeyService.contextMatchesRules(whenClause) : false;
        });
    }
    getLanguageModelIds() {
        return Array.from(this._modelCache.keys());
    }
    lookupLanguageModel(modelIdentifier) {
        const model = this._modelCache.get(modelIdentifier);
        if (model && this._configurationService.getValue('chat.experimentalShowAllModels')) {
            return { ...model, isUserSelectable: true };
        }
        if (model && this._modelPickerUserPreferences[modelIdentifier] !== undefined) {
            return { ...model, isUserSelectable: this._modelPickerUserPreferences[modelIdentifier] };
        }
        return model;
    }
    _clearModelCache(vendor) {
        for (const [id, model] of this._modelCache.entries()) {
            if (model.vendor === vendor) {
                this._modelCache.delete(id);
            }
        }
    }
    async _resolveLanguageModels(vendor, silent) {
        // Activate extensions before requesting to resolve the models
        await this._extensionService.activateByEvent(`onLanguageModelChatProvider:${vendor}`);
        const provider = this._providers.get(vendor);
        if (!provider) {
            this._logService.warn(`[LM] No provider registered for vendor ${vendor}`);
            return;
        }
        return this._resolveLMSequencer.queue(vendor, async () => {
            try {
                let modelsAndIdentifiers = await provider.provideLanguageModelChatInfo({ silent }, CancellationToken.None);
                // This is a bit of a hack, when prompting user if the provider returns any models that are user selectable then we only want to show those and not the entire model list
                if (!silent && modelsAndIdentifiers.some(m => m.metadata.isUserSelectable)) {
                    modelsAndIdentifiers = modelsAndIdentifiers.filter(m => m.metadata.isUserSelectable || this._modelPickerUserPreferences[m.identifier] === true);
                }
                this._clearModelCache(vendor);
                for (const modelAndIdentifier of modelsAndIdentifiers) {
                    if (this._modelCache.has(modelAndIdentifier.identifier)) {
                        this._logService.warn(`[LM] Model ${modelAndIdentifier.identifier} is already registered. Skipping.`);
                        continue;
                    }
                    this._modelCache.set(modelAndIdentifier.identifier, modelAndIdentifier.metadata);
                }
                this._logService.trace(`[LM] Resolved language models for vendor ${vendor}`, modelsAndIdentifiers);
            }
            catch (error) {
                this._logService.error(`[LM] Error resolving language models for vendor ${vendor}:`, error);
            }
            this._onLanguageModelChange.fire(vendor);
        });
    }
    async selectLanguageModels(selector, allowPromptingUser) {
        if (selector.vendor) {
            await this._resolveLanguageModels(selector.vendor, !allowPromptingUser);
        }
        else {
            const allVendors = Array.from(this._vendors.keys());
            await Promise.all(allVendors.map(vendor => this._resolveLanguageModels(vendor, !allowPromptingUser)));
        }
        const result = [];
        for (const [internalModelIdentifier, model] of this._modelCache) {
            if ((selector.vendor === undefined || model.vendor === selector.vendor)
                && (selector.family === undefined || model.family === selector.family)
                && (selector.version === undefined || model.version === selector.version)
                && (selector.id === undefined || model.id === selector.id)) {
                result.push(internalModelIdentifier);
            }
        }
        this._logService.trace('[LM] selected language models', selector, result);
        return result;
    }
    registerLanguageModelProvider(vendor, provider) {
        this._logService.trace('[LM] registering language model provider', vendor, provider);
        if (!this._vendors.has(vendor)) {
            throw new Error(`Chat model provider uses UNKNOWN vendor ${vendor}.`);
        }
        if (this._providers.has(vendor)) {
            throw new Error(`Chat model provider for vendor ${vendor} is already registered.`);
        }
        this._providers.set(vendor, provider);
        if (this._hasStoredModelForVendor(vendor)) {
            this._resolveLanguageModels(vendor, true);
        }
        const modelChangeListener = provider.onDidChange(async () => {
            await this._resolveLanguageModels(vendor, true);
        });
        return toDisposable(() => {
            this._logService.trace('[LM] UNregistered language model provider', vendor);
            this._clearModelCache(vendor);
            this._providers.delete(vendor);
            modelChangeListener.dispose();
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async sendChatRequest(modelId, from, messages, options, token) {
        const provider = this._providers.get(this._modelCache.get(modelId)?.vendor || '');
        if (!provider) {
            throw new Error(`Chat provider for model ${modelId} is not registered.`);
        }
        return provider.sendChatRequest(modelId, messages, from, options, token);
    }
    computeTokenLength(modelId, message, token) {
        const model = this._modelCache.get(modelId);
        if (!model) {
            throw new Error(`Chat model ${modelId} could not be found.`);
        }
        const provider = this._providers.get(model.vendor);
        if (!provider) {
            throw new Error(`Chat provider for model ${modelId} is not registered.`);
        }
        return provider.provideTokenCount(modelId, message, token);
    }
};
LanguageModelsService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IChatEntitlementService)
], LanguageModelsService);
export { LanguageModelsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vbGFuZ3VhZ2VNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUd6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXZILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLHVCQUF1QixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDbkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0Ys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