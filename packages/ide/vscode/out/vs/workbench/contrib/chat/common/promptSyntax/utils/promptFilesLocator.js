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
import { URI } from '../../../../../../base/common/uri.js';
import { isAbsolute } from '../../../../../../base/common/path.js';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { getPromptFileLocationsConfigKey, PromptsConfig } from '../config/config.js';
import { basename, dirname, isEqualOrParent, joinPath } from '../../../../../../base/common/resources.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, AGENTS_SOURCE_FOLDER, getPromptFileExtension, getPromptFileType, LEGACY_MODE_FILE_EXTENSION, getCleanPromptName, AGENT_FILE_EXTENSION, DEFAULT_AGENT_SKILLS_WORKSPACE_FOLDERS, DEFAULT_AGENT_SKILLS_USER_HOME_FOLDERS } from '../config/promptFileLocations.js';
import { PromptsType } from '../promptTypes.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { getExcludes, ISearchService } from '../../../../../services/search/common/search.js';
import { isCancellationError } from '../../../../../../base/common/errors.js';
import { PromptsStorage } from '../service/promptsService.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IPathService } from '../../../../../services/path/common/pathService.js';
/**
 * Utility class to locate prompt files.
 */
let PromptFilesLocator = class PromptFilesLocator {
    constructor(fileService, configService, workspaceService, environmentService, searchService, userDataService, logService, pathService) {
        this.fileService = fileService;
        this.configService = configService;
        this.workspaceService = workspaceService;
        this.environmentService = environmentService;
        this.searchService = searchService;
        this.userDataService = userDataService;
        this.logService = logService;
        this.pathService = pathService;
    }
    /**
     * List all prompt files from the filesystem.
     *
     * @returns List of prompt files found in the workspace.
     */
    async listFiles(type, storage, token) {
        if (storage === PromptsStorage.local) {
            return await this.listFilesInLocal(type, token);
        }
        else if (storage === PromptsStorage.user) {
            return await this.listFilesInUserData(type, token);
        }
        throw new Error(`Unsupported prompt file storage: ${storage}`);
    }
    async listFilesInUserData(type, token) {
        const files = await this.resolveFilesAtLocation(this.userDataService.currentProfile.promptsHome, token);
        return files.filter(file => getPromptFileType(file) === type);
    }
    createFilesUpdatedEvent(type) {
        const disposables = new DisposableStore();
        const eventEmitter = disposables.add(new Emitter());
        const userDataFolder = this.userDataService.currentProfile.promptsHome;
        const key = getPromptFileLocationsConfigKey(type);
        let parentFolders = this.getLocalParentFolders(type);
        const externalFolderWatchers = disposables.add(new DisposableStore());
        const updateExternalFolderWatchers = () => {
            externalFolderWatchers.clear();
            for (const folder of parentFolders) {
                if (!this.workspaceService.getWorkspaceFolder(folder.parent)) {
                    // if the folder is not part of the workspace, we need to watch it
                    const recursive = folder.filePattern !== undefined;
                    externalFolderWatchers.add(this.fileService.watch(folder.parent, { recursive, excludes: [] }));
                }
            }
        };
        updateExternalFolderWatchers();
        disposables.add(this.configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(key)) {
                parentFolders = this.getLocalParentFolders(type);
                updateExternalFolderWatchers();
                eventEmitter.fire();
            }
        }));
        disposables.add(this.fileService.onDidFilesChange(e => {
            if (e.affects(userDataFolder)) {
                eventEmitter.fire();
                return;
            }
            if (parentFolders.some(folder => e.affects(folder.parent))) {
                eventEmitter.fire();
                return;
            }
        }));
        disposables.add(this.fileService.watch(userDataFolder));
        return { event: eventEmitter.event, dispose: () => disposables.dispose() };
    }
    getAgentSourceFolder() {
        return this.toAbsoluteLocations([AGENTS_SOURCE_FOLDER]);
    }
    /**
     * Get all possible unambiguous prompt file source folders based on
     * the current workspace folder structure.
     *
     * This method is currently primarily used by the `> Create Prompt`
     * command that providers users with the list of destination folders
     * for a newly created prompt file. Because such a list cannot contain
     * paths that include `glob pattern` in them, we need to process config
     * values and try to create a list of clear and unambiguous locations.
     *
     * @returns List of possible unambiguous prompt file folders.
     */
    getConfigBasedSourceFolders(type) {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService, type);
        const absoluteLocations = this.toAbsoluteLocations(configuredLocations);
        // locations in the settings can contain glob patterns so we need
        // to process them to get "clean" paths; the goal here is to have
        // a list of unambiguous folder paths where prompt files are stored
        const result = new ResourceSet();
        for (let absoluteLocation of absoluteLocations) {
            const baseName = basename(absoluteLocation);
            // if a path ends with a well-known "any file" pattern, remove
            // it so we can get the dirname path of that setting value
            const filePatterns = ['*.md', `*${getPromptFileExtension(type)}`];
            for (const filePattern of filePatterns) {
                if (baseName === filePattern) {
                    absoluteLocation = dirname(absoluteLocation);
                    continue;
                }
            }
            // likewise, if the pattern ends with single `*` (any file name)
            // remove it to get the dirname path of the setting value
            if (baseName === '*') {
                absoluteLocation = dirname(absoluteLocation);
            }
            // if after replacing the "file name" glob pattern, the path
            // still contains a glob pattern, then ignore the path
            if (isValidGlob(absoluteLocation.path) === true) {
                continue;
            }
            result.add(absoluteLocation);
        }
        return [...result];
    }
    /**
     * Finds all existent prompt files in the configured local source folders.
     *
     * @returns List of prompt files found in the local source folders.
     */
    async listFilesInLocal(type, token) {
        // find all prompt files in the provided locations, then match
        // the found file paths against (possible) glob patterns
        const paths = new ResourceSet();
        for (const { parent, filePattern } of this.getLocalParentFolders(type)) {
            const files = (filePattern === undefined)
                ? await this.resolveFilesAtLocation(parent, token) // if the location does not contain a glob pattern, resolve the location directly
                : await this.searchFilesInLocation(parent, filePattern, token);
            for (const file of files) {
                if (getPromptFileType(file) === type) {
                    paths.add(file);
                }
            }
            if (token.isCancellationRequested) {
                return [];
            }
        }
        return [...paths];
    }
    getLocalParentFolders(type) {
        const configuredLocations = PromptsConfig.promptSourceFolders(this.configService, type);
        if (type === PromptsType.agent) {
            configuredLocations.push(AGENTS_SOURCE_FOLDER);
        }
        const absoluteLocations = this.toAbsoluteLocations(configuredLocations);
        return absoluteLocations.map(firstNonGlobParentAndPattern);
    }
    /**
     * Converts locations defined in `settings` to absolute filesystem path URIs.
     * This conversion is needed because locations in settings can be relative,
     * hence we need to resolve them based on the current workspace folders.
     */
    toAbsoluteLocations(configuredLocations) {
        const result = new ResourceSet();
        const { folders } = this.workspaceService.getWorkspace();
        for (const configuredLocation of configuredLocations) {
            try {
                if (isAbsolute(configuredLocation)) {
                    let uri = URI.file(configuredLocation);
                    const remoteAuthority = this.environmentService.remoteAuthority;
                    if (remoteAuthority) {
                        // if the location is absolute and we are in a remote environment,
                        // we need to convert it to a file URI with the remote authority
                        uri = uri.with({ scheme: Schemas.vscodeRemote, authority: remoteAuthority });
                    }
                    result.add(uri);
                }
                else {
                    for (const workspaceFolder of folders) {
                        const absolutePath = joinPath(workspaceFolder.uri, configuredLocation);
                        result.add(absolutePath);
                    }
                }
            }
            catch (error) {
                this.logService.error(`Failed to resolve prompt file location: ${configuredLocation}`, error);
            }
        }
        return [...result];
    }
    /**
     * Uses the file service to resolve the provided location and return either the file at the location of files in the directory.
     */
    async resolveFilesAtLocation(location, token) {
        try {
            const info = await this.fileService.resolve(location);
            if (info.isFile) {
                return [info.resource];
            }
            else if (info.isDirectory && info.children) {
                const result = [];
                for (const child of info.children) {
                    if (child.isFile) {
                        result.push(child.resource);
                    }
                }
                return result;
            }
        }
        catch (error) {
        }
        return [];
    }
    /**
     * Uses the search service to find all files at the provided location
     */
    async searchFilesInLocation(folder, filePattern, token) {
        const disregardIgnoreFiles = this.configService.getValue('explorer.excludeGitIgnore');
        const workspaceRoot = this.workspaceService.getWorkspaceFolder(folder);
        const getExcludePattern = (folder) => getExcludes(this.configService.getValue({ resource: folder })) || {};
        const searchOptions = {
            folderQueries: [{ folder, disregardIgnoreFiles }],
            type: 1 /* QueryType.File */,
            shouldGlobMatchFilePattern: true,
            excludePattern: workspaceRoot ? getExcludePattern(workspaceRoot.uri) : undefined,
            sortByScore: true,
            filePattern
        };
        try {
            const searchResult = await this.searchService.fileSearch(searchOptions, token);
            if (token.isCancellationRequested) {
                return [];
            }
            return searchResult.results.map(r => r.resource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                throw e;
            }
        }
        return [];
    }
    async findCopilotInstructionsMDsInWorkspace(token) {
        const result = [];
        const { folders } = this.workspaceService.getWorkspace();
        for (const folder of folders) {
            const file = joinPath(folder.uri, `.github/` + COPILOT_CUSTOM_INSTRUCTIONS_FILENAME);
            try {
                const stat = await this.fileService.stat(file);
                if (stat.isFile) {
                    result.push(file);
                }
            }
            catch (error) {
                this.logService.trace(`[PromptFilesLocator] Skipping copilot-instructions.md at ${file.toString()}: ${error}`);
            }
        }
        return result;
    }
    /**
     * Gets list of `AGENTS.md` files anywhere in the workspace.
     */
    async findAgentMDsInWorkspace(token) {
        const result = await Promise.all(this.workspaceService.getWorkspace().folders.map(folder => this.findAgentMDsInFolder(folder.uri, token)));
        return result.flat(1);
    }
    async findAgentMDsInFolder(folder, token) {
        const disregardIgnoreFiles = this.configService.getValue('explorer.excludeGitIgnore');
        const getExcludePattern = (folder) => getExcludes(this.configService.getValue({ resource: folder })) || {};
        const searchOptions = {
            folderQueries: [{ folder, disregardIgnoreFiles }],
            type: 1 /* QueryType.File */,
            shouldGlobMatchFilePattern: true,
            excludePattern: getExcludePattern(folder),
            filePattern: '**/AGENTS.md',
        };
        try {
            const searchResult = await this.searchService.fileSearch(searchOptions, token);
            if (token.isCancellationRequested) {
                return [];
            }
            return searchResult.results.map(r => r.resource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                throw e;
            }
        }
        return [];
    }
    /**
     * Gets list of `AGENTS.md` files only at the root workspace folder(s).
     */
    async findAgentMDsInWorkspaceRoots(token) {
        const result = [];
        const { folders } = this.workspaceService.getWorkspace();
        const resolvedRoots = await this.fileService.resolveAll(folders.map(f => ({ resource: f.uri })));
        for (const root of resolvedRoots) {
            if (root.success && root.stat?.children) {
                const agentMd = root.stat.children.find(c => c.isFile && c.name.toLowerCase() === 'agents.md');
                if (agentMd) {
                    result.push(agentMd.resource);
                }
            }
        }
        return result;
    }
    getAgentFileURIFromModeFile(oldURI) {
        if (oldURI.path.endsWith(LEGACY_MODE_FILE_EXTENSION)) {
            let newLocation;
            const workspaceFolder = this.workspaceService.getWorkspaceFolder(oldURI);
            if (workspaceFolder) {
                newLocation = joinPath(workspaceFolder.uri, AGENTS_SOURCE_FOLDER, getCleanPromptName(oldURI) + AGENT_FILE_EXTENSION);
            }
            else if (isEqualOrParent(oldURI, this.userDataService.currentProfile.promptsHome)) {
                newLocation = joinPath(this.userDataService.currentProfile.promptsHome, getCleanPromptName(oldURI) + AGENT_FILE_EXTENSION);
            }
            return newLocation;
        }
        return undefined;
    }
    async findAgentSkillsInFolder(uri, relativePath, token) {
        const result = [];
        try {
            const stat = await this.fileService.resolve(joinPath(uri, relativePath));
            if (token.isCancellationRequested) {
                return [];
            }
            if (stat.isDirectory && stat.children) {
                for (const skillDir of stat.children) {
                    if (skillDir.isDirectory) {
                        const skillFile = joinPath(skillDir.resource, 'SKILL.md');
                        if (await this.fileService.exists(skillFile)) {
                            result.push(skillFile);
                        }
                    }
                }
            }
        }
        catch (error) {
            // no such folder, return empty list
            return [];
        }
        return result;
    }
    /**
     * Searches for skills in all default directories in the workspace.
     * Each skill is stored in its own subdirectory with a SKILL.md file.
     */
    async findAgentSkillsInWorkspace(token) {
        const workspace = this.workspaceService.getWorkspace();
        const allResults = [];
        for (const folder of workspace.folders) {
            for (const { path, type } of DEFAULT_AGENT_SKILLS_WORKSPACE_FOLDERS) {
                const results = await this.findAgentSkillsInFolder(folder.uri, path, token);
                allResults.push(...results.map(uri => ({ uri, type })));
            }
        }
        return allResults;
    }
    /**
     * Searches for skills in all default directories in the home folder.
     * Each skill is stored in its own subdirectory with a SKILL.md file.
     */
    async findAgentSkillsInUserHome(token) {
        const userHome = await this.pathService.userHome();
        const allResults = [];
        for (const { path, type } of DEFAULT_AGENT_SKILLS_USER_HOME_FOLDERS) {
            const results = await this.findAgentSkillsInFolder(userHome, path, token);
            allResults.push(...results.map(uri => ({ uri, type })));
        }
        return allResults;
    }
};
PromptFilesLocator = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ISearchService),
    __param(5, IUserDataProfileService),
    __param(6, ILogService),
    __param(7, IPathService)
], PromptFilesLocator);
export { PromptFilesLocator };
/**
 * Checks if the provided `pattern` could be a valid glob pattern.
 */
export function isValidGlob(pattern) {
    let squareBrackets = false;
    let squareBracketsCount = 0;
    let curlyBrackets = false;
    let curlyBracketsCount = 0;
    let previousCharacter;
    for (const char of pattern) {
        // skip all escaped characters
        if (previousCharacter === '\\') {
            previousCharacter = char;
            continue;
        }
        if (char === '*') {
            return true;
        }
        if (char === '?') {
            return true;
        }
        if (char === '[') {
            squareBrackets = true;
            squareBracketsCount++;
            previousCharacter = char;
            continue;
        }
        if (char === ']') {
            squareBrackets = true;
            squareBracketsCount--;
            previousCharacter = char;
            continue;
        }
        if (char === '{') {
            curlyBrackets = true;
            curlyBracketsCount++;
            continue;
        }
        if (char === '}') {
            curlyBrackets = true;
            curlyBracketsCount--;
            previousCharacter = char;
            continue;
        }
        previousCharacter = char;
    }
    // if square brackets exist and are in pairs, this is a `valid glob`
    if (squareBrackets && (squareBracketsCount === 0)) {
        return true;
    }
    // if curly brackets exist and are in pairs, this is a `valid glob`
    if (curlyBrackets && (curlyBracketsCount === 0)) {
        return true;
    }
    return false;
}
/**
 * Finds the first parent of the provided location that does not contain a `glob pattern`.
 *
 * Asumes that the location that is provided has a valid path (is abstract)
 *
 * ## Examples
 *
 * ```typescript
 * assert.strictDeepEqual(
 *     firstNonGlobParentAndPattern(URI.file('/home/user/{folder1,folder2}/file.md')).path,
 *     { parent: URI.file('/home/user'), filePattern: '{folder1,folder2}/file.md' },
 *     'Must find correct non-glob parent dirname.',
 * );
 * ```
 */
function firstNonGlobParentAndPattern(location) {
    const segments = location.path.split('/');
    let i = 0;
    while (i < segments.length && isValidGlob(segments[i]) === false) {
        i++;
    }
    if (i === segments.length) {
        // the path does not contain a glob pattern, so we can
        // just find all prompt files in the provided location
        return { parent: location };
    }
    const parent = location.with({ path: segments.slice(0, i).join('/') });
    if (i === segments.length - 1 && segments[i] === '*' || segments[i] === ``) {
        return { parent };
    }
    // the path contains a glob pattern, so we search in last folder that does not contain a glob pattern
    return {
        parent,
        filePattern: segments.slice(i).join('/')
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9wcm9tcHRGaWxlc0xvY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLHNDQUFzQyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL1MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxP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