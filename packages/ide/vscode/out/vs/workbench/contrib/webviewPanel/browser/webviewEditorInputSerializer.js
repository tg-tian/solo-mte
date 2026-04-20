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
import { URI } from '../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { WebviewInput } from './webviewEditorInput.js';
import { IWebviewWorkbenchService } from './webviewWorkbenchService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let WebviewEditorInputSerializer = class WebviewEditorInputSerializer {
    static { this.ID = WebviewInput.typeId; }
    constructor(_webviewWorkbenchService) {
        this._webviewWorkbenchService = _webviewWorkbenchService;
    }
    canSerialize(input) {
        return this._webviewWorkbenchService.shouldPersist(input);
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const data = this.toJson(input);
        try {
            return JSON.stringify(data);
        }
        catch {
            return undefined;
        }
    }
    deserialize(_instantiationService, serializedEditorInput) {
        const data = this.fromJson(JSON.parse(serializedEditorInput));
        return this._webviewWorkbenchService.openRevivedWebview({
            webviewInitInfo: {
                providedViewType: data.providedId,
                origin: data.origin,
                title: data.title,
                options: data.webviewOptions,
                contentOptions: data.contentOptions,
                extension: data.extension,
            },
            viewType: data.viewType,
            title: data.title,
            iconPath: data.iconPath,
            state: data.state,
            group: data.group
        });
    }
    fromJson(data) {
        return {
            ...data,
            extension: reviveWebviewExtensionDescription(data.extensionId, data.extensionLocation),
            iconPath: reviveWebviewIconPath(data.iconPath),
            state: reviveState(data.state),
            webviewOptions: restoreWebviewOptions(data.options),
            contentOptions: restoreWebviewContentOptions(data.options),
        };
    }
    toJson(input) {
        return {
            origin: input.webview.origin,
            viewType: input.viewType,
            providedId: input.providerId,
            title: input.getName(),
            options: { ...input.webview.options, ...input.webview.contentOptions },
            extensionLocation: input.extension?.location,
            extensionId: input.extension?.id.value,
            state: input.webview.state,
            iconPath: input.iconPath
                ? ThemeIcon.isThemeIcon(input.iconPath)
                    ? input.iconPath
                    : { light: input.iconPath.light, dark: input.iconPath.dark, }
                : undefined,
            group: input.group
        };
    }
};
WebviewEditorInputSerializer = __decorate([
    __param(0, IWebviewWorkbenchService)
], WebviewEditorInputSerializer);
export { WebviewEditorInputSerializer };
export function reviveWebviewExtensionDescription(extensionId, extensionLocation) {
    if (!extensionId) {
        return undefined;
    }
    const location = reviveUri(extensionLocation);
    if (!location) {
        return undefined;
    }
    return {
        id: new ExtensionIdentifier(extensionId),
        location,
    };
}
export function reviveWebviewIconPath(data) {
    if (!data) {
        return undefined;
    }
    if (ThemeIcon.isThemeIcon(data)) {
        return data;
    }
    const light = reviveUri(data.light);
    const dark = reviveUri(data.dark);
    return light && dark ? { light, dark } : undefined;
}
function reviveUri(data) {
    if (!data) {
        return undefined;
    }
    try {
        if (typeof data === 'string') {
            return URI.parse(data);
        }
        return URI.from(data);
    }
    catch {
        return undefined;
    }
}
function reviveState(state) {
    return typeof state === 'string' ? state : undefined;
}
export function restoreWebviewOptions(options) {
    return options;
}
export function restoreWebviewContentOptions(options) {
    return {
        ...options,
        localResourceRoots: options.localResourceRoots?.map(uri => reviveUri(uri)),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0U2VyaWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3RWRpdG9ySW5wdXRTZXJpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFJM0YsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFtQzFELElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTRCO2FBRWpCLE9BQUUsR0FBRyxZQUFZLENBQUMsTUFBTSxBQUF0QixDQUF1QjtJQUVoRCxZQUM0Qyx3QkFBa0Q7UUFBbEQsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtJQUMxRixDQUFDO0lBRUUsWUFBWSxDQUFDLEtBQW1CO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU0sU0FBUyxDQUFDLEtBQW1CO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDO1lBQ0osT0FBTyxJQUFJLENBQUMsU0FBUyxD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