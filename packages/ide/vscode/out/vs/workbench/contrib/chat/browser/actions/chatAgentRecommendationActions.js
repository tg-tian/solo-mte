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
import { TimeoutTimer } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { ICommandService, CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IWorkbenchExtensionManagementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatService } from '../../common/chatService.js';
const INSTALL_CONTEXT_PREFIX = 'chat.installRecommendationAvailable';
let ChatAgentRecommendation = class ChatAgentRecommendation extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentRecommendation'; }
    constructor(productService, extensionGalleryService, extensionManagementService, contextKeyService) {
        super();
        this.productService = productService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManagementService = extensionManagementService;
        this.contextKeyService = contextKeyService;
        this.availabilityContextKeys = new Map();
        this.refreshRequestId = 0;
        const recommendations = this.productService.chatSessionRecommendations;
        if (!recommendations?.length || !this.extensionGalleryService.isEnabled()) {
            return;
        }
        for (const recommendation of recommendations) {
            this.registerRecommendation(recommendation);
        }
        const refresh = () => this.refreshInstallAvailability();
        this._register(this.extensionManagementService.onProfileAwareDidInstallExtensions(refresh));
        this._register(this.extensionManagementService.onProfileAwareDidUninstallExtension(refresh));
        this._register(this.extensionManagementService.onDidChangeProfile(refresh));
        this.refreshInstallAvailability();
    }
    registerRecommendation(recommendation) {
        const extensionKey = ExtensionIdentifier.toKey(recommendation.extensionId);
        const commandId = `chat.installRecommendation.${extensionKey}.${recommendation.name}`;
        const availabilityContextId = `${INSTALL_CONTEXT_PREFIX}.${extensionKey}`;
        const availabilityContext = new RawContextKey(availabilityContextId, false).bindTo(this.contextKeyService);
        this.availabilityContextKeys.set(extensionKey, availabilityContext);
        const title = localize2('chat.installRecommendation', "New {0}", recommendation.displayName);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: commandId,
                    title,
                    tooltip: recommendation.description,
                    f1: false,
                    category: CHAT_CATEGORY,
                    icon: Codicon.extensions,
                    menu: [
                        {
                            id: MenuId.ChatNewMenu,
                            group: '4_recommendations',
                            when: ContextKeyExpr.equals(availabilityContextId, true)
                        }
                    ]
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const productService = accessor.get(IProductService);
                const chatService = accessor.get(IChatService);
                const installPreReleaseVersion = productService.quality !== 'stable';
                await commandService.executeCommand('workbench.extensions.installExtension', recommendation.extensionId, {
                    installPreReleaseVersion
                });
                await runPostInstallCommand(commandService, chatService, recommendation.postInstallCommand);
            }
        }));
    }
    refreshInstallAvailability() {
        if (!this.availabilityContextKeys.size) {
            return;
        }
        const currentRequest = ++this.refreshRequestId;
        this.extensionManagementService.getInstalled().then(installedExtensions => {
            if (currentRequest !== this.refreshRequestId) {
                return;
            }
            const installed = new Set(installedExtensions.map(ext => ExtensionIdentifier.toKey(ext.identifier.id)));
            for (const [extensionKey, context] of this.availabilityContextKeys) {
                context.set(!installed.has(extensionKey));
            }
        }, () => {
            if (currentRequest !== this.refreshRequestId) {
                return;
            }
            for (const [, context] of this.availabilityContextKeys) {
                context.set(false);
            }
        });
    }
};
ChatAgentRecommendation = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionGalleryService),
    __param(2, IWorkbenchExtensionManagementService),
    __param(3, IContextKeyService)
], ChatAgentRecommendation);
export { ChatAgentRecommendation };
async function runPostInstallCommand(commandService, chatService, commandId) {
    if (!commandId) {
        return;
    }
    await waitForCommandRegistration(commandId);
    await chatService.activateDefaultAgent(ChatAgentLocation.Chat);
    try {
        await commandService.executeCommand(commandId);
    }
    catch {
        // Command failed or was cancelled; ignore.
    }
}
function waitForCommandRegistration(commandId) {
    if (CommandsRegistry.getCommands().has(commandId)) {
        return Promise.resolve();
    }
    return new Promise(resolve => {
        const timer = new TimeoutTimer();
        const listener = CommandsRegistry.onDidRegisterCommand((id) => {
            if (id === commandId) {
                listener.dispose();
                timer.dispose();
                resolve();
            }
        });
        timer.cancelAndSet(() => {
            listener.dispose();
            resolve();
        }, 10_000);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50UmVjb21tZW5kYXRpb25BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBZ2VudFJlY29tbWVuZGF0aW9uQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6SSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUNySCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRzNGLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQzlILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVqRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJB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