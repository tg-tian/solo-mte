import { ParamConfig } from './param';

export interface ITreeNode {
    data: {
        id: string;
        name: string;
        code?: string;
    };
    expanded?: boolean;
    children: ITreeNode[];
    parent?: string; // 适配vue的treegrid
    params?: ParamConfig[];
    root?: ITreeNode;
}
