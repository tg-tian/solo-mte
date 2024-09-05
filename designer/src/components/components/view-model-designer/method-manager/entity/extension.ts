/* eslint-disable @typescript-eslint/indent */
import { IOperationNode } from './operation-node';
import { ITreeNode } from './tree-node';
import { ExecuteNode } from './execute-node';
import { SwitchNode } from './switch-node';

export class Extension implements ITreeNode {
    get data(): { id: string; name: string } {
        let name = '';
        switch (this.type) {
            case 'InsertBefore':
                name = '操作前扩展';
                break;
            case 'Replace':
                name = '操作替换';
                break;
            case 'InsertAfter':
                name = '操作后扩展';
                break;
        }
        return { id: this.id, name };
    }

    get children(): ITreeNode[] {
        return this.tasks || [];
    }

    isEditing = false;

    id = '';

    position = '';

    type: 'InsertBefore' | 'Replace' | 'InsertAfter' = 'InsertAfter'; // string;

    tasks?: Array<IOperationNode & ITreeNode>;

    root?: ITreeNode;

    constructor(extensionJson?: any, parent?: ITreeNode) {
        if (extensionJson) {
            this.parse(extensionJson);
        }

    }

    parse(extensionJson: any) {
        const positionJson = extensionJson.position;
        if (positionJson) {
            if (positionJson instanceof Array) {
                this.position = positionJson[positionJson.length - 1];
            } else if (typeof positionJson === 'string') {
                this.position = positionJson;
            }
        }
        this.type = extensionJson.type;
        // extension 没有id  拼一个上去，否则树节点展示会有问题
        this.id = this.type + this.position;

        this.tasks = extensionJson.tasks && extensionJson.tasks.length ?
            extensionJson.tasks
                .filter((taskData) => !!taskData.type)
                .map((taskData) => {
                    if (taskData.type === 'executeNode') {
                        return new ExecuteNode(taskData, this);
                    }
                    if (taskData.type === 'switchNode') {
                        return new SwitchNode(taskData.this);
                    }
                })
                .filter((taskNode) => !!taskNode) : [];
    }

    toJson() {
        const tasks = this.tasks && this.tasks.length ? this.tasks.map((task) => task.toJson()) : [];
        return {
            position: this.position,
            type: this.type,
            tasks
        };;
    }
}
