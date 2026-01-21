/**
 * Monaco 和 VSCode 的位置系统差异：
 * - Monaco: lineNumber 和 column 从 1 开始
 * - VSCode: line 和 character 从 0 开始
 * 
 * 这个适配器负责在两者之间转换
 */

// 使用 any 类型避免类型检查错误
declare const monaco: any;

export class MonacoPositionAdapter {
    /**
     * 将 Monaco Position 转换为 VSCode 风格的 Position
     */
    static toVSCodePosition(monacoPos: any): { line: number; character: number } {
        // 添加空值检查，防止 undefined 或 null
        if (!monacoPos) {
            return { line: 0, character: 0 };
        }
        
        // 处理不同的 Monaco Position 格式
        // 可能是对象 { lineNumber, column } 或 Position 实例
        const lineNumber = monacoPos.lineNumber ?? monacoPos.line ?? 1;
        const column = monacoPos.column ?? monacoPos.character ?? 1;
        
        return {
            line: lineNumber - 1, // Monaco 从 1 开始，VSCode 从 0 开始
            character: column - 1
        };
    }

    /**
     * 将 VSCode Position 转换为 Monaco Position
     */
    static toMonacoPosition(vscodePos: { line: number; character: number }): any {
        return {
            lineNumber: vscodePos.line + 1,
            column: vscodePos.character + 1
        };
    }

    /**
     * 将 Monaco Range 转换为 VSCode 风格的 Range
     */
    static toVSCodeRange(monacoRange: any): {
        start: { line: number; character: number };
        end: { line: number; character: number };
    } {
        return {
            start: this.toVSCodePosition(monacoRange.getStartPosition()),
            end: this.toVSCodePosition(monacoRange.getEndPosition())
        };
    }

    /**
     * 将 VSCode Range 转换为 Monaco Range
     */
    static toMonacoRange(vscodeRange: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    }): any {
        const start = this.toMonacoPosition(vscodeRange.start);
        const end = this.toMonacoPosition(vscodeRange.end);
        // 返回简单的对象，Monaco 会在需要时创建 Range 对象
        return {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column
        };
    }
}
