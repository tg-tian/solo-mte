import { CodeFile } from "../file";
import { ICodeFile, ICodeEditor } from "../libs/interfaces/editor";
import { Languages } from "../libs/enum";

export class CommonFile extends CodeFile implements ICodeFile {

    // uri: monaco.Uri
    constructor(editor: ICodeEditor, uri: any, content: string, language: Languages) {
        super(editor, language, uri, content);
    }

}
