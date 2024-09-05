import { Extension } from './extension';
import { ITreeNode } from './tree-node';
import { OperationCollection } from './operation-collection';

export class Case implements ITreeNode {

    expanded?: boolean;

    id = '';

    name = '';

    condition = '';

    handlers?: OperationCollection;

    belongedExt?: Extension;

    root?: ITreeNode;

    get children(): ITreeNode[] {
        return this.handlers || [];
    }

    get data(): { id: string; name: string } {
        return { id: this.id, name: this.name };
    }

    constructor(caseJson?: any, extension?: Extension, parent?: ITreeNode) {
        // 如果有参数就解析。必须是两个参数都存在。
        if (caseJson) {
            this.parse(caseJson, extension);
        }
    }

    parse(caseJson: any, extension?: Extension) {
        this.id = caseJson.id;
        this.name = caseJson.name;
        this.condition = caseJson.condition;
        this.handlers = new OperationCollection(caseJson.handlers);

        if (extension) {
            this.belongedExt = extension;
        }
    }

    toJson() {
        const handlers = this.handlers ? this.handlers.map((handler) => handler.toJson()) : [];
        return {
            id: this.id,
            name: this.name,
            condition: this.condition,
            handlers
        };
    }
}
