import { CodeEditor, Hooks } from "../editor";
import { JavaFile } from "./file";
import { FileConstructor } from "../libs/interfaces/editor";

/**
 * Java代码编辑器
 * @remarks 暂未实现语法检查和智能感知，待后续版本扩展
 */
export class JavaEditor extends CodeEditor {

    protected fileConstructor(): FileConstructor {
        return JavaFile;
    }

    constructor(element: HTMLElement, hooks: Hooks) {
        super(element, hooks);
    }

}
