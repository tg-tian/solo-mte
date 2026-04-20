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
var QuickInputTreeRenderer_1;
import * as cssJs from '../../../../base/browser/cssValue.js';
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { createToggleActionViewItemProvider, TriStateCheckbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { defaultCheckboxStyles } from '../../../theme/browser/defaultStyles.js';
import { isDark } from '../../../theme/common/theme.js';
import { escape } from '../../../../base/common/strings.js';
import { IThemeService } from '../../../theme/common/themeService.js';
import { quickInputButtonToAction } from '../quickInputUtils.js';
const $ = dom.$;
export class QuickInputCheckboxStateHandler extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
    }
    setCheckboxState(node, checked) {
        this._onDidChangeCheckboxState.fire({ item: node, checked });
    }
}
let QuickInputTreeRenderer = class QuickInputTreeRenderer extends Disposable {
    static { QuickInputTreeRenderer_1 = this; }
    static { this.ID = 'quickInputTreeElement'; }
    constructor(_hoverDelegate, _buttonTriggeredEmitter, onCheckedEvent, _checkboxStateHandler, _toggleStyles, _themeService) {
        super();
        this._hoverDelegate = _hoverDelegate;
        this._buttonTriggeredEmitter = _buttonTriggeredEmitter;
        this.onCheckedEvent = onCheckedEvent;
        this._checkboxStateHandler = _checkboxStateHandler;
        this._toggleStyles = _toggleStyles;
        this._themeService = _themeService;
        this.templateId = QuickInputTreeRenderer_1.ID;
    }
    renderTemplate(container) {
        const store = new DisposableStore();
        // Main entry container
        const entry = dom.append(container, $('.quick-input-tree-entry'));
        const checkbox = store.add(new TriStateCheckbox('', false, { ...defaultCheckboxStyles, size: 15 }));
        entry.appendChild(checkbox.domNode);
        const checkboxLabel = dom.append(entry, $('label.quick-input-tree-label'));
        const rows = dom.append(checkboxLabel, $('.quick-input-tree-rows'));
        const row1 = dom.append(rows, $('.quick-input-tree-row'));
        const icon = dom.prepend(row1, $('.quick-input-tree-icon'));
        const label = store.add(new IconLabel(row1, {
            supportHighlights: true,
            supportDescriptionHighlights: true,
            supportIcons: true,
            hoverDelegate: this._hoverDelegate
        }));
        const actionBar = store.add(new ActionBar(entry, {
            actionViewItemProvider: createToggleActionViewItemProvider(this._toggleStyles),
            hoverDelegate: this._hoverDelegate
        }));
        actionBar.domNode.classList.add('quick-input-tree-entry-action-bar');
        return {
            toDisposeTemplate: store,
            entry,
            checkbox,
            icon,
            label,
            actionBar,
            toDisposeElement: new DisposableStore(),
        };
    }
    renderElement(node, _index, templateData, _details) {
        const store = templateData.toDisposeElement;
        const quickTreeItem = node.element;
        // Checkbox
        if (quickTreeItem.pickable === false) {
            // Hide checkbox for non-pickable items
            templateData.checkbox.domNode.style.display = 'none';
        }
        else {
            const checkbox = templateData.checkbox;
            checkbox.domNode.style.display = '';
            checkbox.checked = quickTreeItem.checked ?? false;
            store.add(Event.filter(this.onCheckedEvent, e => e.item === quickTreeItem)(e => checkbox.checked = e.checked));
            if (quickTreeItem.disabled) {
                checkbox.disable();
            }
            store.add(checkbox.onChange((e) => this._checkboxStateHandler.setCheckboxState(quickTreeItem, checkbox.checked)));
        }
        // Icon
        if (quickTreeItem.iconPath) {
            const icon = isDark(this._themeService.getColorTheme().type) ? quickTreeItem.iconPath.dark : (quickTreeItem.iconPath.light ?? quickTreeItem.iconPath.dark);
            const iconUrl = URI.revive(icon);
            templateData.icon.className = 'quick-input-tree-icon';
            templateData.icon.style.backgroundImage = cssJs.asCSSUrl(iconUrl);
        }
        else {
            templateData.icon.style.backgroundImage = '';
            templateData.icon.className = quickTreeItem.iconClass ? `quick-input-tree-icon ${quickTreeItem.iconClass}` : '';
        }
        const { labelHighlights: matches, descriptionHighlights: descriptionMatches } = node.filterData || {};
        // Label and Description
        let descriptionTitle;
        // NOTE: If we bring back quick tool tips, we need to check that here like we do in the QuickInputListRenderer
        if (quickTreeItem.description) {
            descriptionTitle = {
                markdown: {
                    value: escape(quickTreeItem.description),
                    supportThemeIcons: true
                },
                markdownNotSupportedFallback: quickTreeItem.description
            };
        }
        templateData.label.setLabel(quickTreeItem.label, quickTreeItem.description, {
            matches,
            descriptionMatches,
            extraClasses: quickTreeItem.iconClasses,
            italic: quickTreeItem.italic,
            strikethrough: quickTreeItem.strikethrough,
            labelEscapeNewLines: true,
            descriptionTitle
        });
        // Action Bar
        const buttons = quickTreeItem.buttons;
        if (buttons && buttons.length) {
            templateData.actionBar.push(buttons.map((button, index) => quickInputButtonToAction(button, `tree-${index}`, () => this._buttonTriggeredEmitter.fire({ item: quickTreeItem, button }))), { icon: true, label: false });
            templateData.entry.classList.add('has-actions');
        }
        else {
            templateData.entry.classList.remove('has-actions');
        }
    }
    disposeElement(_element, _index, templateData, _details) {
        templateData.toDisposeElement.clear();
        templateData.actionBar.clear();
    }
    disposeTemplate(templateData) {
        templateData.toDisposeElement.dispose();
        templateData.toDisposeTemplate.dispose();
    }
};
QuickInputTreeRenderer = QuickInputTreeRenderer_1 = __decorate([
    __param(5, IThemeService)
], QuickInputTreeRenderer);
export { QuickInputTreeRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvdHJlZS9xdWlja0lucHV0VHJlZVJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssS0FBSyxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0NBQWtDLEVBQWlCLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFbkksT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUdqRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBWWhCLE1BQU0sT0FBTyw4QkFBa0MsU0FBUSxVQUFVO0lBQWpFOztRQUNrQiw4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