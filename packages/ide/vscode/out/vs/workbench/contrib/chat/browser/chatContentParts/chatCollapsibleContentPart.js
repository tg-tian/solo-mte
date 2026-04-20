/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../../../../base/browser/dom.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { renderFileWidgets } from '../chatInlineAnchorWidget.js';
export class ChatCollapsibleContentPart extends Disposable {
    constructor(title, context) {
        super();
        this.title = title;
        this.context = context;
        this._renderedTitleWithWidgets = this._register(new MutableDisposable());
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._isExpanded = observableValue(this, false);
        this.hasFollowingContent = this.context.contentIndex + 1 < this.context.content.length;
    }
    get domNode() {
        this._domNode ??= this.init();
        return this._domNode;
    }
    init() {
        const referencesLabel = this.title;
        const buttonElement = $('.chat-used-context-label', undefined);
        const collapseButton = this._register(new ButtonWithIcon(buttonElement, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined
        }));
        this._collapseButton = collapseButton;
        this._domNode = $('.chat-used-context', undefined, buttonElement);
        collapseButton.label = referencesLabel;
        this._register(collapseButton.onDidClick(() => {
            const value = this._isExpanded.get();
            this._isExpanded.set(!value, undefined);
        }));
        this._register(autorun(r => {
            const expanded = this._isExpanded.read(r);
            collapseButton.icon = expanded ? Codicon.chevronDown : Codicon.chevronRight;
            this._domNode?.classList.toggle('chat-used-context-collapsed', !expanded);
            this.updateAriaLabel(collapseButton.element, typeof referencesLabel === 'string' ? referencesLabel : referencesLabel.value, expanded);
            if (this._domNode?.isConnected) {
                queueMicrotask(() => {
                    this._onDidChangeHeight.fire();
                });
            }
        }));
        const content = this.initContent();
        this._domNode.appendChild(content);
        return this._domNode;
    }
    updateAriaLabel(element, label, expanded) {
        element.ariaLabel = label;
        element.ariaExpanded = String(expanded);
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    get expanded() {
        return this._isExpanded;
    }
    isExpanded() {
        return this._isExpanded.get();
    }
    setExpanded(value) {
        this._isExpanded.set(value, undefined);
    }
    setTitle(title) {
        this.title = title;
        if (this._collapseButton) {
            this._collapseButton.label = title;
            this.updateAriaLabel(this._collapseButton.element, title, this.isExpanded());
        }
    }
    // Render collapsible dropdown title with widgets
    setTitleWithWidgets(content, instantiationService, chatMarkdownAnchorService, chatContentMarkdownRenderer) {
        if (this._store.isDisposed || !this._collapseButton) {
            return;
        }
        const result = chatContentMarkdownRenderer.render(content);
        result.element.classList.add('collapsible-title-content');
        renderFileWidgets(result.element, instantiationService, chatMarkdownAnchorService, this._store);
        const labelElement = this._collapseButton.labelElement;
        labelElement.textContent = '';
        labelElement.appendChild(result.element);
        const textContent = result.element.textContent || '';
        this.updateAriaLabel(this._collapseButton.element, textContent, this.isExpanded());
        this._renderedTitleWithWidgets.value = result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbGxhcHNpYmxlQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBSWpHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBT2pFLE1BQU0sT0FBZ0IsMEJBQTJCLFNBQVEsVUFBVTtJQVlsRSxZQUNTLEtBQStCLEVBQ3BCLE9BQXNDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBSEEsVUFBSyxHQUFMLEtBQUssQ0FBMEI7UUFDcEIsWUFBTyxHQUFQLE9BQU8sQ0FBK0I7UUFYekMsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFxQixDQUFDLENBQUM7UUFFckYsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDNUQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUd4RCxnQkFBVyxHQUFHLGVBQWUs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