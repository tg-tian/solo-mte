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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-browser/services.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IMcpGalleryManifestService } from '../../../../platform/mcp/common/mcpGalleryManifest.js';
import { WorkbenchMcpGalleryManifestService } from '../browser/mcpGalleryManifestService.js';
let McpGalleryManifestService = class McpGalleryManifestService extends WorkbenchMcpGalleryManifestService {
    constructor(productService, remoteAgentService, requestService, logService, sharedProcessService, configurationService) {
        super(productService, remoteAgentService, requestService, logService, configurationService);
        const channel = sharedProcessService.getChannel('mcpGalleryManifest');
        this.getMcpGalleryManifest().then(manifest => {
            channel.call('setMcpGalleryManifest', [manifest]);
            this._register(this.onDidChangeMcpGalleryManifest(manifest => channel.call('setMcpGalleryManifest', [manifest])));
        });
    }
};
McpGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IRemoteAgentService),
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, ISharedProcessService),
    __param(5, IConfigurationService)
], McpGalleryManifestService);
export { McpGalleryManifestService };
registerSingleton(IMcpGalleryManifestService, McpGalleryManifestService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbWNwL2VsZWN0cm9uLWJyb3dzZXIvbWNwR2FsbGVyeU1hbmlmZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdEYsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxrQ0FBa0M7SUFFaEYsWUFDa0IsY0FBK0IsRUFDM0Isa0JBQXVDLEVBQzNDLGNBQStCLEVBQ25DLFVBQXVCLEVBQ2Isb0JBQTJDLEVBQzNDLG9CQUEyQztRQUVsRSxLQUFLLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUU1RixNQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkgsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBRUQsQ0FBQTtBQW5CWSx5QkFBeUI7SUFHbkMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FSWCx5QkFBeUIsQ0FtQnJDOztBQUVELGlCQUFpQixDQUFDLDBCQUEwQixFQUFFLHlCQUF5QixrQ0FBMEIsQ0FBQyJ9