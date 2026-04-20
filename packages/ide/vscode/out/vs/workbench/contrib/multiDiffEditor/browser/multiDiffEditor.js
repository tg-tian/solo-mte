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
var MultiDiffEditor_1;
import * as DOM from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { MultiDiffEditorWidget } from '../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorWidget.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { FloatingClickMenu } from '../../../../platform/actions/browser/floatingMenu.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ResourceLabel } from '../../../browser/labels.js';
import { AbstractEditorWithViewState } from '../../../browser/parts/editor/editorWithViewState.js';
import { MultiDiffEditorInput } from './multiDiffEditorInput.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
let MultiDiffEditor = class MultiDiffEditor extends AbstractEditorWithViewState {
    static { MultiDiffEditor_1 = this; }
    static { this.ID = 'multiDiffEditor'; }
    get viewModel() {
        return this._viewModel;
    }
    constructor(group, instantiationService, telemetryService, themeService, storageService, editorService, editorGroupService, textResourceConfigurationService, editorProgressService, menuService) {
        super(MultiDiffEditor_1.ID, group, 'multiDiffEditor', telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService);
        this.editorProgressService = editorProgressService;
        this.menuService = menuService;
        this._multiDiffEditorWidget = undefined;
    }
    createEditor(parent) {
        this._multiDiffEditorWidget = this._register(this.instantiationService.createInstance(MultiDiffEditorWidget, parent, this.instantiationService.createInstance(WorkbenchUIElementFactory)));
        this._register(this._multiDiffEditorWidget.onDidChangeActiveControl(() => {
            this._onDidChangeControl.fire();
        }));
        const scopedContextKeyService = this._multiDiffEditorWidget.getContextKeyService();
        const scopedInstantiationService = this._multiDiffEditorWidget.getScopedInstantiationService();
        this._sessionResourceContextKey = this._register(scopedInstantiationService.createInstance(ResourceContextKey));
        this._contentOverlay = this._register(new MultiDiffEditorContentMenuOverlay(this._multiDiffEditorWidget.getRootElement(), this._sessionResourceContextKey, scopedContextKeyService, this.menuService, scopedInstantiationService));
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this._viewModel = await input.getViewModel();
        this._sessionResourceContextKey?.set(input.resource);
        this._contentOverlay?.updateResource(input.resource);
        this._multiDiffEditorWidget.setViewModel(this._viewModel);
        const viewState = this.loadEditorViewState(input, context);
        if (viewState) {
            this._multiDiffEditorWidget.setViewState(viewState);
        }
        this._applyOptions(options);
    }
    setOptions(options) {
        this._applyOptions(options);
    }
    _applyOptions(options) {
        const viewState = options?.viewState;
        if (!viewState || !viewState.revealData) {
            return;
        }
        this._multiDiffEditorWidget?.reveal(viewState.revealData.resource, {
            range: viewState.revealData.range ? Range.lift(viewState.revealData.range) : undefined,
            highlight: true
        });
    }
    async clearInput() {
        await super.clearInput();
        this._sessionResourceContextKey?.set(null);
        this._contentOverlay?.updateResource(undefined);
        this._multiDiffEditorWidget.setViewModel(undefined);
    }
    layout(dimension) {
        this._multiDiffEditorWidget.layout(dimension);
    }
    getControl() {
        return this._multiDiffEditorWidget.getActiveControl();
    }
    focus() {
        super.focus();
        this._multiDiffEditorWidget?.getActiveControl()?.focus();
    }
    hasFocus() {
        return this._multiDiffEditorWidget?.getActiveControl()?.hasTextFocus() || super.hasFocus();
    }
    computeEditorViewState(resource) {
        return this._multiDiffEditorWidget.getViewState();
    }
    tracksEditorViewState(input) {
        return input instanceof MultiDiffEditorInput;
    }
    toEditorViewStateResource(input) {
        return input.resource;
    }
    tryGetCodeEditor(resource) {
        return this._multiDiffEditorWidget.tryGetCodeEditor(resource);
    }
    findDocumentDiffItem(resource) {
        const i = this._multiDiffEditorWidget.findDocumentDiffItem(resource);
        if (!i) {
            return undefined;
        }
        const i2 = i;
        return i2.multiDiffEditorItem;
    }
    goToNextChange() {
        this._multiDiffEditorWidget?.goToNextChange();
    }
    goToPreviousChange() {
        this._multiDiffEditorWidget?.goToPreviousChange();
    }
    async showWhile(promise) {
        return this.editorProgressService.showWhile(promise);
    }
};
MultiDiffEditor = MultiDiffEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITelemetryService),
    __param(3, IThemeService),
    __param(4, IStorageService),
    __param(5, IEditorService),
    __param(6, IEditorGroupsService),
    __param(7, ITextResourceConfigurationService),
    __param(8, IEditorProgressService),
    __param(9, IMenuService)
], MultiDiffEditor);
export { MultiDiffEditor };
class MultiDiffEditorContentMenuOverlay extends Disposable {
    constructor(root, resourceContextKey, contextKeyService, menuService, instantiationService) {
        super();
        this.overlayStore = this._register(new MutableDisposable());
        this.resourceContextKey = resourceContextKey;
        const menu = this._register(menuService.createMenu(MenuId.MultiDiffEditorContent, contextKeyService));
        this.rebuild = () => {
            this.overlayStore.clear();
            const hasActions = menu.getActions().length > 0;
            if (!hasActions) {
                return;
            }
            const container = DOM.h('div.floating-menu-overlay-widget.multi-diff-root-floating-menu');
            root.appendChild(container.root);
            const floatingMenu = instantiationService.createInstance(FloatingClickMenu, {
                container: container.root,
                menuId: MenuId.MultiDiffEditorContent,
                getActionArg: () => this.currentResource,
            });
            const store = new DisposableStore();
            store.add(floatingMenu);
            store.add(toDisposable(() => container.root.remove()));
            this.overlayStore.value = store;
        };
        this.rebuild();
        this._register(menu.onDidChange(() => {
            this.overlayStore.clear();
            this.rebuild();
        }));
        this._register(resourceContextKey);
    }
    updateResource(resource) {
        this.currentResource = resource;
        // Update context key and rebuild so menu arg matches
        this.resourceContextKey.set(resource ?? null);
        this.overlayStore.clear();
        this.rebuild();
    }
}
let WorkbenchUIElementFactory = class WorkbenchUIElementFactory {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
    }
    createResourceLabel(element) {
        const label = this._instantiationService.createInstance(ResourceLabel, element, {});
        return {
            setUri(uri, options = {}) {
                if (!uri) {
                    label.element.clear();
                }
                else {
                    label.element.setFile(uri, { strikethrough: options.strikethrough });
                }
            },
            dispose() {
                label.dispose();
            }
        };
    }
};
WorkbenchUIElementFactory = __decorate([
    __param(0, IInstantiationService)
], WorkbenchUIElementFactory);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL211bHRpRGlmZkVkaXRvci9icm93c2VyL211bHRpRGlmZkVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUVuSCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBSW5HLE9BQU8sRUFBNEMsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMzRyxPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBTWxGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU3RCxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLDJCQUFzRDs7YUFDMUUsT0FBRSxHQUFHLGlCQUFpQixBQUFwQixDQUFxQjtJQU92QyxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxZQUNDLEtBQW1CLEVBQ0ksb0JBQTBDLEVBQzlDLGdCQUFtQyxFQUN2QyxZQUEyQixFQUN6QixjQUErQixFQUNoQyxhQUE2QixFQUN2QixrQkFBd0MsRUFDM0IsZ0NBQW1FLEVBQzlFLHFCQUFxRCxFQUMvRCxXQUEwQztRQUV4RCxLQUFLLENBQ0osaUJBQWUsQ0FBQyxFQUFFLEVBQ2xCLEtBQUssRUFDTCxpQkFBaUIsRUFDakIsZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQixjQUFjLEVBQ2QsZ0NBQWdDLEVBQ2hDLFlBQVksRUFDWixhQUFhLEVBQ2Isa0JBQWtCLENBQ2xCLENBQUM7UUFkOEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQW5CakQsMkJBQXNCLEdBQXNDLFNBQVMsQ0FBQztJQWlDOUUsQ0FBQztJQUVTLFlBQVksQ0FBQyxNQUFtQjtRQUN6QyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUNwRixxQkFBcUIsRUFDckIsTUFBTSxFQUNOLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FDbkUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFO1lBQ3hFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUNuRixNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBQy9GLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDaEgsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUNBQWlDLENBQzFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLEVBQUUsRUFDNUMsSUFBSSxDQUFDLDBCQUEwQixFQUMvQix1QkFBdUIsRUFDdkIsSUFBSSxDQUFDLFdBQVcsRUFDaEIsMEJBQTBCLENBQzFCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQTJCLEVBQUUsT0FBNEMsRUFBRSxPQUEyQixFQUFFLEtBQXdCO1FBQ3ZKLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzdDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsc0JBQXVCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUUzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsc0JBQXVCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFUSxVQUFVLENBQUMsT0FBNEM7UUFDL0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sYUFBYSxDQUFDLE9BQTRDO1FBQ2pFLE1BQU0sU0FBUyxHQUFHLE9BQU8sRUFBRSxTQUFTLENBQUM7UUFDckMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN6QyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDbEUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDdEYsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLFVBQVU7UUFDeEIsTUFBTSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsc0JBQXVCLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxNQUFNLENBQUMsU0FBd0I7UUFDOUIsSUFBSSxDQUFDLHNCQUF1QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRVEsVUFBVTtRQUNsQixPQUFPLElBQUksQ0FBQyxzQkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3hELENBQUM7SUFFUSxLQUFLO1FBQ2IsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDMUQsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDNUYsQ0FBQztJQUVrQixzQkFBc0IsQ0FBQyxRQUFhO1FBQ3RELE9BQU8sSUFBSSxDQUFDLHNCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3BELENBQUM7SUFFa0IscUJBQXFCLENBQUMsS0FBa0I7UUFDMUQsT0FBTyxLQUFLLFlBQVksb0JBQW9CLENBQUM7SUFDOUMsQ0FBQztJQUVrQix5QkFBeUIsQ0FBQyxLQUFrQjtRQUM5RCxPQUFRLEtBQThCLENBQUMsUUFBUSxDQUFDO0lBQ2pELENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxRQUFhO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLHNCQUF1QixDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxRQUFhO1FBQ3hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxzQkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFBQyxPQUFPLFNBQVMsQ0FBQztRQUFDLENBQUM7UUFDN0IsTUFBTSxFQUFFLEdBQUcsQ0FBNkMsQ0FBQztRQUN6RCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztJQUMvQixDQUFDO0lBRU0sY0FBYztRQUNwQixJQUFJLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLENBQUM7SUFDL0MsQ0FBQztJQUVNLGtCQUFrQjtRQUN4QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztJQUNuRCxDQUFDO0lBRU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUF5QjtRQUMvQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEQsQ0FBQzs7QUFwSlcsZUFBZTtJQWN6QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLGlDQUFpQyxDQUFBO0lBQ2pDLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxZQUFZLENBQUE7R0F0QkYsZUFBZSxDQXFKM0I7O0FBRUQsTUFBTSxpQ0FBa0MsU0FBUSxVQUFVO0lBTXpELFlBQ0MsSUFBaUIsRUFDakIsa0JBQXNDLEVBQ3RDLGlCQUFxQyxFQUNyQyxXQUF5QixFQUN6QixvQkFBMkM7UUFFM0MsS0FBSyxFQUFFLENBQUM7UUFaUSxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBbUIsQ0FBQyxDQUFDO1FBYXhGLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztRQUU3QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUV0RyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtZQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRTFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDakIsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdFQUFnRSxDQUFDLENBQUM7WUFDMUYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFO2dCQUMzRSxTQUFTLEVBQUUsU0FBUyxDQUFDLElBQUk7Z0JBQ3pCLE1BQU0sRUFBRSxNQUFNLENBQUMsc0JBQXNCO2dCQUNyQyxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWU7YUFDeEMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hCLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNqQyxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLGNBQWMsQ0FBQyxRQUF5QjtRQUM5QyxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQztRQUNoQyxxREFBcUQ7UUFDckQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUNEO0FBR0QsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBeUI7SUFDOUIsWUFDeUMscUJBQTRDO1FBQTVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7SUFDakYsQ0FBQztJQUVMLG1CQUFtQixDQUFDLE9BQW9CO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRixPQUFPO1lBQ04sTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLEdBQUcsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUNWLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7Z0JBQ3RFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTztnQkFDTixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXBCSyx5QkFBeUI7SUFFNUIsV0FBQSxxQkFBcUIsQ0FBQTtHQUZsQix5QkFBeUIsQ0FvQjlCIn0=