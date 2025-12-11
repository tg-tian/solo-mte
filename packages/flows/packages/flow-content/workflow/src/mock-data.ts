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
            position: { x: 80, y: 150 },
        },
        extension: {},
    }, {
        id: 'llm',
        kind: 'LLMClient',
        code: 'llm',
        name: '大模型',
        description: '',
        inputParams: [{
            code: 'question',
            type: {
                source: 'default',
                typeId: 'string',
                typeCode: 'String',
                typeName: 'String',
            },
            valueExpr: {
                kind: 'nodeVariable',
                nodeCode: 'start',
                variable: 'keyword',
            },
        }],
        outputParams: [{
            code: 'result',
            type: {
                source: 'default',
                typeId: 'string',
                typeCode: 'String',
                typeName: 'String',
            },
        }],
        inputPorts: [],
        outputPorts: [],
        graphMeta: {
            position: { x: 450, y: 150 },
        },
        extension: {},
    }, {
        id: 'end',
        kind: 'end',
        code: 'end',
        name: '结束',
        description: '',
        inputParams: [],
        outputParams: [{
            code: 'outline',
            type: {
                source: 'default',
                typeId: 'string',
                typeCode: 'String',
                typeName: 'String',
            },
            valueExpr: {
                kind: 'nodeVariable',
                nodeCode: 'llm',
                variable: 'result',
            },
        }],
        inputPorts: [],
        outputPorts: [],
        graphMeta: {
            position: { x: 850, y: 150 },
        },
        extension: {},
    }],
    edges: [{
        sourceNodeId: 'start',
        targetNodeId: 'llm',
        sourcePort: 'output',
        targetPort: 'input',
    }, {
        sourceNodeId: 'llm',
        targetNodeId: 'end',
        sourcePort: 'output',
        targetPort: 'input',
    }],
    extension: {},
};
