import { CodeFile } from "../file";
import { IMarker, IClassDeclaration, IMethod, CodeAnalysisResult } from "../libs/interfaces/declaration";
import { ICodeEditor, ICodeFile } from "../libs/interfaces/editor";
import { Languages } from "../libs/enum";

export class JavaFile extends CodeFile implements ICodeFile {

    protected markersOwner = "@java";

    /**
     * 编辑器文本转换成类结构描述
     */
    protected async getStructure(content: string): Promise<CodeAnalysisResult> {
        return {
            hasFatalError: false,
            classes: []
        };
    }

    /**
     * 检查类结构完整性
     */
    protected validate(structure: IClassDeclaration[]): IMarker[] {
        return [];
    }

    /**
     * 增加方法
     */
    protected async methodToString(method: IMethod): Promise<string> {
        return "";
    }

    // uri: monaco.Uri
    constructor(editor: ICodeEditor, uri: any, content?: string) {
        super(editor, Languages.Java, uri, content);
    }

}
