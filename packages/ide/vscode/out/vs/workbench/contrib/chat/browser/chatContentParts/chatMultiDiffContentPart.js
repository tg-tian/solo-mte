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
import * as dom from '../../../../../base/browser/dom.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, isObservable } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { getChatSessionType } from '../../common/chatUri.js';
const $ = dom.$;
const ELEMENT_HEIGHT = 22;
const MAX_ITEMS_SHOWN = 6;
let ChatMultiDiffContentPart = class ChatMultiDiffContentPart extends Disposable {
    constructor(content, _element, instantiationService, editorService, themeService, contextKeyService) {
        super();
        this.content = content;
        this._element = _element;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.themeService = themeService;
        this.contextKeyService = contextKeyService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.isCollapsed = false;
        this.readOnly = content.readOnly ?? false;
        this.diffData = isObservable(this.content.multiDiffData)
            ? this.content.multiDiffData.map(d => d)
            : constObservable(this.content.multiDiffData);
        const headerDomNode = $('.checkpoint-file-changes-summary-header');
        this.domNode = $('.checkpoint-file-changes-summary', undefined, headerDomNode);
        this.domNode.tabIndex = 0;
        this.isCollapsed = content?.collapsed ?? false;
        this._register(this.renderHeader(headerDomNode));
        this._register(this.renderFilesList(this.domNode));
    }
    renderHeader(container) {
        const viewListButtonContainer = container.appendChild($('.chat-file-changes-label'));
        const viewListButton = new ButtonWithIcon(viewListButtonContainer, {});
        this._register(autorun(reader => {
            const fileCount = this.diffData.read(reader).resources.length;
            viewListButton.label = fileCount === 1
                ? localize('chatMultiDiff.oneFile', 'Changed 1 file')
                : localize('chatMultiDiff.manyFiles', 'Changed {0} files', fileCount);
        }));
        const setExpansionState = () => {
            viewListButton.icon = this.isCollapsed ? Codicon.chevronRight : Codicon.chevronDown;
            this.domNode.classList.toggle('chat-file-changes-collapsed', this.isCollapsed);
            this._onDidChangeHeight.fire();
        };
        setExpansionState();
        const disposables = new DisposableStore();
        disposables.add(viewListButton);
        disposables.add(viewListButton.onDidClick(() => {
            this.isCollapsed = !this.isCollapsed;
            setExpansionState();
        }));
        if (!this.readOnly) {
            disposables.add(this.renderViewAllFileChangesButton(viewListButton.element));
        }
        disposables.add(this.renderContributedButtons(viewListButton.element));
        return toDisposable(() => disposables.dispose());
    }
    renderViewAllFileChangesButton(container) {
        const button = container.appendChild($('.chat-view-changes-icon'));
        button.classList.add(...ThemeIcon.asClassNameArray(Codicon.diffMultiple));
        button.title = localize('chatMultiDiff.openAllChanges', 'Open Changes');
        return dom.addDisposableListener(button, 'click', (e) => {
            const source = URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
            const { title, resources } = this.diffData.get();
            const input = this.instantiationService.createInstance(MultiDiffEditorInput, source, title || 'Multi-Diff', resources.map(resource => new MultiDiffEditorItem(resource.originalUri, resource.modifiedUri, resource.goToFileUri)), false);
            const sideBySide = e.altKey;
            this.editorService.openEditor(input, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
            dom.EventHelper.stop(e, true);
        });
    }
    renderContributedButtons(container) {
        const buttonsContainer = container.appendChild($('.chat-multidiff-contributed-buttons'));
        const disposables = new DisposableStore();
        const type = getChatSessionType(this._element.sessionResource);
        const overlay = this.contextKeyService.createOverlay([
            [ChatContextKeys.agentSessionType.key, type]
        ]);
        const nestedInsta = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, overlay])));
        const marshalledUri = {
            ...this._element.sessionResource,
            $mid: 1 /* MarshalledId.Uri */
        };
        const toolbar = disposables.add(nestedInsta.createInstance(MenuWorkbenchToolBar, buttonsContainer, MenuId.ChatMultiDiffContext, {
            menuOptions: {
                arg: marshalledUri,
                shouldForwardArgs: true,
            },
            toolbarOptions: {
                primaryGroup: () => true,
            },
        }));
        disposables.add(toolbar.onDidChangeMenuItems(() => this._onDidChangeHeight.fire()));
        return disposables;
    }
    renderFilesList(container) {
        const store = new DisposableStore();
        const listContainer = container.appendChild($('.chat-summary-list'));
        store.add(createFileIconThemableTreeContainerScope(listContainer, this.themeService));
        const resourceLabels = store.add(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: Event.None }));
        this.list = store.add(this.instantiationService.createInstance((WorkbenchList), 'ChatMultiDiffList', listContainer, new ChatMultiDiffListDelegate(), [this.instantiationService.createInstance(ChatMultiDiffListRenderer, resourceLabels)], {
            identityProvider: {
                getId: (element) => element.uri.toString()
            },
            setRowLineHeight: true,
            horizontalScrolling: false,
            supportDynamicHeights: false,
            mouseSupport: !this.readOnly,
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: {
                getAriaLabel: (element) => element.uri.path,
                getWidgetAriaLabel: () => localize('chatMultiDiffList', "File Changes")
            }
        }));
        this._register(autorun(reader => {
            const { resources } = this.diffData.read(reader);
            const items = [];
            for (const resource of resources) {
                const uri = resource.modifiedUri || resource.originalUri || resource.goToFileUri;
                if (!uri) {
                    continue;
                }
                const item = { uri };
                if (resource.originalUri && resource.modifiedUri) {
                    item.diff = {
                        originalURI: resource.originalUri,
                        modifiedURI: resource.modifiedUri,
                        isFinal: true,
                        quitEarly: false,
                        identical: false,
                        added: resource.added || 0,
                        removed: resource.removed || 0,
                        isBusy: false,
                    };
                }
                items.push(item);
            }
            this.list.splice(0, this.list.length, items);
            const height = Math.min(items.length, MAX_ITEMS_SHOWN) * ELEMENT_HEIGHT;
            this.list.layout(height);
            listContainer.style.height = `${height}px`;
            this._onDidChangeHeight.fire();
        }));
        if (!this.readOnly) {
            store.add(this.list.onDidOpen((e) => {
                if (!e.element) {
                    return;
                }
                if (e.element.diff) {
                    this.editorService.openEditor({
                        original: { resource: e.element.diff.originalURI },
                        modified: { resource: e.element.diff.modifiedURI },
                        options: { preserveFocus: true }
                    });
                }
                else {
                    this.editorService.openEditor({
                        resource: e.element.uri,
                        options: { preserveFocus: true }
                    });
                }
            }));
        }
        return store;
    }
    hasSameContent(other) {
        return other.kind === 'multiDiffData' && this.diffData.get().resources.length === (isObservable(other.multiDiffData) ? other.multiDiffData.get().resources.length : other.multiDiffData.resources.length);
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMultiDiffContentPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, IThemeService),
    __param(5, IContextKeyService)
], ChatMultiDiffContentPart);
export { ChatMultiDiffContentPart };
class ChatMultiDiffListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return 'chatMultiDiffItem';
    }
}
class ChatMultiDiffListRenderer {
    static { this.TEMPLATE_ID = 'chatMultiDiffItem'; }
    static { this.CHANGES_SUMMARY_CLASS_NAME = 'insertions-and-deletions'; }
    constructor(labels) {
        this.labels = labels;
        this.templateId = ChatMultiDiffListRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const label = this.labels.create(container, { supportHighlights: true, supportIcons: true });
        return {
            label,
            dispose: () => label.dispose()
        };
    }
    renderElement(element, _index, templateData) {
        templateData.label.setFile(element.uri, {
            fileKind: FileKind.FILE,
            title: element.uri.path
        });
        const labelElement = templateData.label.element;
        templateData.changesElement?.remove();
        if (element.diff?.added || element.diff?.removed) {
            const changesSummary = labelElement.appendChild($(`.${ChatMultiDiffListRenderer.CHANGES_SUMMARY_CLASS_NAME}`));
            const addedElement = changesSummary.appendChild($('.insertions'));
            addedElement.textContent = `+${element.diff.added}`;
            const removedElement = changesSummary.appendChild($('.deletions'));
            removedElement.textContent = `-${element.diff.removed}`;
            changesSummary.setAttribute('aria-label', localize('chatEditingSession.fileCounts', '{0} lines added, {1} lines removed', element.diff.added, element.diff.removed));
            templateData.changesElement = changesSummary;
        }
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE11bHRpRGlmZkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRNdWx0aURpZmZDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqSCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFrQixjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFLN0QsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQU9oQixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUM7QUFDMUIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDO0FBRW5CLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQVd2RCxZQUNrQixPQUEyQixFQUMzQixRQUFzQixFQUNoQixvQkFBNEQsRUFDbkUsYUFBOEMsRUFDL0MsWUFBNEMsRUFDdkMsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBUFMsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7UUFDM0IsYUFBUSxHQUFSLFFBQVEsQ0FBYztRQUNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzlCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ3RCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFkMUQsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDMUQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUcxRCxnQkFBVyxHQUFZLEtBQUssQ0FBQztRQWNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDO1FBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLEVBQUUsU0FBUyxJQUFJLEtBQUssQ0FBQztRQUUvQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVPLFlBQVksQ0FBQyxTQUFzQjtRQUMxQyxNQUFNLHVCQUF1QixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzlELGNBQWMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxLQUFLLENBQUM7Z0JBQ3JDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLENBQUM7Z0JBQ3JELENBQUMsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO1lBQzlCLGNBQWMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUNwRixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQy9FLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQyxDQUFDLENBQUM7UUFDRixpQkFBaUIsRUFBRSxDQUFDO1FBRXBCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoQyxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzlDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQ3JDLGlCQUFpQixFQUFFLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUNELFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFTyw4QkFBOEIsQ0FBQyxTQUFzQjtRQUM1RCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsOEJBQThCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFeEUsT0FBTyxHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLElBQUksSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNwSCxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDakQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDckQsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixLQUFLLElBQUksWUFBWSxFQUNyQixTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FDaEQsUUFBUSxDQUFDLFdBQVcsRUFDcEIsUUFBUSxDQUFDLFdBQVcsRUFDcEIsUUFBUSxDQUFDLFdBQVcsQ0FDcEIsQ0FBQyxFQUNGLEtBQUssQ0FDTCxDQUFDO1lBQ0YsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxTQUFzQjtRQUN0RCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztRQUN6RixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRTFDLE1BQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDL0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQztZQUNwRCxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO1NBQzVDLENBQUMsQ0FBQztRQUNILE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakksTUFBTSxhQUFhLEdBQUc7WUFDckIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWU7WUFDaEMsSUFBSSwwQkFBa0I7U0FDdEIsQ0FBQztRQUVGLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FDekQsb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixNQUFNLENBQUMsb0JBQW9CLEVBQzNCO1lBQ0MsV0FBVyxFQUFFO2dCQUNaLEdBQUcsRUFBRSxhQUFhO2dCQUNsQixpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1lBQ0QsY0FBYyxFQUFFO2dCQUNmLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO2FBQ3hCO1NBQ0QsQ0FDRCxDQUFDLENBQUM7UUFFSCxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBGLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBc0I7UUFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDckUsS0FBSyxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxFQUFFLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzdELENBQUEsYUFBaUMsQ0FBQSxFQUNqQyxtQkFBbUIsRUFDbkIsYUFBYSxFQUNiLElBQUkseUJBQXlCLEVBQUUsRUFDL0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLGNBQWMsQ0FBQyxDQUFDLEVBQ3JGO1lBQ0MsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDLE9BQTJCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO2FBQzlEO1lBQ0QsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLHFCQUFxQixFQUFFLEtBQUs7WUFDNUIsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVE7WUFDNUIsdUJBQXVCLEVBQUUsS0FBSztZQUM5QixxQkFBcUIsRUFBRTtnQkFDdEIsWUFBWSxFQUFFLENBQUMsT0FBMkIsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJO2dCQUMvRCxrQkFBa0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDO2FBQ3ZFO1NBQ0QsQ0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakQsTUFBTSxLQUFLLEdBQXlCLEVBQUUsQ0FBQztZQUN2QyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQztnQkFDakYsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUNWLFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxNQUFNLElBQUksR0FBdUIsRUFBRSxHQUFHLEVBQUUsQ0FBQztnQkFFekMsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbEQsSUFBSSxDQUFDLElBQUksR0FBRzt3QkFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7d0JBQ2pDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVzt3QkFDakMsT0FBTyxFQUFFLElBQUk7d0JBQ2IsU0FBUyxFQUFFLEtBQUs7d0JBQ2hCLFNBQVMsRUFBRSxLQUFLO3dCQUNoQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDO3dCQUMxQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDO3dCQUM5QixNQUFNLEVBQUUsS0FBSztxQkFDYixDQUFDO2dCQUNILENBQUM7Z0JBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsR0FBRyxjQUFjLENBQUM7WUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsYUFBYSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQztZQUMzQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUdKLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNuQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNoQixPQUFPO2dCQUNSLENBQUM7Z0JBRUQsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQzt3QkFDN0IsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTt3QkFDbEQsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTt3QkFDbEQsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRTtxQkFDaEMsQ0FBQyxDQUFDO2dCQUNKLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQzt3QkFDN0IsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRzt3QkFDdkIsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRTtxQkFDaEMsQ0FBQyxDQUFDO2dCQUNKLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUEyQjtRQUN6QyxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssZUFBZSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM00sQ0FBQztJQUVELGFBQWEsQ0FBQyxVQUF1QjtRQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDRCxDQUFBO0FBN05ZLHdCQUF3QjtJQWNsQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGtCQUFrQixDQUFBO0dBakJSLHdCQUF3QixDQTZOcEM7O0FBRUQsTUFBTSx5QkFBeUI7SUFDOUIsU0FBUztRQUNSLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLG1CQUFtQixDQUFDO0lBQzVCLENBQUM7Q0FDRDtBQU9ELE1BQU0seUJBQXlCO2FBQ2QsZ0JBQVcsR0FBRyxtQkFBbUIsQUFBdEIsQ0FBdUI7YUFDbEMsK0JBQTBCLEdBQUcsMEJBQTBCLEFBQTdCLENBQThCO0lBSXhFLFlBQW9CLE1BQXNCO1FBQXRCLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBRmpDLGVBQVUsR0FBVyx5QkFBeUIsQ0FBQyxXQUFXLENBQUM7SUFFdEIsQ0FBQztJQUUvQyxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRTdGLE9BQU87WUFDTixLQUFLO1lBQ0wsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7U0FDOUIsQ0FBQztJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsT0FBMkIsRUFBRSxNQUFjLEVBQUUsWUFBd0M7UUFDbEcsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUN2QyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDdkIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUN2QixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUNoRCxZQUFZLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBRXRDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNsRCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLHlCQUF5QixDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRS9HLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDbEUsWUFBWSxDQUFDLFdBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFcEQsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNuRSxjQUFjLENBQUMsV0FBVyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUV4RCxjQUFjLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsb0NBQW9DLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBRXJLLFlBQVksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXdDO1FBQ3ZELFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QixDQUFDIn0=