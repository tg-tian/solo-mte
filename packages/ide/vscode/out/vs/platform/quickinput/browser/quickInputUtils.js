/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { DomEmitter } from '../../../base/browser/event.js';
import { Event } from '../../../base/common/event.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Gesture, EventType as GestureEventType } from '../../../base/browser/touch.js';
import { renderLabelWithIcons } from '../../../base/browser/ui/iconLabel/iconLabels.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import { parseLinkedText } from '../../../base/common/linkedText.js';
import './media/quickInput.css';
import { localize } from '../../../nls.js';
const iconPathToClass = {};
const iconClassGenerator = new IdGenerator('quick-input-button-icon-');
function getIconClass(iconPath) {
    if (!iconPath) {
        return undefined;
    }
    let iconClass;
    const key = iconPath.dark.toString();
    if (iconPathToClass[key]) {
        iconClass = iconPathToClass[key];
    }
    else {
        iconClass = iconClassGenerator.nextId();
        domStylesheetsJs.createCSSRule(`.${iconClass}, .hc-light .${iconClass}`, `background-image: ${cssJs.asCSSUrl(iconPath.light || iconPath.dark)}`);
        domStylesheetsJs.createCSSRule(`.vs-dark .${iconClass}, .hc-black .${iconClass}`, `background-image: ${cssJs.asCSSUrl(iconPath.dark)}`);
        iconPathToClass[key] = iconClass;
    }
    return iconClass;
}
class QuickInputToggleButtonAction {
    constructor(id, label, tooltip, className, enabled, _checked, run) {
        this.id = id;
        this.label = label;
        this.tooltip = tooltip;
        this.enabled = enabled;
        this._checked = _checked;
        this.run = run;
        this.class = className;
    }
    get checked() {
        return this._checked;
    }
    set checked(value) {
        this._checked = value;
        // Toggles behave like buttons. When clicked, they run... the only difference is that their checked state also changes.
        this.run();
    }
}
export function quickInputButtonToAction(button, id, run) {
    let cssClasses = button.iconClass || getIconClass(button.iconPath);
    if (button.alwaysVisible) {
        cssClasses = cssClasses ? `${cssClasses} always-visible` : 'always-visible';
    }
    const handler = () => {
        if (button.toggle) {
            button.toggle.checked = !button.toggle.checked;
        }
        return run();
    };
    const action = button.toggle
        ? new QuickInputToggleButtonAction(id, '', button.tooltip || '', cssClasses, true, button.toggle.checked, handler)
        : {
            id,
            label: '',
            tooltip: button.tooltip || '',
            class: cssClasses,
            enabled: true,
            run: handler,
        };
    return action;
}
export function renderQuickInputDescription(description, container, actionHandler) {
    dom.reset(container);
    const parsed = parseLinkedText(description);
    let tabIndex = 0;
    for (const node of parsed.nodes) {
        if (typeof node === 'string') {
            container.append(...renderLabelWithIcons(node));
        }
        else {
            let title = node.title;
            if (!title && node.href.startsWith('command:')) {
                title = localize('executeCommand', "Click to execute command '{0}'", node.href.substring('command:'.length));
            }
            else if (!title) {
                title = node.href;
            }
            const anchor = dom.$('a', { href: node.href, title, tabIndex: tabIndex++ }, node.label);
            anchor.style.textDecoration = 'underline';
            const handleOpen = (e) => {
                if (dom.isEventLike(e)) {
                    dom.EventHelper.stop(e, true);
                }
                actionHandler.callback(node.href);
            };
            const onClick = actionHandler.disposables.add(new DomEmitter(anchor, dom.EventType.CLICK)).event;
            const onKeydown = actionHandler.disposables.add(new DomEmitter(anchor, dom.EventType.KEY_DOWN)).event;
            const onSpaceOrEnter = Event.chain(onKeydown, $ => $.filter(e => {
                const event = new StandardKeyboardEvent(e);
                return event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */);
            }));
            actionHandler.disposables.add(Gesture.addTarget(anchor));
            const onTap = actionHandler.disposables.add(new DomEmitter(anchor, GestureEventType.Tap)).event;
            Event.any(onClick, onTap, onSpaceOrEnter)(handleOpen, null, actionHandler.disposables);
            container.appendChild(anchor);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0lucHV0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxLQUFLLEtBQUssTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxJQUFJLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVyRSxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUszQyxNQUFNLGVBQWUsR0FBMkIsRUFBRSxDQUFDO0FBQ25ELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxXQUFXLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUV2RSxTQUFTLFlBQVksQ0FBQyxRQUFnRDtJQUNyRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsSUFBSSxTQUFpQixDQUFD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