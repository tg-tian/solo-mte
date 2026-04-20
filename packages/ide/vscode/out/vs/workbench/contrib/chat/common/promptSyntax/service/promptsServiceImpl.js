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
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../../base/common/map.js';
import { dirname, isEqual } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { OffsetRange } from '../../../../../../editor/common/core/ranges/offsetRange.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { FileOperationError, IFileService } from '../../../../../../platform/files/common/files.js';
import { IExtensionService } from '../../../../../services/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IFilesConfigurationService } from '../../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { PromptsConfig } from '../config/config.js';
import { IDefaultAccountService } from '../../../../../../platform/defaultAccount/common/defaultAccount.js';
import { getCleanPromptName } from '../config/promptFileLocations.js';
import { PROMPT_LANGUAGE_ID, PromptsType, getPromptsTypeForLanguageId } from '../promptTypes.js';
import { PromptFilesLocator } from '../utils/promptFilesLocator.js';
import { PromptFileParser, PromptHeaderAttributes } from '../promptFileParser.js';
import { PromptsStorage, ExtensionAgentSourceType, CUSTOM_AGENTS_PROVIDER_ACTIVATION_EVENT } from './promptsService.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Schemas } from '../../../../../../base/common/network.js';
/**
 * Provides prompt services.
 */
let PromptsService = class PromptsService extends Disposable {
    constructor(logger, labelService, modelService, instantiationService, userDataService, configurationService, fileService, filesConfigService, storageService, extensionService, defaultAccountService, telemetryService) {
        super();
        this.logger = logger;
        this.labelService = labelService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.userDataService = userDataService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.filesConfigService = filesConfigService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.defaultAccountService = defaultAccountService;
        this.telemetryService = telemetryService;
        /**
         * Cache for parsed prompt files keyed by URI.
         * The number in the returned tuple is textModel.getVersionId(), which is an internal VS Code counter that increments every time the text model's content changes.
         */
        this.cachedParsedPromptFromModels = new ResourceMap();
        /**
         * Cached file locations commands. Caching only happens if the corresponding `fileLocatorEvents` event is used.
         */
        this.cachedFileLocations = {};
        /**
         * Lazily created events that notify listeners when the file locations for a given prompt type change.
         * An event is created on demand for each prompt type and can be used by consumers to react to updates
         * in the set of prompt files (e.g., when prompt files are added, removed, or modified).
         */
        this.fileLocatorEvents = {};
        /**
         * Contributed files from extensions keyed by prompt type then name.
         */
        this.contributedFiles = {
            [PromptsType.prompt]: new ResourceMap(),
            [PromptsType.instructions]: new ResourceMap(),
            [PromptsType.agent]: new ResourceMap(),
        };
        /**
         * Registry of CustomAgentsProvider instances. Extensions can register providers via the proposed API.
         */
        this.customAgentsProviders = [];
        // --- Enabled Prompt Files -----------------------------------------------------------
        this.disabledPromptsStorageKeyPrefix = 'chat.disabledPromptFiles.';
        this.fileLocator = this.instantiationService.createInstance(PromptFilesLocator);
        this._register(this.modelService.onModelRemoved((model) => {
            this.cachedParsedPromptFromModels.delete(model.uri);
        }));
        const modelChangeEvent = this._register(new ModelChangeTracker(this.modelService)).onDidPromptChange;
        this.cachedCustomAgents = this._register(new CachedPromise((token) => this.computeCustomAgents(token), () => Event.any(this.getFileLocatorEvent(PromptsType.agent), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.agent))));
        this.cachedSlashCommands = this._register(new CachedPromise((token) => this.computePromptSlashCommands(token), () => Event.any(this.getFileLocatorEvent(PromptsType.prompt), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.prompt))));
    }
    getFileLocatorEvent(type) {
        let event = this.fileLocatorEvents[type];
        if (!event) {
            event = this.fileLocatorEvents[type] = this._register(this.fileLocator.createFilesUpdatedEvent(type)).event;
            this._register(event(() => {
                this.cachedFileLocations[type] = undefined;
            }));
        }
        return event;
    }
    getParsedPromptFile(textModel) {
        const cached = this.cachedParsedPromptFromModels.get(textModel.uri);
        if (cached && cached[0] === textModel.getVersionId()) {
            return cached[1];
        }
        const ast = new PromptFileParser().parse(textModel.uri, textModel.getValue());
        if (!cached || cached[0] < textModel.getVersionId()) {
            this.cachedParsedPromptFromModels.set(textModel.uri, [textModel.getVersionId(), ast]);
        }
        return ast;
    }
    async listPromptFiles(type, token) {
        let listPromise = this.cachedFileLocations[type];
        if (!listPromise) {
            listPromise = this.computeListPromptFiles(type, token);
            if (!this.fileLocatorEvents[type]) {
                return listPromise;
            }
            this.cachedFileLocations[type] = listPromise;
            return listPromise;
        }
        return listPromise;
    }
    async computeListPromptFiles(type, token) {
        const prompts = await Promise.all([
            this.fileLocator.listFiles(type, PromptsStorage.user, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.user, type }))),
            this.fileLocator.listFiles(type, PromptsStorage.local, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.local, type }))),
            this.getExtensionPromptFiles(type, token),
        ]);
        return [...prompts.flat()];
    }
    /**
     * Registers a CustomAgentsProvider. This will be called by the extension host bridge when
     * an extension registers a provider via vscode.chat.registerCustomAgentsProvider().
     */
    registerCustomAgentsProvider(extension, provider) {
        const providerEntry = { extension, ...provider };
        this.customAgentsProviders.push(providerEntry);
        const disposables = new DisposableStore();
        // Listen to provider change events to rerun computeListPromptFiles
        if (provider.onDidChangeCustomAgents) {
            disposables.add(provider.onDidChangeCustomAgents(() => {
                this.cachedFileLocations[PromptsType.agent] = undefined;
                this.cachedCustomAgents.refresh();
            }));
        }
        // Invalidate agent cache when providers change
        this.cachedFileLocations[PromptsType.agent] = undefined;
        this.cachedCustomAgents.refresh();
        disposables.add({
            dispose: () => {
                const index = this.customAgentsProviders.findIndex((p) => p === providerEntry);
                if (index >= 0) {
                    this.customAgentsProviders.splice(index, 1);
                    this.cachedFileLocations[PromptsType.agent] = undefined;
                    this.cachedCustomAgents.refresh();
                }
            }
        });
        return disposables;
    }
    async listCustomAgentsFromProvider(token) {
        const result = [];
        if (this.customAgentsProviders.length === 0) {
            return result;
        }
        // Activate extensions that might provide custom agents
        await this.extensionService.activateByEvent(CUSTOM_AGENTS_PROVIDER_ACTIVATION_EVENT);
        // Collect agents from all providers
        for (const providerEntry of this.customAgentsProviders) {
            try {
                const agents = await providerEntry.provideCustomAgents({}, token);
                if (!agents || token.isCancellationRequested) {
                    continue;
                }
                for (const agent of agents) {
                    if (!agent.isEditable) {
                        try {
                            await this.filesConfigService.updateReadonly(agent.uri, true);
                        }
                        catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            this.logger.error(`[listCustomAgentsFromProvider] Failed to make agent file readonly: ${agent.uri}`, msg);
                        }
                    }
                    result.push({
                        uri: agent.uri,
                        name: agent.name,
                        description: agent.description,
                        storage: PromptsStorage.extension,
                        type: PromptsType.agent,
                        extension: providerEntry.extension,
                        source: ExtensionAgentSourceType.provider
                    });
                }
            }
            catch (e) {
                this.logger.error(`[listCustomAgentsFromProvider] Failed to get custom agents from provider`, e instanceof Error ? e.message : String(e));
            }
        }
        return result;
    }
    async listPromptFilesForStorage(type, storage, token) {
        switch (storage) {
            case PromptsStorage.extension:
                return this.getExtensionPromptFiles(type, token);
            case PromptsStorage.local:
                return this.fileLocator.listFiles(type, PromptsStorage.local, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.local, type })));
            case PromptsStorage.user:
                return this.fileLocator.listFiles(type, PromptsStorage.user, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.user, type })));
            default:
                throw new Error(`[listPromptFilesForStorage] Unsupported prompt storage type: ${storage}`);
        }
    }
    async getExtensionPromptFiles(type, token) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const contributedFiles = await Promise.all(this.contributedFiles[type].values());
        if (type === PromptsType.agent) {
            const providerAgents = await this.listCustomAgentsFromProvider(token);
            return [...contributedFiles, ...providerAgents];
        }
        return contributedFiles;
    }
    getSourceFolders(type) {
        const result = [];
        if (type === PromptsType.agent) {
            const folders = this.fileLocator.getAgentSourceFolder();
            for (const uri of folders) {
                result.push({ uri, storage: PromptsStorage.local, type });
            }
        }
        else {
            for (const uri of this.fileLocator.getConfigBasedSourceFolders(type)) {
                result.push({ uri, storage: PromptsStorage.local, type });
            }
        }
        const userHome = this.userDataService.currentProfile.promptsHome;
        result.push({ uri: userHome, storage: PromptsStorage.user, type });
        return result;
    }
    // slash prompt commands
    /**
     * Emitter for slash commands change events.
     */
    get onDidChangeSlashCommands() {
        return this.cachedSlashCommands.onDidChange;
    }
    async getPromptSlashCommands(token) {
        return this.cachedSlashCommands.get(token);
    }
    async computePromptSlashCommands(token) {
        const promptFiles = await this.listPromptFiles(PromptsType.prompt, token);
        const details = await Promise.all(promptFiles.map(async (promptPath) => {
            try {
                const parsedPromptFile = await this.parseNew(promptPath.uri, token);
                return this.asChatPromptSlashCommand(parsedPromptFile, promptPath);
            }
            catch (e) {
                this.logger.error(`[computePromptSlashCommands] Failed to parse prompt file for slash command: ${promptPath.uri}`, e instanceof Error ? e.message : String(e));
                return undefined;
            }
        }));
        const result = [];
        const seen = new ResourceSet();
        for (const detail of details) {
            if (detail) {
                result.push(detail);
                seen.add(detail.promptPath.uri);
            }
        }
        for (const model of this.modelService.getModels()) {
            if (model.getLanguageId() === PROMPT_LANGUAGE_ID && model.uri.scheme === Schemas.untitled && !seen.has(model.uri)) {
                const parsedPromptFile = this.getParsedPromptFile(model);
                result.push(this.asChatPromptSlashCommand(parsedPromptFile, { uri: model.uri, storage: PromptsStorage.local, type: PromptsType.prompt }));
            }
        }
        return result;
    }
    isValidSlashCommandName(command) {
        return command.match(/^[\p{L}\d_\-\.]+$/u) !== null;
    }
    async resolvePromptSlashCommand(name, token) {
        const commands = await this.getPromptSlashCommands(token);
        return commands.find(cmd => cmd.name === name);
    }
    asChatPromptSlashCommand(parsedPromptFile, promptPath) {
        let name = parsedPromptFile?.header?.name ?? promptPath.name ?? getCleanPromptName(promptPath.uri);
        name = name.replace(/[^\p{L}\d_\-\.]+/gu, '-'); // replace spaces with dashes
        return {
            name: name,
            description: parsedPromptFile?.header?.description ?? promptPath.description,
            argumentHint: parsedPromptFile?.header?.argumentHint,
            parsedPromptFile,
            promptPath
        };
    }
    async getPromptSlashCommandName(uri, token) {
        const slashCommands = await this.getPromptSlashCommands(token);
        const slashCommand = slashCommands.find(c => isEqual(c.promptPath.uri, uri));
        if (!slashCommand) {
            return getCleanPromptName(uri);
        }
        return slashCommand.name;
    }
    // custom agents
    /**
     * Emitter for custom agents change events.
     */
    get onDidChangeCustomAgents() {
        return this.cachedCustomAgents.onDidChange;
    }
    async getCustomAgents(token) {
        return this.cachedCustomAgents.get(token);
    }
    async computeCustomAgents(token) {
        let agentFiles = await this.listPromptFiles(PromptsType.agent, token);
        const disabledAgents = this.getDisabledPromptFiles(PromptsType.agent);
        agentFiles = agentFiles.filter(promptPath => !disabledAgents.has(promptPath.uri));
        const customAgentsResults = await Promise.allSettled(agentFiles.map(async (promptPath) => {
            const uri = promptPath.uri;
            const ast = await this.parseNew(uri, token);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let metadata;
            if (ast.header) {
                const advanced = ast.header.getAttribute(PromptHeaderAttributes.advancedOptions);
                if (advanced && advanced.value.type === 'object') {
                    metadata = {};
                    for (const [key, value] of Object.entries(advanced.value)) {
                        if (['string', 'number', 'boolean'].includes(value.type)) {
                            metadata[key] = value;
                        }
                    }
                }
            }
            const toolReferences = [];
            if (ast.body) {
                const bodyOffset = ast.body.offset;
                const bodyVarRefs = ast.body.variableReferences;
                for (let i = bodyVarRefs.length - 1; i >= 0; i--) { // in reverse order
                    const { name, offset } = bodyVarRefs[i];
                    const range = new OffsetRange(offset - bodyOffset, offset - bodyOffset + name.length + 1);
                    toolReferences.push({ name, range });
                }
            }
            const agentInstructions = {
                content: ast.body?.getContent() ?? '',
                toolReferences,
                metadata,
            };
            const name = ast.header?.name ?? promptPath.name ?? getCleanPromptName(uri);
            const source = IAgentSource.fromPromptPath(promptPath);
            if (!ast.header) {
                return { uri, name, agentInstructions, source };
            }
            const { description, model, tools, handOffs, argumentHint, target, infer } = ast.header;
            return { uri, name, description, model, tools, handOffs, argumentHint, target, infer, agentInstructions, source };
        }));
        const customAgents = [];
        for (let i = 0; i < customAgentsResults.length; i++) {
            const result = customAgentsResults[i];
            if (result.status === 'fulfilled') {
                customAgents.push(result.value);
            }
            else {
                const uri = agentFiles[i].uri;
                const error = result.reason;
                if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logger.warn(`[computeCustomAgents] Skipping agent file that does not exist: ${uri}`, error.message);
                }
                else {
                    this.logger.error(`[computeCustomAgents] Failed to parse agent file: ${uri}`, error);
                }
            }
        }
        return customAgents;
    }
    async parseNew(uri, token) {
        const model = this.modelService.getModel(uri);
        if (model) {
            return this.getParsedPromptFile(model);
        }
        const fileContent = await this.fileService.readFile(uri);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        return new PromptFileParser().parse(uri, fileContent.value.toString());
    }
    registerContributedFile(type, uri, extension, name, description) {
        const bucket = this.contributedFiles[type];
        if (bucket.has(uri)) {
            // keep first registration per extension (handler filters duplicates per extension already)
            return Disposable.None;
        }
        const entryPromise = (async () => {
            try {
                await this.filesConfigService.updateReadonly(uri, true);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.error(`[registerContributedFile] Failed to make prompt file readonly: ${uri}`, msg);
            }
            return { uri, name, description, storage: PromptsStorage.extension, type, extension, source: ExtensionAgentSourceType.contribution };
        })();
        bucket.set(uri, entryPromise);
        const flushCachesIfRequired = () => {
            this.cachedFileLocations[type] = undefined;
            switch (type) {
                case PromptsType.agent:
                    this.cachedCustomAgents.refresh();
                    break;
                case PromptsType.prompt:
                    this.cachedSlashCommands.refresh();
                    break;
            }
        };
        flushCachesIfRequired();
        return {
            dispose: () => {
                bucket.delete(uri);
                flushCachesIfRequired();
            }
        };
    }
    getPromptLocationLabel(promptPath) {
        switch (promptPath.storage) {
            case PromptsStorage.local: return this.labelService.getUriLabel(dirname(promptPath.uri), { relative: true });
            case PromptsStorage.user: return localize('user-data-dir.capitalized', 'User Data');
            case PromptsStorage.extension: {
                return localize('extension.with.id', 'Extension: {0}', promptPath.extension.displayName ?? promptPath.extension.id);
            }
            default: throw new Error('Unknown prompt storage type');
        }
    }
    findAgentMDsInWorkspace(token) {
        return this.fileLocator.findAgentMDsInWorkspace(token);
    }
    async listAgentMDs(token, includeNested) {
        const useAgentMD = this.configurationService.getValue(PromptsConfig.USE_AGENT_MD);
        if (!useAgentMD) {
            return [];
        }
        if (includeNested) {
            return await this.fileLocator.findAgentMDsInWorkspace(token);
        }
        else {
            return await this.fileLocator.findAgentMDsInWorkspaceRoots(token);
        }
    }
    async listCopilotInstructionsMDs(token) {
        const useCopilotInstructionsFiles = this.configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        if (!useCopilotInstructionsFiles) {
            return [];
        }
        return await this.fileLocator.findCopilotInstructionsMDsInWorkspace(token);
    }
    getAgentFileURIFromModeFile(oldURI) {
        return this.fileLocator.getAgentFileURIFromModeFile(oldURI);
    }
    getDisabledPromptFiles(type) {
        // Migration: if disabled key absent but legacy enabled key present, convert once.
        const disabledKey = this.disabledPromptsStorageKeyPrefix + type;
        const value = this.storageService.get(disabledKey, 0 /* StorageScope.PROFILE */, '[]');
        const result = new ResourceSet();
        try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr)) {
                for (const s of arr) {
                    try {
                        result.add(URI.revive(s));
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        catch {
            // ignore invalid storage values
        }
        return result;
    }
    setDisabledPromptFiles(type, uris) {
        const disabled = Array.from(uris).map(uri => uri.toJSON());
        this.storageService.store(this.disabledPromptsStorageKeyPrefix + type, JSON.stringify(disabled), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        if (type === PromptsType.agent) {
            this.cachedCustomAgents.refresh();
        }
    }
    // Agent skills
    sanitizeAgentSkillText(text) {
        // Remove XML tags
        return text.replace(/<[^>]+>/g, '');
    }
    truncateAgentSkillName(name, uri) {
        const MAX_NAME_LENGTH = 64;
        const sanitized = this.sanitizeAgentSkillText(name);
        if (sanitized !== name) {
            this.logger.warn(`[findAgentSkills] Agent skill name contains XML tags, removed: ${uri}`);
        }
        if (sanitized.length > MAX_NAME_LENGTH) {
            this.logger.warn(`[findAgentSkills] Agent skill name exceeds ${MAX_NAME_LENGTH} characters, truncated: ${uri}`);
            return sanitized.substring(0, MAX_NAME_LENGTH);
        }
        return sanitized;
    }
    truncateAgentSkillDescription(description, uri) {
        if (!description) {
            return undefined;
        }
        const MAX_DESCRIPTION_LENGTH = 1024;
        const sanitized = this.sanitizeAgentSkillText(description);
        if (sanitized !== description) {
            this.logger.warn(`[findAgentSkills] Agent skill description contains XML tags, removed: ${uri}`);
        }
        if (sanitized.length > MAX_DESCRIPTION_LENGTH) {
            this.logger.warn(`[findAgentSkills] Agent skill description exceeds ${MAX_DESCRIPTION_LENGTH} characters, truncated: ${uri}`);
            return sanitized.substring(0, MAX_DESCRIPTION_LENGTH);
        }
        return sanitized;
    }
    async findAgentSkills(token) {
        const useAgentSkills = this.configurationService.getValue(PromptsConfig.USE_AGENT_SKILLS);
        const defaultAccount = await this.defaultAccountService.getDefaultAccount();
        const previewFeaturesEnabled = defaultAccount?.chat_preview_features_enabled ?? true;
        if (useAgentSkills && previewFeaturesEnabled) {
            const result = [];
            const seenNames = new Set();
            const skillTypes = new Map();
            let skippedMissingName = 0;
            let skippedDuplicateName = 0;
            let skippedParseFailed = 0;
            const process = async (uri, skillType, scopeType) => {
                try {
                    const parsedFile = await this.parseNew(uri, token);
                    const name = parsedFile.header?.name;
                    if (!name) {
                        skippedMissingName++;
                        this.logger.error(`[findAgentSkills] Agent skill file missing name attribute: ${uri}`);
                        return;
                    }
                    const sanitizedName = this.truncateAgentSkillName(name, uri);
                    // Check for duplicate names
                    if (seenNames.has(sanitizedName)) {
                        skippedDuplicateName++;
                        this.logger.warn(`[findAgentSkills] Skipping duplicate agent skill name: ${sanitizedName} at ${uri}`);
                        return;
                    }
                    seenNames.add(sanitizedName);
                    const sanitizedDescription = this.truncateAgentSkillDescription(parsedFile.header?.description, uri);
                    result.push({ uri, type: scopeType, name: sanitizedName, description: sanitizedDescription });
                    // Track skill type
                    skillTypes.set(skillType, (skillTypes.get(skillType) || 0) + 1);
                }
                catch (e) {
                    skippedParseFailed++;
                    this.logger.error(`[findAgentSkills] Failed to parse Agent skill file: ${uri}`, e instanceof Error ? e.message : String(e));
                }
            };
            const workspaceSkills = await this.fileLocator.findAgentSkillsInWorkspace(token);
            await Promise.all(workspaceSkills.map(({ uri, type }) => process(uri, type, 'project')));
            const userSkills = await this.fileLocator.findAgentSkillsInUserHome(token);
            await Promise.all(userSkills.map(({ uri, type }) => process(uri, type, 'personal')));
            this.telemetryService.publicLog2('agentSkillsFound', {
                totalSkillsFound: result.length,
                claudePersonal: skillTypes.get('claude-personal') ?? 0,
                claudeWorkspace: skillTypes.get('claude-workspace') ?? 0,
                copilotPersonal: skillTypes.get('copilot-personal') ?? 0,
                githubWorkspace: skillTypes.get('github-workspace') ?? 0,
                customPersonal: skillTypes.get('custom-personal') ?? 0,
                customWorkspace: skillTypes.get('custom-workspace') ?? 0,
                skippedDuplicateName,
                skippedMissingName,
                skippedParseFailed
            });
            return result;
        }
        return undefined;
    }
};
PromptsService = __decorate([
    __param(0, ILogService),
    __param(1, ILabelService),
    __param(2, IModelService),
    __param(3, IInstantiationService),
    __param(4, IUserDataProfileService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IFilesConfigurationService),
    __param(8, IStorageService),
    __param(9, IExtensionService),
    __param(10, IDefaultAccountService),
    __param(11, ITelemetryService)
], PromptsService);
export { PromptsService };
// helpers
class CachedPromise extends Disposable {
    constructor(computeFn, getEvent, delay = 0) {
        super();
        this.computeFn = computeFn;
        this.getEvent = getEvent;
        this.delay = delay;
        this.cachedPromise = undefined;
        this.onDidUpdatePromiseEmitter = undefined;
    }
    get onDidChange() {
        if (!this.onDidUpdatePromiseEmitter) {
            const emitter = this.onDidUpdatePromiseEmitter = this._register(new Emitter());
            const delayer = this._register(new Delayer(this.delay));
            this._register(this.getEvent()(() => {
                this.cachedPromise = undefined;
                delayer.trigger(() => emitter.fire());
            }));
        }
        return this.onDidUpdatePromiseEmitter.event;
    }
    get(token) {
        if (this.cachedPromise !== undefined) {
            return this.cachedPromise;
        }
        const result = this.computeFn(token);
        if (!this.onDidUpdatePromiseEmitter) {
            return result; // only cache if there is an event listener
        }
        this.cachedPromise = result;
        this.onDidUpdatePromiseEmitter.fire();
        return result;
    }
    refresh() {
        this.cachedPromise = undefined;
        this.onDidUpdatePromiseEmitter?.fire();
    }
}
class ModelChangeTracker extends Disposable {
    get onDidPromptChange() {
        return this.onDidPromptModelChange.event;
    }
    constructor(modelService) {
        super();
        this.listeners = new ResourceMap();
        this.onDidPromptModelChange = this._register(new Emitter());
        const onAdd = (model) => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType !== undefined) {
                this.listeners.set(model.uri, model.onDidChangeContent(() => this.onDidPromptModelChange.fire({ uri: model.uri, promptType })));
            }
        };
        const onRemove = (languageId, uri) => {
            const promptType = getPromptsTypeForLanguageId(languageId);
            if (promptType !== undefined) {
                this.listeners.get(uri)?.dispose();
                this.listeners.delete(uri);
                this.onDidPromptModelChange.fire({ uri, promptType });
            }
        };
        this._register(modelService.onModelAdded(model => onAdd(model)));
        this._register(modelService.onModelLanguageChanged(e => {
            onRemove(e.oldLanguageId, e.model.uri);
            onAdd(e.model);
        }));
        this._register(modelService.onModelRemoved(model => onRemove(model.getLanguageId(), model.uri)));
    }
    dispose() {
        super.dispose();
        this.listeners.forEach(listener => listener.dispose());
        this.listeners.clear();
    }
}
var IAgentSource;
(function (IAgentSource) {
    function fromPromptPath(promptPath) {
        if (promptPath.storage === PromptsStorage.extension) {
            return {
                storage: PromptsStorage.extension,
                extensionId: promptPath.extension.identifier,
                type: promptPath.source
            };
        }
        else {
            return {
                storage: promptPath.storage
            };
        }
    }
    IAgentSource.fromPromptPath = fromPromptPath;
})(IAgentSource || (IAgentSource = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9zZXJ2aWNlL3Byb21wdHNTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNq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