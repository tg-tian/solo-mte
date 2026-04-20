/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow } from '../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
export var InlineEditTabAction;
(function (InlineEditTabAction) {
    InlineEditTabAction["Jump"] = "jump";
    InlineEditTabAction["Accept"] = "accept";
    InlineEditTabAction["Inactive"] = "inactive";
})(InlineEditTabAction || (InlineEditTabAction = {}));
export class InlineEditClickEvent {
    static create(event, alternativeAction = false) {
        return new InlineEditClickEvent(new StandardMouseEvent(getWindow(event), event), alternativeAction);
    }
    constructor(event, alternativeAction = false) {
        this.event = event;
        this.alternativeAction = alternativeAction;
    }
}
// TODO: Move this out of here as it is also includes ghosttext
export var InlineCompletionViewKind;
(function (InlineCompletionViewKind) {
    InlineCompletionViewKind["GhostText"] = "ghostText";
    InlineCompletionViewKind["Custom"] = "custom";
    InlineCompletionViewKind["SideBySide"] = "sideBySide";
    InlineCompletionViewKind["Deletion"] = "deletion";
    InlineCompletionViewKind["InsertionInline"] = "insertionInline";
    InlineCompletionViewKind["InsertionMultiLine"] = "insertionMultiLine";
    InlineCompletionViewKind["WordReplacements"] = "wordReplacements";
    InlineCompletionViewKind["LineReplacement"] = "lineReplacement";
    InlineCompletionViewKind["Collapsed"] = "collapsed";
    InlineCompletionViewKind["JumpTo"] = "jumpTo";
})(InlineCompletionViewKind || (InlineCompletionViewKind = {}));
export class InlineCompletionViewData {
    constructor(cursorColumnDistance, cursorLineDistance, lineCountOriginal, lineCountModified, characterCountOriginal, characterCountModified, disjointReplacements, sameShapeReplacements) {
        this.cursorColumnDistance = cursorColumnDistance;
        this.cursorLineDistance = cursorLineDistance;
        this.lineCountOriginal = lineCountOriginal;
        this.lineCountModified = lineCountModified;
        this.characterCountOriginal = characterCountOriginal;
        this.characterCountModified = characterCountModified;
        this.disjointReplacements = disjointReplacements;
        this.sameShapeReplacements = sameShapeReplacements;
        this.longDistanceHintVisible = undefined;
        this.longDistanceHintDistance = undefined;
    }
    setLongDistanceViewData(lineNumber, inlineEditLineNumber) {
        this.longDistanceHintVisible = true;
        this.longDistanceHintDistance = Math.abs(inlineEditLineNumber - lineNumber);
    }
    getData() {
        return {
            cursorColumnDistance: this.cursorColumnDistance,
            cursorLineDistance: this.cursorLineDistance,
            lineCountOriginal: this.lineCountOriginal,
            lineCountModified: this.lineCountModified,
            characterCountOriginal: this.characterCountOriginal,
            characterCountModified: this.characterCountModified,
            disjointReplacements: this.disjointReplacements,
            sameShapeReplacements: this.sameShapeReplacements,
            longDistanceHintVisible: this.longDistanceHintVisible,
            longDistanceHintDistance: this.longDistanceHintDistance
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3SW50ZXJmYWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdJbnRlcmZhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBSS9GLE1BQU0sQ0FBTixJQUFZLG1CQUlYO0FBSkQsV0FBWSxtQkFBbUI7SUFDOUIsb0NBQWEsQ0FBQTtJQUNiLHdDQUFpQixDQUFBO0lBQ2pCLDRDQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFKVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBSTlCO0FBRUQsTUFBTSxPQUFPLG9CQUFvQjtJQUNoQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQWdDLEVBQUUsb0JBQTZCLEtBQUs7UUFDakYsT0FBTyxJQUFJLG9CQUFvQixDQUFDLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDckcsQ0FBQztJQUNELFlBQ2lCLEtBQWtCLEVBQ2xCLG9CQUE2QixLQUFLO1FBRGxDLFVBQUssR0FBTCxLQUFLLENBQWE7UUFDbEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFpQjtJQUMvQyxDQUFDO0NBQ0w7QUFRRCwrREFBK0Q7QUFDL0QsTUFBTSxDQUFOLElBQVksd0JBV1g7QUFYRCxXQUFZLHdCQUF3QjtJQUNuQyxtREFBdUIsQ0FBQTtJQUN2Qiw2Q0FBaUIsQ0FBQTtJQUNqQixxREFBeUIsQ0FBQTtJQUN6QixpREFBcUIsQ0FBQTtJQUNyQiwrREFBbUMsQ0FBQTtJQUNuQyxxRUFBeUMsQ0FBQTtJQUN6QyxpRUFBcUMsQ0FBQTtJQUNyQywrREFBbUMsQ0FBQTtJQUNuQyxtREFBdUIsQ0FBQTtJQUN2Qiw2Q0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBWFcsd0JBQXdCLEtBQXhCLHdCQUF3QixRQVduQztBQUVELE1BQU0sT0FBTyx3QkFBd0I7SUFLcEMsWUFDaUIsb0JBQTRCLEVBQzVCLGtCQUEwQixFQUMxQixpQkFBeUIsRUFDekIsaUJBQXlCLEVBQ3pCLHNCQUE4QixFQUM5QixzQkFBOEIsRUFDOUIsb0JBQTRCLEVBQzVCLHFCQUErQjtRQVAvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVE7UUFDNUIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBQzFCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBUTtRQUN6QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQVE7UUFDekIsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFRO1FBQzlCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBUTtRQUM5Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVE7UUFDNUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFVO1FBWHpDLDRCQUF1QixHQUF3QixTQUFTLENBQUM7UUFDekQsNkJBQXdCLEdBQXVCLFNBQVMsQ0FBQztJQVc1RCxDQUFDO0lBRUwsdUJBQXVCLENBQUMsVUFBa0IsRUFBRSxvQkFBNEI7UUFDdkUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQztRQUNwQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxVQUFVLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU87WUFDTixvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQy9DLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7WUFDM0MsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCO1lBQ3pDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxzQkFBc0I7WUFDbkQsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQjtZQUNuRCxvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQy9DLHFCQUFxQixFQUFFLElBQUksQ0FBQyxxQkFBcUI7WUFDakQsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QjtZQUNyRCx3QkFBd0IsRUFBRSxJQUFJLENBQUMsd0JBQXdCO1NBQ3ZELENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==