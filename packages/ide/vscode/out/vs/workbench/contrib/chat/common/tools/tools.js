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
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILanguageModelToolsService, SpecedToolAliases, ToolDataSource } from '../../common/languageModelToolsService.js';
import { ConfirmationTool, ConfirmationToolData } from './confirmationTool.js';
import { EditTool, EditToolData } from './editFileTool.js';
import { createManageTodoListToolData, ManageTodoListTool, TodoListToolDescriptionFieldSettingId, TodoListToolWriteOnlySettingId } from './manageTodoListTool.js';
import { RunSubagentTool } from './runSubagentTool.js';
let BuiltinToolsContribution = class BuiltinToolsContribution extends Disposable {
    static { this.ID = 'chat.builtinTools'; }
    constructor(toolsService, instantiationService, configurationService) {
        super();
        this.configurationService = configurationService;
        const editTool = instantiationService.createInstance(EditTool);
        this._register(toolsService.registerTool(EditToolData, editTool));
        // Check if write-only mode is enabled for the todo tool
        const writeOnlyMode = this.configurationService.getValue(TodoListToolWriteOnlySettingId) === true;
        const includeDescription = this.configurationService.getValue(TodoListToolDescriptionFieldSettingId) !== false;
        const todoToolData = createManageTodoListToolData(writeOnlyMode, includeDescription);
        const manageTodoListTool = this._register(instantiationService.createInstance(ManageTodoListTool, writeOnlyMode, includeDescription));
        this._register(toolsService.registerTool(todoToolData, manageTodoListTool));
        // Register the confirmation tool
        const confirmationTool = instantiationService.createInstance(ConfirmationTool);
        this._register(toolsService.registerTool(ConfirmationToolData, confirmationTool));
        const runSubagentTool = this._register(instantiationService.createInstance(RunSubagentTool));
        const customAgentToolSet = this._register(toolsService.createToolSet(ToolDataSource.Internal, 'custom-agent', SpecedToolAliases.agent, {
            icon: ThemeIcon.fromId(Codicon.agent.id),
            description: localize('toolset.custom-agent', 'Delegate tasks to other agents'),
        }));
        let runSubagentRegistration;
        let toolSetRegistration;
        const registerRunSubagentTool = () => {
            runSubagentRegistration?.dispose();
            toolSetRegistration?.dispose();
            const runSubagentToolData = runSubagentTool.getToolData();
            runSubagentRegistration = toolsService.registerTool(runSubagentToolData, runSubagentTool);
            toolSetRegistration = customAgentToolSet.addTool(runSubagentToolData);
        };
        registerRunSubagentTool();
        this._register(runSubagentTool.onDidUpdateToolData(registerRunSubagentTool));
        this._register({
            dispose: () => {
                runSubagentRegistration?.dispose();
                toolSetRegistration?.dispose();
            }
        });
    }
};
BuiltinToolsContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], BuiltinToolsContribution);
export { BuiltinToolsContribution };
export const InternalFetchWebPageToolId = 'vscode_fetchWebPage_internal';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzNELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxrQkFBa0IsRUFBRSxxQ0FBcUMsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2xLLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVoRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7YUFFdkMsT0FBRSxHQUFHLG1CQUFtQixBQUF0QixDQUF1QjtJQUV6QyxZQUM2QixZQUF3QyxFQUM3QyxvQkFBMkMsRUFDMUIsb0JBQTJDO1FBRW5GLEtBQUssRUFBRSxDQUFD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