/**
 * 预测上下文 - 适配版本
 * 适配 Monaco Editor 环境，移除 VSCode 依赖
 */

// 文档接口适配
export interface DocumentAdapter {
    fileName: string;
    getText: () => string;
    offsetAt: (position: { line: number; character: number }) => number;
    languageId: string;
}

// 位置接口
export interface Position {
    line: number;
    character: number;
}

// 内联补全上下文接口
export interface InlineCompletionContext {
    selectedCompletionInfo?: {
        text: string;
        range: {
            start: Position;
            end: Position;
        };
    };
}

// 取消令牌接口
export interface CancellationToken {
    isCancellationRequested: boolean;
    onCancellationRequested: (callback: () => void) => void;
}

// 语言模型配置
export const allModels = [
    { name: "python", ext: "python(Python)", display: "Python" },
    { name: "java", ext: "java(Java)", display: "Java" },
    { name: "cpp", ext: "cpp(Cpp)", display: "C++/C" },
    { name: "c", ext: "c(C)", display: "C" },
    { name: "typescript", ext: "typescript(Typescript)", display: "TypeScript" },
    { name: "javascript", ext: "javascript(Javascript)", display: "JavaScript" },
    { name: "php", ext: "php(Php)", display: "Php" },
    { name: "go", ext: "go(Go)", display: "Go" },
    { name: "csharp", ext: "csharp(Csharp)", display: "C#" },
    { name: "kotlin", ext: "kotlin(Kotlin)", display: "Kotlin" },
    { name: "vue", ext: "vue(Vue)", display: "VueJS" },
    { name: "html", ext: "html(Html)", display: "HTML" },
    { name: "css", ext: "css(Css)", display: "CSS" },
    { name: "javascriptreact", ext: "jsx(Jsx)", display: "JavaScript (React)" },
    { name: "typescriptreact", ext: "tsx(Tsx)", display: "TypeScript (React)" },
    { name: "sql", ext: "sql(Sql)", display: "SQL" },
    { name: "shellscript", ext: "shell(Shell)", display: "ShellScript" },
];

/**
 * 检查是否为单行预测
 */
function checkSingleLine(position: Position, beforeCode: string, predictMode?: string): boolean {
    // 如果配置为 only_single_line，直接返回 true
    if (predictMode === "only_single_line") {
        return true;
    }
    // **修复**：如果配置为 full 模式，且当前行为空（回车后的新行），返回 false（可以预测多行）
    if (predictMode === "full") {
        const currentLine = beforeCode.substring(beforeCode.length - position.character);
        // 如果当前行为空，返回 false（single_line: false），可以预测多行
        if (currentLine.trim().length === 0) {
            return false;
        }
        // 如果当前行有内容，返回 true（single_line: true），只预测单行
        return true;
    }
    // 检查当前行是否有有效字符
    const currentLine = beforeCode.substring(beforeCode.length - position.character);
    return currentLine.trim().length > 0;
}

/**
 * 获取文件 URI（简化版本）
 */
function getFileUri(fsPath: string): string {
    // 移除协议前缀（如果有）
    return fsPath.replace(/^file:\/\//, '');
}

export class PredictContext {
    document: DocumentAdapter;
    projectRoot: string;
    fileID: string;
    beforeCode: string;
    laterCode: string;
    positionStr: string;
    single_line: boolean;
    ext: string;
    cancellationToken: CancellationToken;
    inlineCompletionContext: InlineCompletionContext;
    selectedText: string = '';
    typePrefix: string = '';
    retry: boolean = true;
    ngen: number = 512;

    constructor(
        document: DocumentAdapter,
        position: Position,
        context: InlineCompletionContext,
        token: CancellationToken,
        projectRoot: string,
        predictMode?: string
    ) {
        this.document = document;
        this.projectRoot = projectRoot;
        this.fileID = getFileUri(document.fileName);
        const offset = document.offsetAt(position);
        const text = document.getText();
        this.beforeCode = text.substring(0, offset);
        this.laterCode = text.substring(offset);
        this.single_line = checkSingleLine(position, this.beforeCode, predictMode);
        this.ext = allModels.find((item) => item.name === document.languageId)?.ext ?? "";
        if (this.ext === "") {
            this.ngen = 256;
        }
        // 上下文
        this.cancellationToken = token;
        this.inlineCompletionContext = context;
        this.positionStr = JSON.stringify(position);
        this.getResultPrefix();
    }

    private getResultPrefix() {
        if (this.inlineCompletionContext.selectedCompletionInfo) {
            this.selectedText = this.inlineCompletionContext.selectedCompletionInfo?.text || '';
            const completionItemRange = this.inlineCompletionContext.selectedCompletionInfo.range;
            if (
                completionItemRange.end.line === completionItemRange.start.line &&
                completionItemRange.start.character < completionItemRange.end.character
            ) {
                const length = completionItemRange.end.character - completionItemRange.start.character;
                this.typePrefix = this.selectedText.substring(0, length);
                this.selectedText = this.selectedText.substring(length);
            }
        }
    }

    public checkCancelRequest(): boolean {
        if (this.typePrefix.length > 0 && !this.beforeCode.endsWith(this.typePrefix)) {
            return true;
        }
        return false;
    }

    public checkNewLine(): boolean {
        const position = JSON.parse(this.positionStr) as Position;
        const currentLine = this.beforeCode.substring(this.beforeCode.length - position.character);
        return currentLine.trim().length === 0;
    }
}
