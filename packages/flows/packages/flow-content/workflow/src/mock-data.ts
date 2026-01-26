import type { FlowMetadata } from '@farris/flow-devkit';

export const MOCK_FLOW_METADATA: FlowMetadata = {
    id: 'example',
    kind: 'workflow',
    code: 'PPT_Gen',
    name: 'PPT生成',
    description: '根据用户描述，一键生成PPT内容',
    version: 'v1',
    nodes: [{
        id: 'start',
        kind: 'start',
        code: 'start',
        name: '开始',
        description: '',
        inputParams: [{
            code: 'keyword',
            type: {
                source: 'default',
                typeId: 'string',
                typeCode: 'String',
                typeName: 'String',
            },
        }, {
            code: 'count',
            type: {
                source: 'default',
                typeId: 'number',
                typeCode: 'Number',
                typeName: 'Number',
            },
        }],
        outputParams: [],
        inputPorts: [],
        outputPorts: [],
        graphMeta: {
            position: { x: 0, y: 0 },
        },
        extension: {},
    }, {
        id: 'end',
        kind: 'end',
        code: 'end',
        name: '结束',
        description: '',
        inputParams: [],
        outputParams: [],
        inputPorts: [],
        outputPorts: [],
        graphMeta: {
            position: { x: 1000, y: 0 },
        },
        extension: {},
    }],
    edges: [{
        sourceNodeId: 'start',
        targetNodeId: 'end',
        sourcePort: 'output',
        targetPort: 'input',
    }],
    extension: {},
};
