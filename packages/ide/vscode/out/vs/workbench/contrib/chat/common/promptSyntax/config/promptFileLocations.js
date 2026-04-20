/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename, dirname } from '../../../../../../base/common/path.js';
import { PromptsType } from '../promptTypes.js';
/**
 * File extension for the reusable prompt files.
 */
export const PROMPT_FILE_EXTENSION = '.prompt.md';
/**
 * File extension for the reusable instruction files.
 */
export const INSTRUCTION_FILE_EXTENSION = '.instructions.md';
/**
 * File extension for the modes files.
 */
export const LEGACY_MODE_FILE_EXTENSION = '.chatmode.md';
/**
 * File extension for the agent files.
 */
export const AGENT_FILE_EXTENSION = '.agent.md';
/**
 * Copilot custom instructions file name.
 */
export const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = 'copilot-instructions.md';
/**
 * Default reusable prompt files source folder.
 */
export const PROMPT_DEFAULT_SOURCE_FOLDER = '.github/prompts';
/**
 * Default reusable instructions files source folder.
 */
export const INSTRUCTIONS_DEFAULT_SOURCE_FOLDER = '.github/instructions';
/**
 * Default modes source folder.
 */
export const LEGACY_MODE_DEFAULT_SOURCE_FOLDER = '.github/chatmodes';
/**
 * Agents folder.
 */
export const AGENTS_SOURCE_FOLDER = '.github/agents';
/**
 * Default agent skills workspace source folders.
 */
export const DEFAULT_AGENT_SKILLS_WORKSPACE_FOLDERS = [
    { path: '.github/skills', type: 'github-workspace' },
    { path: '.claude/skills', type: 'claude-workspace' }
];
/**
 * Default agent skills user home source folders.
 */
export const DEFAULT_AGENT_SKILLS_USER_HOME_FOLDERS = [
    { path: '.copilot/skills', type: 'copilot-personal' },
    { path: '.claude/skills', type: 'claude-personal' }
];
/**
 * Helper function to check if a file is directly in the .github/agents/ folder (not in subfolders).
 */
function isInAgentsFolder(fileUri) {
    const dir = dirname(fileUri.path);
    return dir.endsWith('/' + AGENTS_SOURCE_FOLDER) || dir === AGENTS_SOURCE_FOLDER;
}
/**
 * Gets the prompt file type from the provided path.
 */
export function getPromptFileType(fileUri) {
    const filename = basename(fileUri.path);
    if (filename.endsWith(PROMPT_FILE_EXTENSION)) {
        return PromptsType.prompt;
    }
    if (filename.endsWith(INSTRUCTION_FILE_EXTENSION) || (filename === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME)) {
        return PromptsType.instructions;
    }
    if (filename.endsWith(LEGACY_MODE_FILE_EXTENSION) || filename.endsWith(AGENT_FILE_EXTENSION)) {
        return PromptsType.agent;
    }
    // Check if it's a .md file in the .github/agents/ folder
    if (filename.endsWith('.md') && isInAgentsFolder(fileUri)) {
        return PromptsType.agent;
    }
    return undefined;
}
/**
 * Check if provided URI points to a file that with prompt file extension.
 */
export function isPromptOrInstructionsFile(fileUri) {
    return getPromptFileType(fileUri) !== undefined;
}
export function getPromptFileExtension(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTION_FILE_EXTENSION;
        case PromptsType.prompt:
            return PROMPT_FILE_EXTENSION;
        case PromptsType.agent:
            return AGENT_FILE_EXTENSION;
        default:
            throw new Error('Unknown prompt type');
    }
}
export function getPromptFileDefaultLocation(type) {
    switch (type) {
        case PromptsType.instructions:
            return INSTRUCTIONS_DEFAULT_SOURCE_FOLDER;
        case PromptsType.prompt:
            return PROMPT_DEFAULT_SOURCE_FOLDER;
        case PromptsType.agent:
            return AGENTS_SOURCE_FOLDER;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Gets clean prompt name without file extension.
 */
export function getCleanPromptName(fileUri) {
    const fileName = basename(fileUri.path);
    const extensions = [
        PROMPT_FILE_EXTENSION,
        INSTRUCTION_FILE_EXTENSION,
        LEGACY_MODE_FILE_EXTENSION,
        AGENT_FILE_EXTENSION,
    ];
    for (const ext of extensions) {
        if (fileName.endsWith(ext)) {
            return basename(fileUri.path, ext);
        }
    }
    if (fileName === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME) {
        return basename(fileUri.path, '.md');
    }
    // For .md files in .github/agents/ folder, treat them as agent files
    if (fileName.endsWith('.md') && isInAgentsFolder(fileUri)) {
        return basename(fileUri.path, '.md');
    }
    // because we now rely on the `prompt` language ID that can be explicitly
    // set for any document in the editor, any file can be a "prompt" file, so
    // to account for that, we return the full file name including the file
    // extension for all other cases
    return basename(fileUri.path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZUxvY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29uZmlnL3Byb21wdEZpbGVMb2NhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFaEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUM7QUFFbEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxrQkFBa0IsQ0FBQztBQUU3RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGNBQWMsQ0FBQztBQUV6RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQztBQUVoRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHlCQUF5QixDQUFDO0FBRzlFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsaUJBQWlCLENBQUM7QUFFOUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxzQkFBc0IsQ0FBQztBQUV6RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLG1CQUFtQixDQUFDO0FBRXJFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZ0JBQWdCLENBQUM7QUFFckQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FBRztJQUNyRCxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJ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