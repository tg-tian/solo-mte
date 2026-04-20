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
import { $, clearNode } from '../../../../../base/browser/dom.js';
import { ChatConfiguration, ThinkingDisplayMode } from '../../common/constants.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ChatCollapsibleContentPart } from './chatCollapsibleContentPart.js';
import { localize } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { autorun } from '../../../../../base/common/observable.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import './media/chatThinkingContent.css';
function extractTextFromPart(content) {
    const raw = Array.isArray(content.value) ? content.value.join('') : (content.value || '');
    return raw.trim();
}
function extractTitleFromThinkingContent(content) {
    const headerMatch = content.match(/^\*\*([^*]+)\*\*/);
    return headerMatch ? headerMatch[1] : undefined;
}
let ChatThinkingContentPart = class ChatThinkingContentPart extends ChatCollapsibleContentPart {
    constructor(content, context, chatContentMarkdownRenderer, instantiationService, configurationService, chatMarkdownAnchorService, languageModelsService) {
        const initialText = extractTextFromPart(content);
        const extractedTitle = extractTitleFromThinkingContent(initialText)
            ?? 'Thinking...';
        super(extractedTitle, context);
        this.chatContentMarkdownRenderer = chatContentMarkdownRenderer;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this.languageModelsService = languageModelsService;
        this.defaultTitle = localize('chat.thinking.header', 'Thinking...');
        this.fixedScrollingMode = false;
        this.extractedTitles = [];
        this.toolInvocationCount = 0;
        this.streamingCompleted = false;
        this.isActive = true;
        this.toolInvocations = [];
        this.id = content.id;
        this.content = content;
        const configuredMode = this.configurationService.getValue('chat.agent.thinkingStyle') ?? ThinkingDisplayMode.Collapsed;
        this.fixedScrollingMode = configuredMode === ThinkingDisplayMode.FixedScrolling;
        this.currentTitle = extractedTitle;
        if (extractedTitle !== this.defaultTitle) {
            this.lastExtractedTitle = extractedTitle;
        }
        this.currentThinkingValue = initialText;
        if (configuredMode === ThinkingDisplayMode.Collapsed) {
            this.setExpanded(false);
        }
        else {
            this.setExpanded(true);
        }
        if (this.fixedScrollingMode) {
            this.setExpanded(false);
        }
        const node = this.domNode;
        node.classList.add('chat-thinking-box');
        node.tabIndex = 0;
        if (this.fixedScrollingMode) {
            node.classList.add('chat-thinking-fixed-mode');
            this.currentTitle = this.defaultTitle;
            if (this._collapseButton && !this.context.element.isComplete) {
                this._collapseButton.icon = ThemeIcon.modify(Codicon.loading, 'spin');
            }
        }
        // override for codicon chevron in the collapsible part
        this._register(autorun(r => {
            this.expanded.read(r);
            if (this._collapseButton && this.wrapper) {
                if (this.wrapper.classList.contains('chat-thinking-streaming') && !this.context.element.isComplete) {
                    this._collapseButton.icon = ThemeIcon.modify(Codicon.loading, 'spin');
                }
                else {
                    this._collapseButton.icon = Codicon.check;
                }
            }
        }));
        if (this._collapseButton && !this.streamingCompleted && !this.context.element.isComplete) {
            this._collapseButton.icon = ThemeIcon.modify(Codicon.loading, 'spin');
        }
        const label = this.lastExtractedTitle ?? '';
        if (!this.fixedScrollingMode && !this._isExpanded.get()) {
            this.setTitle(label);
        }
        if (this._collapseButton) {
            this._register(this._collapseButton.onDidClick(() => {
                if (this.streamingCompleted || this.fixedScrollingMode) {
                    return;
                }
                const expanded = this.isExpanded();
                if (expanded) {
                    this.setTitle(this.defaultTitle, true);
                    this.currentTitle = this.defaultTitle;
                }
                else if (this.lastExtractedTitle) {
                    const collapsedLabel = this.lastExtractedTitle ?? '';
                    this.setTitle(collapsedLabel);
                    this.currentTitle = collapsedLabel;
                }
            }));
        }
    }
    // @TODO: @justschen Convert to template for each setting?
    initContent() {
        this.wrapper = $('.chat-used-context-list.chat-thinking-collapsible');
        this.wrapper.classList.add('chat-thinking-streaming');
        if (this.currentThinkingValue) {
            this.textContainer = $('.chat-thinking-item.markdown-content');
            this.wrapper.appendChild(this.textContainer);
            this.renderMarkdown(this.currentThinkingValue);
        }
        this.updateDropdownClickability();
        return this.wrapper;
    }
    renderMarkdown(content, reuseExisting) {
        // Guard against rendering after disposal to avoid leaking disposables
        if (this._store.isDisposed) {
            return;
        }
        const cleanedContent = content.trim();
        if (!cleanedContent) {
            if (this.markdownResult) {
                this.markdownResult.dispose();
                this.markdownResult = undefined;
            }
            clearNode(this.textContainer);
            return;
        }
        // If the entire content is bolded, strip the bold markers for rendering
        let contentToRender = cleanedContent;
        if (cleanedContent.startsWith('**') && cleanedContent.endsWith('**')) {
            contentToRender = cleanedContent.slice(2, -2);
        }
        const target = reuseExisting ? this.markdownResult?.element : undefined;
        if (this.markdownResult) {
            this.markdownResult.dispose();
            this.markdownResult = undefined;
        }
        const rendered = this._register(this.chatContentMarkdownRenderer.render(new MarkdownString(contentToRender), {
            fillInIncompleteTokens: true,
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
            codeBlockRendererSync: (_languageId, text, raw) => {
                const codeElement = $('code');
                codeElement.textContent = text;
                return codeElement;
            }
        }, target));
        this.markdownResult = rendered;
        if (!target) {
            clearNode(this.textContainer);
            this.textContainer.appendChild(rendered.element);
        }
    }
    setDropdownClickable(clickable) {
        if (this._collapseButton) {
            this._collapseButton.element.style.pointerEvents = clickable ? 'auto' : 'none';
        }
        if (!clickable && this.streamingCompleted) {
            super.setTitle(this.lastExtractedTitle ?? this.currentTitle);
        }
    }
    updateDropdownClickability() {
        if (!this.wrapper) {
            return;
        }
        if (this.wrapper.children.length > 1 || this.toolInvocationCount > 0) {
            this.setDropdownClickable(true);
            return;
        }
        const contentWithoutTitle = this.currentThinkingValue.trim();
        const titleToCompare = this.lastExtractedTitle ?? this.currentTitle;
        const stripMarkdown = (text) => {
            return text
                .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').trim();
        };
        const strippedContent = stripMarkdown(contentWithoutTitle);
        const shouldDisable = !strippedContent || strippedContent === titleToCompare;
        this.setDropdownClickable(!shouldDisable);
    }
    resetId() {
        this.id = undefined;
    }
    collapseContent() {
        this.setExpanded(false);
    }
    updateThinking(content) {
        // If disposed, ignore late updates coming from renderer diffing
        if (this._store.isDisposed) {
            return;
        }
        this.content = content;
        const raw = extractTextFromPart(content);
        const next = raw;
        if (next === this.currentThinkingValue) {
            return;
        }
        const previousValue = this.currentThinkingValue;
        const reuseExisting = !!(this.markdownResult && next.startsWith(previousValue) && next.length > previousValue.length);
        this.currentThinkingValue = next;
        this.renderMarkdown(next, reuseExisting);
        if (this.fixedScrollingMode && this.wrapper) {
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }
        const extractedTitle = extractTitleFromThinkingContent(raw);
        if (extractedTitle && extractedTitle !== this.currentTitle) {
            if (!this.extractedTitles.includes(extractedTitle)) {
                this.extractedTitles.push(extractedTitle);
            }
            this.lastExtractedTitle = extractedTitle;
        }
        if (!extractedTitle || extractedTitle === this.currentTitle) {
            return;
        }
        const label = this.lastExtractedTitle ?? '';
        if (!this.fixedScrollingMode && !this._isExpanded.get()) {
            this.setTitle(label);
        }
        this.updateDropdownClickability();
    }
    getIsActive() {
        return this.isActive;
    }
    markAsInactive() {
        this.isActive = false;
    }
    finalizeTitleIfDefault() {
        this.wrapper.classList.remove('chat-thinking-streaming');
        this.streamingCompleted = true;
        if (this._collapseButton) {
            this._collapseButton.icon = Codicon.check;
        }
        this.updateDropdownClickability();
        if (this.content.generatedTitle) {
            this.currentTitle = this.content.generatedTitle;
            super.setTitle(this.content.generatedTitle);
            return;
        }
        const existingToolTitle = this.toolInvocations.find(t => t.generatedTitle)?.generatedTitle;
        if (existingToolTitle) {
            this.currentTitle = existingToolTitle;
            this.content.generatedTitle = existingToolTitle;
            super.setTitle(existingToolTitle);
            return;
        }
        // case where we only have one dropdown in the thinking container and no thinking parts
        if (this.toolInvocationCount === 1 && this.extractedTitles.length === 1 && this.currentToolCallLabel && this.currentThinkingValue.trim() === '') {
            const title = this.currentToolCallLabel;
            this.currentTitle = title;
            this.setTitleWithWidgets(new MarkdownString(title), this.instantiationService, this.chatMarkdownAnchorService, this.chatContentMarkdownRenderer);
            return;
        }
        // if exactly one actual extracted title and no tool invocations, use that as the final title.
        if (this.extractedTitles.length === 1 && this.toolInvocationCount === 0) {
            const title = this.extractedTitles[0];
            this.currentTitle = title;
            this.content.generatedTitle = title;
            super.setTitle(title);
            return;
        }
        const generateTitles = this.configurationService.getValue(ChatConfiguration.ThinkingGenerateTitles) ?? true;
        if (!generateTitles) {
            this.setFallbackTitle();
            return;
        }
        this.generateTitleViaLLM();
    }
    setGeneratedTitleOnToolInvocations(title) {
        for (const toolInvocation of this.toolInvocations) {
            toolInvocation.generatedTitle = title;
        }
    }
    async generateTitleViaLLM() {
        try {
            let models = await this.languageModelsService.selectLanguageModels({ vendor: 'copilot', id: 'copilot-fast' });
            if (!models.length) {
                models = await this.languageModelsService.selectLanguageModels({ vendor: 'copilot', family: 'gpt-4o-mini' });
            }
            if (!models.length) {
                this.setFallbackTitle();
                return;
            }
            let context;
            if (this.extractedTitles.length > 0) {
                context = this.extractedTitles.join(', ');
            }
            else {
                context = this.currentThinkingValue.substring(0, 1000);
            }
            const prompt = `Summarize the following actions in 6-7 words using past tense. Be very concise - focus on the main action only. No subjects, quotes, or punctuation.

			Examples:
			- "Preparing to create new page file, Read HomePage.tsx, Creating new TypeScript file" → "Created new page file"
			- "Searching for files, Reading configuration, Analyzing dependencies" → "Analyzed project structure"
			- "Invoked terminal command, Checked build output, Fixed errors" → "Ran build and fixed errors"

			Actions: ${context}`;
            const response = await this.languageModelsService.sendChatRequest(models[0], new ExtensionIdentifier('core'), [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: prompt }] }], {}, CancellationToken.None);
            let generatedTitle = '';
            for await (const part of response.stream) {
                if (Array.isArray(part)) {
                    for (const p of part) {
                        if (p.type === 'text') {
                            generatedTitle += p.value;
                        }
                    }
                }
                else if (part.type === 'text') {
                    generatedTitle += part.value;
                }
            }
            await response.result;
            generatedTitle = generatedTitle.trim();
            if (generatedTitle && !this._store.isDisposed) {
                this.currentTitle = generatedTitle;
                if (this._collapseButton) {
                    this._collapseButton.label = generatedTitle;
                }
                this.content.generatedTitle = generatedTitle;
                this.setGeneratedTitleOnToolInvocations(generatedTitle);
                return;
            }
        }
        catch (error) {
            // fall through to default title
        }
        this.setFallbackTitle();
    }
    setFallbackTitle() {
        const finalLabel = this.toolInvocationCount > 0
            ? localize('chat.thinking.finished.withTools', 'Finished thinking and invoked {0} tool{1}', this.toolInvocationCount, this.toolInvocationCount === 1 ? '' : 's')
            : localize('chat.thinking.finished', 'Finished Thinking');
        this.currentTitle = finalLabel;
        this.wrapper.classList.remove('chat-thinking-streaming');
        this.streamingCompleted = true;
        if (this._collapseButton) {
            this._collapseButton.icon = Codicon.check;
            this._collapseButton.label = finalLabel;
        }
        this.updateDropdownClickability();
    }
    appendItem(content, toolInvocationId, toolInvocation) {
        this.wrapper.appendChild(content);
        if (toolInvocationId) {
            this.toolInvocationCount++;
            let toolCallLabel;
            if (toolInvocation?.invocationMessage) {
                const message = typeof toolInvocation.invocationMessage === 'string' ? toolInvocation.invocationMessage : toolInvocation.invocationMessage.value;
                toolCallLabel = message;
            }
            else {
                toolCallLabel = `Invoked \`${toolInvocationId}\``;
            }
            if (toolInvocation?.pastTenseMessage) {
                this.currentToolCallLabel = typeof toolInvocation.pastTenseMessage === 'string' ? toolInvocation.pastTenseMessage : toolInvocation.pastTenseMessage.value;
            }
            if (toolInvocation) {
                this.toolInvocations.push(toolInvocation);
            }
            // Add tool call to extracted titles for LLM title generation
            if (!this.extractedTitles.includes(toolCallLabel)) {
                this.extractedTitles.push(toolCallLabel);
            }
            if (!this.fixedScrollingMode && !this._isExpanded.get()) {
                this.setTitle(toolCallLabel);
            }
        }
        if (this.fixedScrollingMode && this.wrapper) {
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }
        this.updateDropdownClickability();
    }
    // makes a new text container. when we update, we now update this container.
    setupThinkingContainer(content, context) {
        // Avoid creating new containers after disposal
        if (this._store.isDisposed) {
            return;
        }
        this.textContainer = $('.chat-thinking-item.markdown-content');
        if (content.value) {
            this.wrapper.appendChild(this.textContainer);
            this.id = content.id;
            this.updateThinking(content);
        }
        this.updateDropdownClickability();
    }
    setTitle(title, omitPrefix) {
        if (!title || this.context.element.isComplete) {
            return;
        }
        if (omitPrefix) {
            this.setTitleWithWidgets(new MarkdownString(title), this.instantiationService, this.chatMarkdownAnchorService, this.chatContentMarkdownRenderer);
            this.currentTitle = title;
            return;
        }
        const thinkingLabel = `Thinking: ${title}`;
        this.lastExtractedTitle = title;
        this.currentTitle = thinkingLabel;
        this.setTitleWithWidgets(new MarkdownString(thinkingLabel), this.instantiationService, this.chatMarkdownAnchorService, this.chatContentMarkdownRenderer);
    }
    hasSameContent(other, _followingContent, _element) {
        if (other.kind === 'toolInvocation' || other.kind === 'toolInvocationSerialized') {
            return true;
        }
        if (other.kind !== 'thinking') {
            return false;
        }
        return other?.id !== this.id;
    }
    dispose() {
        if (this.markdownResult) {
            this.markdownResult.dispose();
            this.markdownResult = undefined;
        }
        super.dispose();
    }
};
ChatThinkingContentPart = __decorate([
    __param(3, IInstantiationService),
    __param(4, IConfigurationService),
    __param(5, IChatMarkdownAnchorService),
    __param(6, ILanguageModelsService)
], ChatThinkingContentPart);
export { ChatThinkingContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRoaW5raW5nQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFRoaW5raW5nQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUlsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHM0UsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVFLE9BQU8sRUFBbUIsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLGlDQUFpQyxDQUFDO0FBR3pDLFNBQVMsbUJBQW1CLENBQUMsT0FBMEI7SUFDdEQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUM7SUFDMUYsT0FBTyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDbkIsQ0FBQztBQUVELFNBQVMsK0JBQStCLENBQUMsT0FBZTtJQUN2RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDdEQsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ2pELENBQUM7QUFFTSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLDBCQUEwQjtJQXFCdEUsWUFDQyxPQUEwQixFQUMxQixPQUFzQyxFQUNyQiwyQkFBOEMsRUFDeEMsb0JBQTRELEVBQzVELG9CQUE0RCxFQUN2RCx5QkFBc0UsRUFDMUUscUJBQThEO1FBRXRGLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDLFdBQVcsQ0FBQztlQUMvRCxhQUFhLENBQUM7UUFFbEIsS0FBSyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQVZkLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBbUI7UUFDdkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3RDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDekQsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQXBCL0UsaUJBQVksR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFJL0QsdUJBQWtCLEdBQVksS0FBSyxDQUFDO1FBRXBDLG9CQUFlLEdBQWEsRUFBRSxDQUFDO1FBQy9CLHdCQUFtQixHQUFXLENBQUMsQ0FBQztRQUNoQyx1QkFBa0IsR0FBWSxLQUFLLENBQUM7UUFDcEMsYUFBUSxHQUFZLElBQUksQ0FBQztRQUV6QixvQkFBZSxHQUE0RCxFQUFFLENBQUM7UUFpQnJGLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFzQiwwQkFBMEIsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLFNBQVMsQ0FBQztRQUU1SSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsY0FBYyxLQUFLLG1CQUFtQixDQUFDLGNBQWMsQ0FBQztRQUVoRixJQUFJLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQztRQUNuQyxJQUFJLGNBQWMsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGNBQWMsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFdBQVcsQ0FBQztRQUV4QyxJQUFJLGNBQWMsS0FBSyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFFbEIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN0QyxJQUFJLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7UUFDRixDQUFDO1FBRUQsdURBQXVEO1FBQ3ZELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDcEcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN2RSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDM0MsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDMUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDekQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ25ELElBQUksSUFBSSxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUN4RCxPQUFPO2dCQUNSLENBQUM7Z0JBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDdkMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUN2QyxDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQ3BDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxFQUFFLENBQUM7b0JBQ3JELElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0lBRUQsMERBQTBEO0lBQ3ZDLFdBQVc7UUFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsbURBQW1ELENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN0RCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUNELElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRU8sY0FBYyxDQUFDLE9BQWUsRUFBRSxhQUF1QjtRQUM5RCxzRUFBc0U7UUFDdEUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzVCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7WUFDakMsQ0FBQztZQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFFRCx3RUFBd0U7UUFDeEUsSUFBSSxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEUsZUFBZSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4RSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxjQUFjLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDNUcsc0JBQXNCLEVBQUUsSUFBSTtZQUM1QixtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFO1lBQ3pELHFCQUFxQixFQUFFLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDakQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QixXQUFXLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztnQkFDL0IsT0FBTyxXQUFXLENBQUM7WUFDcEIsQ0FBQztTQUNELEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNaLElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsU0FBa0I7UUFDOUMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ2hGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzNDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM5RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0RSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM3RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQztRQUVwRSxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ3RDLE9BQU8sSUFBSTtpQkFDVCxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2hHLENBQUMsQ0FBQztRQUVGLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLENBQUMsZUFBZSxJQUFJLGVBQWUsS0FBSyxjQUFjLENBQUM7UUFDN0UsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQztJQUNyQixDQUFDO0lBRU0sZUFBZTtRQUNyQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFTSxjQUFjLENBQUMsT0FBMEI7UUFDL0MsZ0VBQWdFO1FBQ2hFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM1QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNqQixJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztRQUNoRCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEgsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUNqQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUV6QyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDcEQsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVELElBQUksY0FBYyxJQUFJLGNBQWMsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFDRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsY0FBYyxDQUFDO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxJQUFJLGNBQWMsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0QsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDekQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVNLFdBQVc7UUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFTSxjQUFjO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztRQUUvQixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzNDLENBQUM7UUFFRCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUVsQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztZQUNoRCxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDNUMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLGNBQWMsQ0FBQztRQUMzRixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxpQkFBaUIsQ0FBQztZQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQztZQUNoRCxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDbEMsT0FBTztRQUNSLENBQUM7UUFFRCx1RkFBdUY7UUFDdkYsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2pKLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztZQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztZQUMxQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUNqSixPQUFPO1FBQ1IsQ0FBQztRQUVELDhGQUE4RjtRQUM5RixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztZQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDcEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVUsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDckgsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLGtDQUFrQyxDQUFDLEtBQWE7UUFDdkQsS0FBSyxNQUFNLGNBQWMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbkQsY0FBYyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDdkMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CO1FBQ2hDLElBQUksQ0FBQztZQUNKLElBQUksTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUM5RyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQzlHLENBQUM7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEIsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLE9BQWUsQ0FBQztZQUNwQixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN4RCxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUc7Ozs7Ozs7Y0FPSixPQUFPLEVBQUUsQ0FBQztZQUVyQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLENBQ2hFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFDVCxJQUFJLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUMvQixDQUFDLEVBQUUsSUFBSSw4QkFBc0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUM1RSxFQUFFLEVBQ0YsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFDO1lBRUYsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7d0JBQ3RCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQzs0QkFDdkIsY0FBYyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7d0JBQzNCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDakMsY0FBYyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3RCLGNBQWMsR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFdkMsSUFBSSxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMvQyxJQUFJLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQztnQkFDbkMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQzFCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQztnQkFDN0MsQ0FBQztnQkFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDeEQsT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixnQ0FBZ0M7UUFDakMsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUM7WUFDOUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSwyQ0FBMkMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDaEssQ0FBQyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRTNELElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFFL0IsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUMxQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUM7UUFDekMsQ0FBQztRQUVELElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTSxVQUFVLENBQUMsT0FBb0IsRUFBRSxnQkFBeUIsRUFBRSxjQUFvRTtRQUN0SSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDM0IsSUFBSSxhQUFxQixDQUFDO1lBRTFCLElBQUksY0FBYyxFQUFFLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sT0FBTyxHQUFHLE9BQU8sY0FBYyxDQUFDLGlCQUFpQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO2dCQUNqSixhQUFhLEdBQUcsT0FBTyxDQUFDO1lBQ3pCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLEdBQUcsYUFBYSxnQkFBZ0IsSUFBSSxDQUFDO1lBQ25ELENBQUM7WUFFRCxJQUFJLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxjQUFjLENBQUMsZ0JBQWdCLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7WUFDM0osQ0FBQztZQUVELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFFRCw2REFBNkQ7WUFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzFDLENBQUM7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUN6RCxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQ3BELENBQUM7UUFDRCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQsNEVBQTRFO0lBQ3JFLHNCQUFzQixDQUFDLE9BQTBCLEVBQUUsT0FBc0M7UUFDL0YsK0NBQStDO1FBQy9DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM1QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDL0QsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFDRCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRWtCLFFBQVEsQ0FBQyxLQUFhLEVBQUUsVUFBb0I7UUFDOUQsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMvQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDakosSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxhQUFhLEtBQUssRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7UUFDaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxhQUFhLENBQUM7UUFDbEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksY0FBYyxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDMUosQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUEyQixFQUFFLGlCQUF5QyxFQUFFLFFBQXNCO1FBQzVHLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLDBCQUEwQixFQUFFLENBQUM7WUFDbEYsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQy9CLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sS0FBSyxFQUFFLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRCxDQUFBO0FBamVZLHVCQUF1QjtJQXlCakMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxzQkFBc0IsQ0FBQTtHQTVCWix1QkFBdUIsQ0FpZW5DIn0=