import { CodeEditor, Hooks } from '../editor';
import { CommonFile } from "./file";
import { FileConstructor } from '../libs/interfaces/editor';

/** 高亮编辑器 */
export class HighLightEditor extends CodeEditor {

    protected fileConstructor(): FileConstructor {
        return CommonFile;
    }

    constructor(element: HTMLElement, hooks: Hooks) {
        super(element, hooks);
    }

}
