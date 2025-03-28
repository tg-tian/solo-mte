/* eslint-disable @typescript-eslint/indent */
/* eslint-disable no-restricted-syntax */
import { ITreeNode } from './tree-node';
import { IOperationNode } from './operation-node';
import { ExecuteNode } from './execute-node';
import { SwitchNode } from './switch-node';

export class OperationCollection extends Array<ITreeNode & IOperationNode> {

    constructor(handlersJson?: any) {
        super();
        if (handlersJson && handlersJson.length) {
            (handlersJson as any[]).filter((handlerData) => !!handlerData.type)
                .forEach((handlerData) => {
                    if (handlerData.type === 'executeNode') {
                        this.push(new ExecuteNode(handlerData));
                    }
                    if (handlerData.type === 'switchNode') {
                        this.push(new SwitchNode(handlerData));
                    }
                });
        }
    }

    parse(handlersJson: any) {
        if (handlersJson && handlersJson.length) {
            (handlersJson as any[]).filter((handlerData) => !!handlerData.type)
                .forEach((handlerData) => {
                    if (handlerData.type === 'executeNode') {
                        this.push(new ExecuteNode(handlerData));
                    }
                    if (handlerData.type === 'switchNode') {
                        this.push(new SwitchNode(handlerData));
                    }
                });
        }
    }

    toJson() {
        const handlers = this.map((node: IOperationNode) => node.toJson());
        return handlers;
    }
}
