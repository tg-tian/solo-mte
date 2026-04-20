/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MultiDiffEditor } from './multiDiffEditor.js';
import { MultiDiffEditorInput, MultiDiffEditorResolverContribution, MultiDiffEditorSerializer } from './multiDiffEditorInput.js';
import { CollapseAllAction, ExpandAllAction, GoToFileAction, GoToNextChangeAction, GoToPreviousChangeAction } from './actions.js';
import { IMultiDiffSourceResolverService, MultiDiffSourceResolverService } from './multiDiffSourceResolverService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { OpenScmGroupAction, ScmMultiDiffSourceResolverContribution } from './scmMultiDiffSourceResolver.js';
registerAction2(GoToFileAction);
registerAction2(GoToNextChangeAction);
registerAction2(GoToPreviousChangeAction);
registerAction2(CollapseAllAction);
registerAction2(ExpandAllAction);
registerSingleton(IMultiDiffSourceResolverService, MultiDiffSourceResolverService, 1 /* InstantiationType.Delayed */);
// Editor Integration
registerWorkbenchContribution2(MultiDiffEditorResolverContribution.ID, MultiDiffEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
Registry.as(EditorExtensions.EditorPane)
    .registerEditorPane(EditorPaneDescriptor.create(MultiDiffEditor, MultiDiffEditor.ID, localize('name', "Multi Diff Editor")), [new SyncDescriptor(MultiDiffEditorInput)]);
Registry.as(EditorExtensions.EditorFactory)
    .registerEditorSerializer(MultiDiffEditorInput.ID, MultiDiffEditorSerializer);
// SCM integration
registerAction2(OpenScmGroupAction);
registerWorkbenchContribution2(ScmMultiDiffSourceResolverContribution.ID, ScmMultiDiffSourceResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tdWx0aURpZmZFZGl0b3IvYnJvd3Nlci9tdWx0aURpZmZFZGl0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1DQUFtQyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakksT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDbEksT0FBTyxFQUFFLCtCQUErQixFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNoQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUN0QyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUMxQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNuQyxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUM7QUFHakMsaUJBQWlCLENBQUMsK0JBQStCLEVBQUUsOEJBQThCLG9DQUE0QixDQUFDO0FBRTlHLHFCQUFxQjtBQUNyQiw4QkFBOEIsQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsbUNBQW1DLHNDQUF3RSxDQUFDO0FBRW5MLFFBQVEsQ0FBQyxFQUFFLENBQXNCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQztLQUMzRCxrQkFBa0IsQ0FDbEIsb0JBQW9CLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxFQUN2RyxDQUFDLElBQUksY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FDMUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQztLQUNqRSx3QkFBd0IsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUUvRSxrQkFBa0I7QUFDbEIsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDcEMsOEJBQThCLENBQUMsc0NBQXNDLENBQUMsRUFBRSxFQUFFLHNDQUFzQyxzQ0FBeUUsQ0FBQyJ9