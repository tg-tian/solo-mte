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
import * as dom from '../../../../base/browser/dom.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { ObjectTreeElementCollapseState } from '../../../../base/browser/ui/tree/tree.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../../list/browser/listService.js';
import { QuickPickFocus } from '../../common/quickInput.js';
import { QuickInputTreeDelegate } from './quickInputDelegate.js';
import { getParentNodeState } from './quickInputTree.js';
import { QuickTreeAccessibilityProvider } from './quickInputTreeAccessibilityProvider.js';
import { QuickInputTreeFilter } from './quickInputTreeFilter.js';
import { QuickInputCheckboxStateHandler, QuickInputTreeRenderer } from './quickInputTreeRenderer.js';
import { QuickInputTreeSorter } from './quickInputTreeSorter.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
const $ = dom.$;
const flatHierarchyClass = 'quick-input-tree-flat';
class QuickInputTreeIdentityProvider {
    constructor() {
        this._elementIds = new WeakMap();
        this._counter = 0;
    }
    getId(element) {
        let id = element.id;
        if (id !== undefined) {
            return id;
        }
        id = this._elementIds.get(element);
        if (id !== undefined) {
            return id;
        }
        id = `__generated_${this._counter++}`;
        this._elementIds.set(element, id);
        return id;
    }
}
let QuickInputTreeController = class QuickInputTreeController extends Disposable {
    constructor(container, hoverDelegate, styles, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._onDidTriggerButton = this._register(new Emitter());
        this.onDidTriggerButton = this._onDidTriggerButton.event;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this._onDidCheckedLeafItemsChange = this._register(new Emitter());
        this.onDidChangeCheckedLeafItems = this._onDidCheckedLeafItemsChange.event;
        this._onLeave = new Emitter();
        /**
         * Event that is fired when the tree would no longer have focus.
        */
        this.onLeave = this._onLeave.event;
        this._onDidAccept = this._register(new Emitter());
        /**
         * Event that is fired when a non-pickable item is clicked, indicating acceptance.
         */
        this.onDidAccept = this._onDidAccept.event;
        this._container = dom.append(container, $('.quick-input-tree'));
        this._checkboxStateHandler = this._register(new QuickInputCheckboxStateHandler());
        this._renderer = this._register(this.instantiationService.createInstance(QuickInputTreeRenderer, hoverDelegate, this._onDidTriggerButton, this.onDidChangeCheckboxState, this._checkboxStateHandler, styles.toggle));
        this._filter = this.instantiationService.createInstance(QuickInputTreeFilter);
        this._sorter = this._register(new QuickInputTreeSorter());
        this._tree = this._register(this.instantiationService.createInstance((WorkbenchObjectTree), 'QuickInputTree', this._container, new QuickInputTreeDelegate(), [this._renderer], {
            accessibilityProvider: new QuickTreeAccessibilityProvider(this.onDidChangeCheckboxState),
            horizontalScrolling: false,
            multipleSelectionSupport: false,
            findWidgetEnabled: false,
            alwaysConsumeMouseWheel: true,
            hideTwistiesOfChildlessElements: true,
            renderIndentGuides: RenderIndentGuides.None,
            expandOnDoubleClick: true,
            expandOnlyOnTwistieClick: true,
            disableExpandOnSpacebar: true,
            sorter: this._sorter,
            filter: this._filter,
            identityProvider: new QuickInputTreeIdentityProvider()
        }));
        this.registerCheckboxStateListeners();
        this.registerOnDidChangeFocus();
    }
    get tree() {
        return this._tree;
    }
    get renderer() {
        return this._renderer;
    }
    get displayed() {
        return this._container.style.display !== 'none';
    }
    set displayed(value) {
        this._container.style.display = value ? '' : 'none';
    }
    get sortByLabel() {
        return this._sorter.sortByLabel;
    }
    set sortByLabel(value) {
        this._sorter.sortByLabel = value;
        this._tree.resort(null, true);
    }
    getActiveDescendant() {
        return this._tree.getHTMLElement().getAttribute('aria-activedescendant');
    }
    filter(input) {
        this._filter.filterValue = input;
        this._tree.refilter();
    }
    updateFilterOptions(options) {
        if (options.matchOnLabel !== undefined) {
            this._filter.matchOnLabel = options.matchOnLabel;
        }
        if (options.matchOnDescription !== undefined) {
            this._filter.matchOnDescription = options.matchOnDescription;
        }
        this._tree.refilter();
    }
    setTreeData(treeData) {
        let hasNestedItems = false;
        const createTreeElement = (item) => {
            let children;
            if (item.children && item.children.length > 0) {
                hasNestedItems = true;
                children = item.children.map(child => createTreeElement(child));
                item.checked = getParentNodeState(children);
            }
            return {
                element: item,
                children,
                collapsible: !!children,
                collapsed: item.collapsed ?
                    ObjectTreeElementCollapseState.PreserveOrCollapsed :
                    ObjectTreeElementCollapseState.PreserveOrExpanded
            };
        };
        const treeElements = treeData.map(item => createTreeElement(item));
        this._tree.setChildren(null, treeElements);
        this._container.classList.toggle(flatHierarchyClass, !hasNestedItems);
    }
    layout(maxHeight) {
        this._tree.getHTMLElement().style.maxHeight = maxHeight ? `${
        // Make sure height aligns with list item heights
        Math.floor(maxHeight / 44) * 44
            // Add some extra height so that it's clear there's more to scroll
            + 6}px` : '';
        this._tree.layout();
    }
    focus(what) {
        switch (what) {
            case QuickPickFocus.First:
                this._tree.scrollTop = 0;
                this._tree.focusFirst();
                break;
            case QuickPickFocus.Second: {
                this._tree.scrollTop = 0;
                let isSecondItem = false;
                this._tree.focusFirst(undefined, (e) => {
                    if (isSecondItem) {
                        return true;
                    }
                    isSecondItem = !isSecondItem;
                    return false;
                });
                break;
            }
            case QuickPickFocus.Last:
                this._tree.scrollTop = this._tree.scrollHeight;
                this._tree.focusLast();
                break;
            case QuickPickFocus.Next: {
                const prevFocus = this._tree.getFocus();
                this._tree.focusNext(undefined, false, undefined, (e) => {
                    this._tree.reveal(e.element);
                    return true;
                });
                const currentFocus = this._tree.getFocus();
                if (prevFocus.length && prevFocus[0] === currentFocus[0]) {
                    this._onLeave.fire();
                }
                break;
            }
            case QuickPickFocus.Previous: {
                const prevFocus = this._tree.getFocus();
                this._tree.focusPrevious(undefined, false, undefined, (e) => {
                    // do we want to reveal the parent?
                    this._tree.reveal(e.element);
                    return true;
                });
                const currentFocus = this._tree.getFocus();
                if (prevFocus.length && prevFocus[0] === currentFocus[0]) {
                    this._onLeave.fire();
                }
                break;
            }
            case QuickPickFocus.NextPage:
                this._tree.focusNextPage(undefined, (e) => {
                    this._tree.reveal(e.element);
                    return true;
                });
                break;
            case QuickPickFocus.PreviousPage:
                this._tree.focusPreviousPage(undefined, (e) => {
                    // do we want to reveal the parent?
                    this._tree.reveal(e.element);
                    return true;
                });
                break;
            case QuickPickFocus.NextSeparator:
            case QuickPickFocus.PreviousSeparator:
                // These don't make sense for the tree
                return;
        }
    }
    registerCheckboxStateListeners() {
        this._register(this._tree.onDidOpen(e => {
            const item = e.element;
            if (!item) {
                return;
            }
            if (item.disabled) {
                return;
            }
            // Check if the item is pickable (defaults to true if not specified)
            if (item.pickable === false) {
                // For non-pickable items, set it as the active item and fire the accept event
                this._tree.setFocus([item]);
                this._onDidAccept.fire();
                return;
            }
            const target = e.browserEvent?.target;
            if (target && target.classList.contains(Checkbox.CLASS_NAME)) {
                return;
            }
            this.updateCheckboxState(item, item.checked === true);
        }));
        this._register(this._checkboxStateHandler.onDidChangeCheckboxState(e => {
            this.updateCheckboxState(e.item, e.checked === true);
        }));
    }
    updateCheckboxState(item, newState) {
        if ((item.checked ?? false) === newState) {
            return; // No change
        }
        // Handle checked item
        item.checked = newState;
        this._tree.rerender(item);
        // Handle children of the checked item
        const updateSet = new Set();
        const toUpdate = [...this._tree.getNode(item).children];
        while (toUpdate.length) {
            const pop = toUpdate.shift();
            if (pop?.element && !updateSet.has(pop.element)) {
                updateSet.add(pop.element);
                if ((pop.element.checked ?? false) !== item.checked) {
                    pop.element.checked = item.checked;
                    this._tree.rerender(pop.element);
                }
                toUpdate.push(...pop.children);
            }
        }
        // Handle parents of the checked item
        let parent = this._tree.getParentElement(item);
        while (parent) {
            const parentChildren = [...this._tree.getNode(parent).children];
            const newState = getParentNodeState(parentChildren);
            if ((parent.checked ?? false) !== newState) {
                parent.checked = newState;
                this._tree.rerender(parent);
            }
            parent = this._tree.getParentElement(parent);
        }
        this._onDidChangeCheckboxState.fire({
            item,
            checked: item.checked ?? false
        });
        this._onDidCheckedLeafItemsChange.fire(this.getCheckedLeafItems());
    }
    registerOnDidChangeFocus() {
        // Ensure that selection follows focus
        this._register(this._tree.onDidChangeFocus(e => {
            const item = this._tree.getFocus().findLast(item => item !== null);
            this._tree.setSelection(item ? [item] : [], e.browserEvent);
        }));
    }
    getCheckedLeafItems() {
        const lookedAt = new Set();
        const toLookAt = [...this._tree.getNode().children];
        const checkedItems = new Array();
        while (toLookAt.length) {
            const lookAt = toLookAt.shift();
            if (!lookAt?.element || lookedAt.has(lookAt.element)) {
                continue;
            }
            if (lookAt.element.checked) {
                lookedAt.add(lookAt.element);
                toLookAt.push(...lookAt.children);
                if (!lookAt.element.children) {
                    checkedItems.push(lookAt.element);
                }
            }
        }
        return checkedItems;
    }
    getActiveItems() {
        return this._tree.getFocus().filter((item) => item !== null);
    }
    check(element, checked) {
        if (element.checked === checked) {
            return;
        }
        element.checked = checked;
        this._onDidCheckedLeafItemsChange.fire(this.getCheckedLeafItems());
    }
    checkAll(checked) {
        const updated = new Set();
        const toUpdate = [...this._tree.getNode().children];
        let fireCheckedChangeEvent = false;
        while (toUpdate.length) {
            const update = toUpdate.shift();
            if (!update?.element || updated.has(update.element)) {
                continue;
            }
            if (update.element.checked !== checked) {
                fireCheckedChangeEvent = true;
                update.element.checked = checked;
                toUpdate.push(...update.children);
                updated.add(update.element);
                this._tree.rerender(update.element);
                this._onDidChangeCheckboxState.fire({
                    item: update.element,
                    checked: update.element.checked
                });
            }
        }
        if (fireCheckedChangeEvent) {
            this._onDidCheckedLeafItemsChange.fire(this.getCheckedLeafItems());
        }
    }
};
QuickInputTreeController = __decorate([
    __param(3, IInstantiationService)
], QuickInputTreeController);
export { QuickInputTreeController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWVDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci90cmVlL3F1aWNrSW5wdXRUcmVlQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXRGLE9BQU8sRUFBc0IsOEJBQThCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU5RyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBc0UsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDaEksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUF3QixNQUFNLHFCQUFxQixDQUFDO0FBQy9FLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FB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