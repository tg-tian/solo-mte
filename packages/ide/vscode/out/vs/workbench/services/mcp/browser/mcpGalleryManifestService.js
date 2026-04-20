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
import { McpGalleryManifestService as McpGalleryManifestService } from '../../../../platform/mcp/common/mcpGalleryManifestService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Emitter } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { mcpGalleryServiceUrlConfig } from '../../../../platform/mcp/common/mcpManagement.js';
let WorkbenchMcpGalleryManifestService = class WorkbenchMcpGalleryManifestService extends McpGalleryManifestService {
    get mcpGalleryManifestStatus() { return this.currentStatus; }
    constructor(productService, remoteAgentService, requestService, logService, configurationService) {
        super(productService, requestService, logService);
        this.configurationService = configurationService;
        this.mcpGalleryManifest = null;
        this._onDidChangeMcpGalleryManifest = this._register(new Emitter());
        this.onDidChangeMcpGalleryManifest = this._onDidChangeMcpGalleryManifest.event;
        this.currentStatus = "unavailable" /* McpGalleryManifestStatus.Unavailable */;
        this._onDidChangeMcpGalleryManifestStatus = this._register(new Emitter());
        this.onDidChangeMcpGalleryManifestStatus = this._onDidChangeMcpGalleryManifestStatus.event;
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            const channel = remoteConnection.getChannel('mcpGalleryManifest');
            this.getMcpGalleryManifest().then(manifest => {
                channel.call('setMcpGalleryManifest', [manifest]);
                this._register(this.onDidChangeMcpGalleryManifest(manifest => channel.call('setMcpGalleryManifest', [manifest])));
            });
        }
    }
    async getMcpGalleryManifest() {
        if (!this.initPromise) {
            this.initPromise = this.doGetMcpGalleryManifest();
        }
        await this.initPromise;
        return this.mcpGalleryManifest;
    }
    async doGetMcpGalleryManifest() {
        await this.getAndUpdateMcpGalleryManifest();
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(mcpGalleryServiceUrlConfig) || e.affectsConfiguration('chat.mcp.gallery.version')) {
                this.getAndUpdateMcpGalleryManifest();
            }
        }));
    }
    async getAndUpdateMcpGalleryManifest() {
        const mcpGalleryConfig = this.configurationService.getValue('chat.mcp.gallery');
        if (mcpGalleryConfig?.serviceUrl) {
            this.update(await this.createMcpGalleryManifest(mcpGalleryConfig.serviceUrl, mcpGalleryConfig.version));
        }
        else {
            this.update(await super.getMcpGalleryManifest());
        }
    }
    update(manifest) {
        if (this.mcpGalleryManifest?.url === manifest?.url && this.mcpGalleryManifest?.version === manifest?.version) {
            return;
        }
        this.mcpGalleryManifest = manifest;
        if (this.mcpGalleryManifest) {
            this.logService.info('MCP Registry configured:', this.mcpGalleryManifest.url);
        }
        else {
            this.logService.info('No MCP Registry configured');
        }
        this.currentStatus = this.mcpGalleryManifest ? "available" /* McpGalleryManifestStatus.Available */ : "unavailable" /* McpGalleryManifestStatus.Unavailable */;
        this._onDidChangeMcpGalleryManifest.fire(this.mcpGalleryManifest);
        this._onDidChangeMcpGalleryManifestStatus.fire(this.currentStatus);
    }
};
WorkbenchMcpGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IRemoteAgentService),
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, IConfigurationService)
], WorkbenchMcpGalleryManifestService);
export { WorkbenchMcpGalleryManifestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbWNwL2Jyb3dzZXIvbWNwR2FsbGVyeU1hbmlmZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUseUJBQXlCLElBQUkseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN0SSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFxQiwwQkFBMEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTFHLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQW1DLFNBQVEseUJBQXlCO0lBUWhGLElBQWEsd0JBQXdCLEtBQStCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFJaEcsWUFDa0IsY0FBK0IsRUFDM0Isa0JBQXVDLEVBQzNDLGNBQStCLEVBQ25DLFVBQXVCLEVBQ2Isb0JBQTREO1FBRW5GLEtBQUssQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRlYseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQWY1RSx1QkFBa0IsR0FBK0IsSUFBSSxDQUFDO1FBRXRELG1DQUE4QixHQUFHLElBQUks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