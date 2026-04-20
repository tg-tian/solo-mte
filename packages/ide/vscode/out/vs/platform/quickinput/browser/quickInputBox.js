/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { FindInput } from '../../../base/browser/ui/findinput/findInput.js';
import { createToggleActionViewItemProvider } from '../../../base/browser/ui/toggle/toggle.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import Severity from '../../../base/common/severity.js';
import './media/quickInput.css';
const $ = dom.$;
export class QuickInputBox extends Disposable {
    constructor(parent, inputBoxStyles, toggleStyles) {
        super();
        this.parent = parent;
        this.onDidChange = (handler) => {
            return this.findInput.onDidChange(handler);
        };
        this.container = dom.append(this.parent, $('.quick-input-box'));
        this.findInput = this._register(new FindInput(this.container, undefined, {
            label: '',
            inputBoxStyles,
            toggleStyles,
            actionViewItemProvider: createToggleActionViewItemProvider(toggleStyles)
        }));
        const input = this.findInput.inputBox.inputElement;
        input.role = 'textbox';
        input.ariaHasPopup = 'menu';
        input.ariaAutoComplete = 'list';
    }
    get onKeyDown() {
        return this.findInput.onKeyDown;
    }
    get onMouseDown() {
        return this.findInput.onMouseDown;
    }
    get value() {
        return this.findInput.getValue();
    }
    set value(value) {
        this.findInput.setValue(value);
    }
    select(range = null) {
        this.findInput.inputBox.select(range);
    }
    getSelection() {
        return this.findInput.inputBox.getSelection();
    }
    isSelectionAtEnd() {
        return this.findInput.inputBox.isSelectionAtEnd();
    }
    setPlaceholder(placeholder) {
        this.findInput.inputBox.setPlaceHolder(placeholder);
    }
    get placeholder() {
        return this.findInput.inputBox.inputElement.getAttribute('placeholder') || '';
    }
    set placeholder(placeholder) {
        this.findInput.inputBox.setPlaceHolder(placeholder);
    }
    get password() {
        return this.findInput.inputBox.inputElement.type === 'password';
    }
    set password(password) {
        this.findInput.inputBox.inputElement.type = password ? 'password' : 'text';
    }
    set enabled(enabled) {
        // We can't disable the input box because it is still used for
        // navigating the list. Instead, we disable the list and the OK
        // so that nothing can be selected.
        // TODO: should this be what we do for all find inputs? Or maybe some _other_ API
        // on findInput to change it to readonly?
        this.findInput.inputBox.inputElement.toggleAttribute('readonly', !enabled);
        // TODO: styles of the quick pick need to be moved to the CSS instead of being in line
        // so things like this can be done in CSS
        // this.findInput.inputBox.inputElement.classList.toggle('disabled', !enabled);
    }
    set toggles(toggles) {
        this.findInput.setAdditionalToggles(toggles);
    }
    set actions(actions) {
        this.setActions(actions);
    }
    setActions(actions, actionViewItemProvider) {
        this.findInput.setActions(actions, actionViewItemProvider);
    }
    get ariaLabel() {
        return this.findInput.inputBox.inputElement.getAttribute('aria-label') || '';
    }
    set ariaLabel(ariaLabel) {
        this.findInput.inputBox.inputElement.setAttribute('aria-label', ariaLabel);
    }
    hasFocus() {
        return this.findInput.inputBox.hasFocus();
    }
    setAttribute(name, value) {
        this.findInput.inputBox.inputElement.setAttribute(name, value);
    }
    removeAttribute(name) {
        this.findInput.inputBox.inputElement.removeAttribute(name);
    }
    showDecoration(decoration) {
        if (decoration === Severity.Ignore) {
            this.findInput.clearMessage();
        }
        else {
            this.findInput.showMessage({ type: decoration === Severity.Info ? 1 /* MessageType.INFO */ : decoration === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */, content: '' });
        }
    }
    stylesForType(decoration) {
        return this.findInput.inputBox.stylesForType(decoration === Severity.Info ? 1 /* MessageType.INFO */ : decoration === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */);
    }
    setFocus() {
        this.findInput.focus();
    }
    layout() {
        this.findInput.inputBox.layout();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dEJveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUU1RSxPQUFPLEVBQUUsa0NBQWtDLEVBQXlCLE1BQU0sMkNBQTJDLENBQUM7QUFHdEgsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sd0JBQXdCLENBQUM7QUFFaEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQixNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFLNUMsWUFDUyxNQUFtQixFQUMzQixjQUErQixFQUMvQixZQUEyQjtRQUUzQixLQUFLLEVBQUUsQ0FBQztRQUpBLFdBQU0sR0FBTixNQUFNLENBQWE7UUE2QjVCLGdCQUFXLEdBQUcsQ0FBQyxPQUFnQyxFQUFlLEVBQUU7WUFDL0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUM7UUExQkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQzVDLElBQUksQ0FBQyxTQUFTLEVBQ2QsU0FBUyxFQUNUO1lBQ0MsS0FBSyxFQUFFLEVBQUU7WUFD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