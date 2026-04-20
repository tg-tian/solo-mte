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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { createDecorator, IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { AgentSessionsModel } from './agentSessionsModel.js';
let AgentSessionsService = class AgentSessionsService extends Disposable {
    get model() {
        if (!this._model) {
            this._model = this._register(this.instantiationService.createInstance(AgentSessionsModel));
            this._model.resolve(undefined /* all providers */);
        }
        return this._model;
    }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
    }
    getSession(resource) {
        return this.model.getSession(resource);
    }
};
AgentSessionsService = __decorate([
    __param(0, IInstantiationService)
], AgentSessionsService);
export { AgentSessionsService };
export const IAgentSessionsService = createDecorator('agentSessions');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FnZW50U2Vzc2lvbnMvYWdlbnRTZXNzaW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN2SCxPQUFPLEVBQUUsa0JBQWtCLEVBQXNDLE1BQU0seUJBQXlCLENBQUM7QUFXMUYsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBS25ELElBQUksS0FBSztRQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQzNGLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELFlBQW9ELG9CQUEyQztRQUM5RixLQUFLLEVBQUUsQ0FBQztRQUQyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBRS9GLENBQUM7SUFFRCxVQUFVLENBQUMsUUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRCxDQUFBO0FBckJZLG9CQUFvQjtJQWNuQixXQUFBLHFCQUFxQixDQUFBO0dBZHRCLG9CQUFvQixDQXFCaEM7O0FBRUQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixlQUFlLENBQUMsQ0FBQyJ9