/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LineHeightChangingDecoration {
    static toKey(obj) {
        return `${obj.ownerId};${obj.decorationId};${obj.lineNumber}`;
    }
    constructor(ownerId, decorationId, lineNumber, lineHeight) {
        this.ownerId = ownerId;
        this.decorationId = decorationId;
        this.lineNumber = lineNumber;
        this.lineHeight = lineHeight;
    }
}
export class LineFontChangingDecoration {
    static toKey(obj) {
        return `${obj.ownerId};${obj.decorationId};${obj.lineNumber}`;
    }
    constructor(ownerId, decorationId, lineNumber) {
        this.ownerId = ownerId;
        this.decorationId = decorationId;
        this.lineNumber = lineNumber;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvZGVjb3JhdGlvblByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBeUJoRyxNQUFNLE9BQU8sNEJBQTRCO0lBRWpDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBaUM7UUFDcEQsT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDL0QsQ0FBQztJQUVELFlBQ2lCLE9BQWUsRUFDZixZQUFvQixFQUNwQixVQUFrQixFQUNsQixVQUF5QjtRQUh6QixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2YsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixlQUFVLEdBQVYsVUFBVSxDQUFlO0lBQ3RDLENBQUM7Q0FDTDtBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFFL0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUErQjtRQUNsRCxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsWUFBWSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMvRCxDQUFDO0lBRUQsWUFDaUIsT0FBZSxFQUNmLFlBQW9CLEVBQ3BCLFVBQWtCO1FBRmxCLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQixlQUFVLEdBQVYsVUFBVSxDQUFRO0lBQy9CLENBQUM7Q0FDTCJ9