/**
 * 将 Monaco ITextModel 适配为类似 VSCode TextDocument 的接口
 * 这样可以让现有的 PredictContext 等类无需大幅修改即可使用
 */

// 使用 any 类型避免类型检查错误
declare const monaco: any;

export class MonacoDocumentAdapter {
    constructor(private model: any) {}

    /**
     * 获取文件路径（对应 VSCode TextDocument.fileName）
     */
    get fileName(): string {
        return this.model.uri.path;
    }

    /**
     * 获取文件 URI（对应 VSCode TextDocument.uri）
     */
    get uri(): { fsPath: string; path: string } {
        return {
            fsPath: this.model.uri.path,
            path: this.model.uri.path
        };
    }

    /**
     * 获取完整文本内容（对应 VSCode TextDocument.getText()）
     */
    getText(): string {
        return this.model.getValue();
    }

    /**
     * 获取指定范围的内容（对应 VSCode TextDocument.getText(range)）
     */
    getTextInRange(range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    }): string {
        return this.model.getValueInRange(range);
    }

    /**
     * 将位置转换为偏移量（对应 VSCode TextDocument.offsetAt(position)）
     */
    offsetAt(position: { line: number; character: number }): number {
        // VSCode 位置从 0 开始，Monaco 从 1 开始
        const monacoPos = {
            lineNumber: position.line + 1,
            column: position.character + 1
        };
        return this.model.getOffsetAt(monacoPos);
    }

    /**
     * 将偏移量转换为位置（对应 VSCode TextDocument.positionAt(offset)）
     */
    positionAt(offset: number): { line: number; character: number } {
        const monacoPos = this.model.getPositionAt(offset);
        // 转换回 VSCode 格式（从 0 开始）
        return {
            line: monacoPos.lineNumber - 1,
            character: monacoPos.column - 1
        };
    }

    /**
     * 获取指定行的内容（对应 VSCode TextDocument.lineAt(line)）
     */
    lineAt(lineNumber: number): {
        text: string;
        range: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    } {
        // VSCode lineNumber 从 0 开始，Monaco 从 1 开始
        const monacoLineNumber = lineNumber + 1;
        const text = this.model.getLineContent(monacoLineNumber);
        return {
            text,
            range: {
                start: { line: lineNumber, character: 0 },
                end: { line: lineNumber, character: text.length }
            }
        };
    }

    /**
     * 获取语言 ID（对应 VSCode TextDocument.languageId）
     */
    get languageId(): string {
        return this.model.getLanguageId();
    }
}
