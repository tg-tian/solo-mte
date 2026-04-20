/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
export class MockPromptsService {
    constructor() {
        this._onDidChangeCustomChatModes = new Emitter();
        this.onDidChangeCustomAgents = this._onDidChangeCustomChatModes.event;
        this._customModes = [];
    }
    setCustomModes(modes) {
        this._customModes = modes;
        this._onDidChangeCustomChatModes.fire();
    }
    async getCustomAgents(token) {
        return this._customModes;
    }
    // Stub implementations for required interface methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSyntaxParserFor(_model) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listPromptFiles(_type) { throw new Error('Not implemented'); }
    listPromptFilesForStorage(type, storage, token) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSourceFolders(_type) { throw new Error('Not implemented'); }
    isValidSlashCommandName(_command) { return false; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolvePromptSlashCommand(command, _token) { throw new Error('Not implemented'); }
    get onDidChangeSlashCommands() { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPromptSlashCommands(_token) { throw new Error('Not implemented'); }
    getPromptSlashCommandName(uri, _token) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse(_uri, _type, _token) { throw new Error('Not implemented'); }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseNew(_uri, _token) { throw new Error('Not implemented'); }
    getParsedPromptFile(textModel) { throw new Error('Not implemented'); }
    registerContributedFile(type, uri, extension, name, description) { throw new Error('Not implemented'); }
    getPromptLocationLabel(promptPath) { throw new Error('Not implemented'); }
    findAgentMDsInWorkspace(token) { throw new Error('Not implemented'); }
    listAgentMDs(token) { throw new Error('Not implemented'); }
    listCopilotInstructionsMDs(token) { throw new Error('Not implemented'); }
    getAgentFileURIFromModeFile(oldURI) { throw new Error('Not implemented'); }
    getDisabledPromptFiles(type) { throw new Error('Method not implemented.'); }
    setDisabledPromptFiles(type, uris) { throw new Error('Method not implemented.'); }
    registerCustomAgentsProvider(extension, provider) { throw new Error('Method not implemented.'); }
    findAgentSkills(token) { throw new Error('Method not implemented.'); }
    dispose() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1Byb21wdHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja1Byb21wdHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQVVyRSxNQUFNLE9BQU8sa0JBQWtCO0lBQS9CO1FBSWtCLGdDQUEyQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDMUQsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQztRQUVsRSxpQkFBWSxHQUFtQixFQUFFLENBQUM7SUEwQzNDLENBQUM7SUF4Q0EsY0FBYyxDQUFDLEtBQXFCO1FBQ25DLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO1FBQzFCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUF3QjtRQUM3QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCw4REFBOEQ7SUFDOUQsa0JBQWtCLENBQUMsTUFBVyxJQUFTLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsOERBQThEO0lBQzlELGVBQWUsQ0FBQyxLQUFVLElBQTZCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUYseUJBQXlCLENBQUMsSUFBaUIsRUFBRSxPQUF1QixFQUFFLEtBQXdCLElBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEssOERBQThEO0lBQzlELGdC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