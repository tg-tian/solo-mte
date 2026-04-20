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
var WebviewInput_1;
import { Schemas } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isDark } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
let WebviewInput = class WebviewInput extends EditorInput {
    static { WebviewInput_1 = this; }
    static { this.typeId = 'workbench.editors.webviewInput'; }
    get typeId() {
        return WebviewInput_1.typeId;
    }
    get editorId() {
        return this.viewType;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.webviewPanel,
            path: `webview-panel/webview-${this.providerId}-${this._resourceId}`
        });
    }
    constructor(init, webview, _themeService) {
        super();
        this._themeService = _themeService;
        this._resourceId = generateUuid();
        this._hasTransfered = false;
        this.viewType = init.viewType;
        this.providerId = init.providedId;
        this._webviewTitle = init.name;
        this._iconPath = init.iconPath;
        this._webview = webview;
        this._register(_themeService.onDidColorThemeChange(() => {
            // Potentially update icon
            this._onDidChangeLabel.fire();
        }));
    }
    dispose() {
        if (!this.isDisposed()) {
            if (!this._hasTransfered) {
                this._webview?.dispose();
            }
        }
        super.dispose();
    }
    getName() {
        return this._webviewTitle;
    }
    getTitle(_verbosity) {
        return this.getName();
    }
    getDescription() {
        return undefined;
    }
    setWebviewTitle(value) {
        this._webviewTitle = value;
        this.webview.setTitle(value);
        this._onDidChangeLabel.fire();
    }
    getWebviewTitle() {
        return this._webviewTitle;
    }
    get webview() {
        return this._webview;
    }
    get extension() {
        return this.webview.extension;
    }
    getIcon() {
        if (!this._iconPath) {
            return;
        }
        if (ThemeIcon.isThemeIcon(this._iconPath)) {
            return this._iconPath;
        }
        return isDark(this._themeService.getColorTheme().type)
            ? this._iconPath.dark
            : (this._iconPath.light ?? this._iconPath.dark);
    }
    get iconPath() {
        return this._iconPath;
    }
    set iconPath(value) {
        this._iconPath = value;
        this._onDidChangeLabel.fire();
    }
    matches(other) {
        return super.matches(other) || other === this;
    }
    get group() {
        return this._group;
    }
    updateGroup(group) {
        this._group = group;
    }
    transfer(other) {
        if (this._hasTransfered) {
            return undefined;
        }
        this._hasTransfered = true;
        other._webview = this._webview;
        return other;
    }
    claim(claimant, targetWindow, scopedContextKeyService) {
        return this._webview.claim(claimant, targetWindow, scopedContextKeyService);
    }
};
WebviewInput = WebviewInput_1 = __decorate([
    __param(2, IThemeService)
], WebviewInput);
export { WebviewInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdQYW5lbC9icm93c2VyL3dlYnZpZXdFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBVTdELElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxXQUFXOzthQUU5QixXQUFNLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW9DO0lBRXhELElBQW9CLE1BQU07UUFDekIsT0FBTyxjQUFZLENBQUMsTUFBTSxDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFvQixRQUFRO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBb0IsWUFBWTtRQUMvQixPQUFPLG9GQUFvRSxzREFBNEMsQ0FBQztJQUN6SCxDQUFDO0lBWUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2YsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1lBQzVCLElBQUksRUFBRSx5QkFBeUIsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1NBQ3BFLENBQUMsQ0FBQztJQUNKLENBQUM7SUFLRCxZQUNDLElBQTBCLEVBQzFCLE9BQXdCLEVBQ1QsYUFBNkM7UUFFNUQsS0FBSyxFQUFFLENBQUM7UUFGd0Isa0JBQWEsR0FBYixhQUFhLENBQWU7UUF2QjVDLGdCQUFXLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFRdEMsbUJBQWMsR0FBRyxLQUFLLENBQUM7UUFtQjlCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFFbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQy9CLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUV4QixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDdkQsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUNELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRWUsT0FBTztRQUN0QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDM0IsQ0FBQztJQUVlLFFBQVEsQ0FBQyxVQUFzQjtRQUM5QyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRWUsY0FBYztRQUM3QixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU0sZUFBZSxDQUFDLEtBQWE7UUFDbkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTSxlQUFlO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDL0IsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN2QixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUM7WUFDckQsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSTtZQUNyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxJQUFXLFFBQVEsQ0FBQyxLQUFrQztRQUNyRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVlLE9BQU8sQ0FBQyxLQUF3QztRQUMvRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFTSxXQUFXLENBQUMsS0FBc0I7UUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVTLFFBQVEsQ0FBQyxLQUFtQjtRQUNyQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDM0IsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLEtBQUssQ0FBQyxRQUFpQixFQUFFLFlBQXdCLEVBQUUsdUJBQXVEO1FBQ2hILE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQzdFLENBQUM7O0FBN0lXLFlBQVk7SUF1Q3RCLFdBQUEsYUFBYSxDQUFBO0dBdkNILFlBQVksQ0E4SXhCIn0=