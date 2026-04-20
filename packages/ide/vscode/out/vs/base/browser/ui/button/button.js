/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, EventHelper, EventType, isActiveElement, reset, trackFocus, $ } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { renderMarkdown, renderAsPlaintext } from '../../markdownRenderer.js';
import { Gesture, EventType as TouchEventType } from '../../touch.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../iconLabel/iconLabels.js';
import { toAction } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { Color } from '../../../common/color.js';
import { Emitter } from '../../../common/event.js';
import { isMarkdownString, markdownStringEqual } from '../../../common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import { ThemeIcon } from '../../../common/themables.js';
import './button.css';
import { localize } from '../../../../nls.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { safeSetInnerHtml } from '../../domSanitize.js';
export const unthemedButtonStyles = {
    buttonBackground: '#0E639C',
    buttonHoverBackground: '#006BB3',
    buttonSeparator: Color.white.toString(),
    buttonForeground: Color.white.toString(),
    buttonBorder: undefined,
    buttonSecondaryBackground: undefined,
    buttonSecondaryForeground: undefined,
    buttonSecondaryHoverBackground: undefined
};
// Only allow a very limited set of inline html tags
const buttonSanitizerConfig = Object.freeze({
    allowedTags: {
        override: ['b', 'i', 'u', 'code', 'span'],
    },
    allowedAttributes: {
        override: ['class'],
    },
});
export class Button extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidEscape() { return this._onDidEscape.event; }
    constructor(container, options) {
        super();
        this._label = '';
        this._onDidClick = this._register(new Emitter());
        this._onDidEscape = this._register(new Emitter());
        this.options = options;
        this._element = document.createElement('a');
        this._element.classList.add('monaco-button');
        this._element.tabIndex = 0;
        this._element.setAttribute('role', 'button');
        this._element.classList.toggle('secondary', !!options.secondary);
        const background = options.secondary ? options.buttonSecondaryBackground : options.buttonBackground;
        const foreground = options.secondary ? options.buttonSecondaryForeground : options.buttonForeground;
        this._element.style.color = foreground || '';
        this._element.style.backgroundColor = background || '';
        if (options.supportShortLabel) {
            this._labelShortElement = document.createElement('div');
            this._labelShortElement.classList.add('monaco-button-label-short');
            this._element.appendChild(this._labelShortElement);
            this._labelElement = document.createElement('div');
            this._labelElement.classList.add('monaco-button-label');
            this._element.appendChild(this._labelElement);
            this._element.classList.add('monaco-text-button-with-short-label');
        }
        if (typeof options.title === 'string') {
            this.setTitle(options.title);
        }
        if (typeof options.ariaLabel === 'string') {
            this._element.setAttribute('aria-label', options.ariaLabel);
        }
        container.appendChild(this._element);
        this.enabled = !options.disabled;
        this._register(Gesture.addTarget(this._element));
        [EventType.CLICK, TouchEventType.Tap].forEach(eventType => {
            this._register(addDisposableListener(this._element, eventType, e => {
                if (!this.enabled) {
                    EventHelper.stop(e);
                    return;
                }
                this._onDidClick.fire(e);
            }));
        });
        this._register(addDisposableListener(this._element, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = false;
            if (this.enabled && (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */))) {
                this._onDidClick.fire(e);
                eventHandled = true;
            }
            else if (event.equals(9 /* KeyCode.Escape */)) {
                this._onDidEscape.fire(e);
                this._element.blur();
                eventHandled = true;
            }
            if (eventHandled) {
                EventHelper.stop(event, true);
            }
        }));
        this._register(addDisposableListener(this._element, EventType.MOUSE_OVER, e => {
            if (!this._element.classList.contains('disabled')) {
                this.updateStyles(true);
            }
        }));
        this._register(addDisposableListener(this._element, EventType.MOUSE_OUT, e => {
            this.updateStyles(false); // restore standard styles
        }));
        // Also set hover background when button is focused for feedback
        this.focusTracker = this._register(trackFocus(this._element));
        this._register(this.focusTracker.onDidFocus(() => { if (this.enabled) {
            this.updateStyles(true);
        } }));
        this._register(this.focusTracker.onDidBlur(() => { if (this.enabled) {
            this.updateStyles(false);
        } }));
    }
    dispose() {
        super.dispose();
        this._element.remove();
    }
    getContentElements(content) {
        const elements = [];
        for (let segment of renderLabelWithIcons(content)) {
            if (typeof (segment) === 'string') {
                segment = segment.trim();
                // Ignore empty segment
                if (segment === '') {
                    continue;
                }
                // Convert string segments to <span> nodes
                const node = document.createElement('span');
                node.textContent = segment;
                elements.push(node);
            }
            else {
                elements.push(segment);
            }
        }
        return elements;
    }
    updateStyles(hover) {
        let background;
        let foreground;
        if (this.options.secondary) {
            background = hover ? this.options.buttonSecondaryHoverBackground : this.options.buttonSecondaryBackground;
            foreground = this.options.buttonSecondaryForeground;
        }
        else {
            background = hover ? this.options.buttonHoverBackground : this.options.buttonBackground;
            foreground = this.options.buttonForeground;
        }
        this._element.style.backgroundColor = background || '';
        this._element.style.color = foreground || '';
    }
    get element() {
        return this._element;
    }
    set label(value) {
        if (this._label === value) {
            return;
        }
        if (isMarkdownString(this._label) && isMarkdownString(value) && markdownStringEqual(this._label, value)) {
            return;
        }
        this._element.classList.add('monaco-text-button');
        const labelElement = this.options.supportShortLabel ? this._labelElement : this._element;
        if (isMarkdownString(value)) {
            const rendered = renderMarkdown(value, undefined, document.createElement('span'));
            rendered.dispose();
            // Don't include outer `<p>`
            // eslint-disable-next-line no-restricted-syntax
            const root = rendered.element.querySelector('p')?.innerHTML;
            if (root) {
                safeSetInnerHtml(labelElement, root, buttonSanitizerConfig);
            }
            else {
                reset(labelElement);
            }
        }
        else {
            if (this.options.supportIcons) {
                reset(labelElement, ...this.getContentElements(value));
            }
            else {
                labelElement.textContent = value;
            }
        }
        let title = '';
        if (typeof this.options.title === 'string') {
            title = this.options.title;
        }
        else if (this.options.title) {
            title = renderAsPlaintext(value);
        }
        this.setTitle(title);
        this._setAriaLabel();
        this._label = value;
    }
    get label() {
        return this._label;
    }
    set labelShort(value) {
        if (!this.options.supportShortLabel || !this._labelShortElement) {
            return;
        }
        if (this.options.supportIcons) {
            reset(this._labelShortElement, ...this.getContentElements(value));
        }
        else {
            this._labelShortElement.textContent = value;
        }
    }
    _setAriaLabel() {
        if (typeof this.options.ariaLabel === 'string') {
            this._element.setAttribute('aria-label', this.options.ariaLabel);
        }
        else if (typeof this.options.title === 'string') {
            this._element.setAttribute('aria-label', this.options.title);
        }
    }
    set icon(icon) {
        this._setAriaLabel();
        const oldIcons = Array.from(this._element.classList).filter(item => item.startsWith('codicon-'));
        this._element.classList.remove(...oldIcons);
        this._element.classList.add(...ThemeIcon.asClassNameArray(icon));
    }
    set enabled(value) {
        if (value) {
            this._element.classList.remove('disabled');
            this._element.setAttribute('aria-disabled', String(false));
            this._element.tabIndex = 0;
        }
        else {
            this._element.classList.add('disabled');
            this._element.setAttribute('aria-disabled', String(true));
        }
    }
    get enabled() {
        return !this._element.classList.contains('disabled');
    }
    set secondary(value) {
        this._element.classList.toggle('secondary', value);
        this.options.secondary = value;
        this.updateStyles(false);
    }
    set checked(value) {
        if (value) {
            this._element.classList.add('checked');
            this._element.setAttribute('aria-checked', 'true');
        }
        else {
            this._element.classList.remove('checked');
            this._element.setAttribute('aria-checked', 'false');
        }
    }
    get checked() {
        return this._element.classList.contains('checked');
    }
    setTitle(title) {
        if (!this._hover && title !== '') {
            this._hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('element'), this._element, title));
        }
        else if (this._hover) {
            this._hover.update(title);
        }
    }
    focus() {
        this._element.focus();
    }
    hasFocus() {
        return isActiveElement(this._element);
    }
}
export class ButtonWithDropdown extends Disposable {
    constructor(container, options) {
        super();
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.element = document.createElement('div');
        this.element.classList.add('monaco-button-dropdown');
        container.appendChild(this.element);
        if (!options.hoverDelegate) {
            options = { ...options, hoverDelegate: this._register(createInstantHoverDelegate()) };
        }
        this.primaryButton = this._register(new Button(this.element, options));
        this._register(this.primaryButton.onDidClick(e => this._onDidClick.fire(e)));
        this.action = toAction({ id: 'primaryAction', label: renderAsPlaintext(this.primaryButton.label), run: async () => this._onDidClick.fire(undefined) });
        this.separatorContainer = document.createElement('div');
        this.separatorContainer.classList.add('monaco-button-dropdown-separator');
        this.separator = document.createElement('div');
        this.separatorContainer.appendChild(this.separator);
        this.element.appendChild(this.separatorContainer);
        // Separator styles
        const border = options.buttonBorder;
        if (border) {
            this.separatorContainer.style.borderTop = '1px solid ' + border;
            this.separatorContainer.style.borderBottom = '1px solid ' + border;
        }
        const buttonBackground = options.secondary ? options.buttonSecondaryBackground : options.buttonBackground;
        this.separatorContainer.style.backgroundColor = buttonBackground ?? '';
        this.separator.style.backgroundColor = options.buttonSeparator ?? '';
        this.dropdownButton = this._register(new Button(this.element, { ...options, title: localize("button dropdown more actions", 'More Actions...'), supportIcons: true }));
        this.dropdownButton.element.setAttribute('aria-haspopup', 'true');
        this.dropdownButton.element.setAttribute('aria-expanded', 'false');
        this.dropdownButton.element.classList.add('monaco-dropdown-button');
        this.dropdownButton.icon = Codicon.dropDownButton;
        this._register(this.dropdownButton.onDidClick(e => {
            const actions = Array.isArray(options.actions) ? options.actions : options.actions.getActions();
            options.contextMenuProvider.showContextMenu({
                getAnchor: () => this.dropdownButton.element,
                getActions: () => options.addPrimaryActionToDropdown === false ? [...actions] : [this.action, ...actions],
                actionRunner: options.actionRunner,
                onHide: () => this.dropdownButton.element.setAttribute('aria-expanded', 'false'),
                layer: options.dropdownLayer
            });
            this.dropdownButton.element.setAttribute('aria-expanded', 'true');
        }));
    }
    dispose() {
        super.dispose();
        this.element.remove();
    }
    set label(value) {
        this.primaryButton.label = value;
        this.action.label = value;
    }
    set icon(icon) {
        this.primaryButton.icon = icon;
    }
    set enabled(enabled) {
        this.primaryButton.enabled = enabled;
        this.dropdownButton.enabled = enabled;
        this.element.classList.toggle('disabled', !enabled);
    }
    get enabled() {
        return this.primaryButton.enabled;
    }
    set checked(value) {
        this.primaryButton.checked = value;
    }
    get checked() {
        return this.primaryButton.checked;
    }
    focus() {
        this.primaryButton.focus();
    }
    hasFocus() {
        return this.primaryButton.hasFocus() || this.dropdownButton.hasFocus();
    }
}
export class ButtonWithDescription {
    constructor(container, options) {
        this.options = options;
        this._element = document.createElement('div');
        this._element.classList.add('monaco-description-button');
        this._button = new Button(this._element, options);
        this._descriptionElement = document.createElement('div');
        this._descriptionElement.classList.add('monaco-button-description');
        this._element.appendChild(this._descriptionElement);
        container.appendChild(this._element);
    }
    get onDidClick() {
        return this._button.onDidClick;
    }
    get element() {
        return this._element;
    }
    set label(value) {
        this._button.label = value;
    }
    set icon(icon) {
        this._button.icon = icon;
    }
    get enabled() {
        return this._button.enabled;
    }
    set enabled(enabled) {
        this._button.enabled = enabled;
    }
    set checked(value) {
        this._button.checked = value;
    }
    get checked() {
        return this._button.checked;
    }
    focus() {
        this._button.focus();
    }
    hasFocus() {
        return this._button.hasFocus();
    }
    dispose() {
        this._button.dispose();
    }
    set description(value) {
        if (this.options.supportIcons) {
            reset(this._descriptionElement, ...renderLabelWithIcons(value));
        }
        else {
            this._descriptionElement.textContent = value;
        }
    }
}
export var ButtonBarAlignment;
(function (ButtonBarAlignment) {
    ButtonBarAlignment[ButtonBarAlignment["Horizontal"] = 0] = "Horizontal";
    ButtonBarAlignment[ButtonBarAlignment["Vertical"] = 1] = "Vertical";
})(ButtonBarAlignment || (ButtonBarAlignment = {}));
export class ButtonBar {
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this._buttons = [];
        this._buttonStore = new DisposableStore();
    }
    dispose() {
        this._buttonStore.dispose();
    }
    get buttons() {
        return this._buttons;
    }
    clear() {
        this._buttonStore.clear();
        this._buttons.length = 0;
    }
    addButton(options) {
        const button = this._buttonStore.add(new Button(this.container, options));
        this.pushButton(button);
        return button;
    }
    addButtonWithDescription(options) {
        const button = this._buttonStore.add(new ButtonWithDescription(this.container, options));
        this.pushButton(button);
        return button;
    }
    addButtonWithDropdown(options) {
        const button = this._buttonStore.add(new ButtonWithDropdown(this.container, options));
        this.pushButton(button);
        return button;
    }
    pushButton(button) {
        this._buttons.push(button);
        const index = this._buttons.length - 1;
        this._buttonStore.add(addDisposableListener(button.element, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            // Next / Previous Button
            let buttonIndexToFocus;
            if (event.equals(this.options?.alignment === ButtonBarAlignment.Vertical ? 16 /* KeyCode.UpArrow */ : 15 /* KeyCode.LeftArrow */)) {
                buttonIndexToFocus = index > 0 ? index - 1 : this._buttons.length - 1;
            }
            else if (event.equals(this.options?.alignment === ButtonBarAlignment.Vertical ? 18 /* KeyCode.DownArrow */ : 17 /* KeyCode.RightArrow */)) {
                buttonIndexToFocus = index === this._buttons.length - 1 ? 0 : index + 1;
            }
            else {
                eventHandled = false;
            }
            if (eventHandled && typeof buttonIndexToFocus === 'number') {
                this._buttons[buttonIndexToFocus].focus();
                EventHelper.stop(e, true);
            }
        }));
    }
}
/**
 * This is a Button that supports an icon to the left, and markdown to the right, with proper separation and wrapping the markdown label, which Button doesn't do.
 */
export class ButtonWithIcon extends Button {
    get labelElement() { return this._mdlabelElement; }
    constructor(container, options) {
        super(container, options);
        if (options.supportShortLabel) {
            throw new Error('ButtonWithIcon does not support short labels');
        }
        this._element.classList.add('monaco-icon-button');
        this._iconElement = $('');
        this._mdlabelElement = $('.monaco-button-mdlabel');
        this._element.append(this._iconElement, this._mdlabelElement);
    }
    get label() {
        return super.label;
    }
    set label(value) {
        if (this._label === value) {
            return;
        }
        if (isMarkdownString(this._label) && isMarkdownString(value) && markdownStringEqual(this._label, value)) {
            return;
        }
        this._element.classList.add('monaco-text-button');
        if (isMarkdownString(value)) {
            const rendered = renderMarkdown(value, undefined, document.createElement('span'));
            rendered.dispose();
            // eslint-disable-next-line no-restricted-syntax
            const root = rendered.element.querySelector('p')?.innerHTML;
            if (root) {
                safeSetInnerHtml(this._mdlabelElement, root, buttonSanitizerConfig);
            }
            else {
                reset(this._mdlabelElement);
            }
        }
        else {
            if (this.options.supportIcons) {
                reset(this._mdlabelElement, ...this.getContentElements(value));
            }
            else {
                this._mdlabelElement.textContent = value;
            }
        }
        let title = '';
        if (typeof this.options.title === 'string') {
            title = this.options.title;
        }
        else if (this.options.title) {
            title = renderAsPlaintext(value);
        }
        this.setTitle(title);
        this._setAriaLabel();
        this._label = value;
    }
    get icon() {
        return super.icon;
    }
    set icon(icon) {
        this._iconElement.classList.value = '';
        this._iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        this._setAriaLabel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9idXR0b24vYnV0dG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFpQixlQUFlLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDbkksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXZHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xFLE9BQU8sRUFBMEIsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRCxPQUFPLEVBQXNCLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZFLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV4RyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLGNBQWMsQ0FBQztBQUN0QixPQUFP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