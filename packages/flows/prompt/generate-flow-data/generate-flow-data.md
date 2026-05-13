# 流程编排数据生成指南

本文档指导如何根据用户需求生成流程编排数据。

## 资源文件

生成流程数据时，以下资源文件提供了可选的设备和方法信息：

| 文件                              | 说明                                         |
| --------------------------------- | -------------------------------------------- |
| `assets/all-device-metadata.json` | 设备元数据，包含设备类型、可调用的操作和事件 |
| `assets/all-method-type.json`     | 方法类型元数据，包含可调用的函数及其参数     |

**方法类型说明**：

- `typeUrl`：类型ID
- `type`（参数/返回值类型）：`string`、`number`、`boolean`、`object`、`array`、`any` 之一，或 `null`（表示无返回值）
- `returnType` 为 `null` 表示该方法无返回值

生成设备调用节点、设备事件监听节点、函数调用节点时，可参考这些资源文件获取有效的设备ID、操作ID、方法ID等信息。

## 概述

流程编排数据由节点列表（nodes）和连接线列表（edges）组成：

```json
{
  "nodes": [...],
  "edges": [...]
}
```

**节点（nodes）**：定义流程中的各个处理步骤
**连接线（edges）**：定义节点之间的数据流向

## 核心规则

### 节点ID

- 必须符合 Java 变量命名规则：字母、数字、下划线组成，不能以数字开头
- 全局唯一，不能重复

### 节点名称（name）

- 要求语义化，全局不重复
- 一般使用中文命名
- 示例：调用咖啡机设备时，节点名可命名为"咖啡机"

### 画布边界

- 节点只能和**同一个画布内**的节点连线
- 循环节点的子节点只能和同一个子画布内的其它子节点连线

### 嵌套限制

- 循环节点可以嵌套循环节点（建议不超过3层）
- **设备事件监听节点不能被循环节点嵌套**

### 连接线

- 普通节点的输出端口默认为 `output`，输入端口默认为 `input`
- **选择器节点的输出端口是自定义的**，需要在 edges 中指定具体的端口ID

## 节点类型

共7种节点类型：

| type 值           | 节点名称         | 说明         |
| ----------------- | ---------------- | ------------ |
| variableDef       | 变量定义节点     | 声明新变量   |
| batchAssignValue  | 变量赋值节点     | 给变量赋值   |
| deviceEventListen | 设备事件监听节点 | 流程起始点   |
| device            | 设备调用节点     | 调用设备操作 |
| selector          | 选择器节点       | 条件分支     |
| loop              | 循环节点         | 循环执行     |
| methodInvoke      | 函数调用节点     | 调用工具函数 |

### 变量定义节点

定义新的变量供后续节点使用。

```json
{
  "id": "var_def_1",
  "type": "variableDef",
  "name": "变量定义",
  "position": { "x": 360, "y": 292 },
  "outputParams": [
    {
      "code": "user_name",
      "type": "string",
      "value": { "literal": "张三" }
    },
    {
      "code": "user_age",
      "type": "number",
      "value": { "literal": 25 }
    },
    {
      "code": "user_info",
      "type": "object",
      "value": { "nodeId": "event_1", "variablePath": "data" }
    }
  ]
}
```

### 变量赋值节点

给已定义的变量赋予新值。

```json
{
  "id": "assign_1",
  "type": "batchAssignValue",
  "name": "变量赋值",
  "position": { "x": 730, "y": 175 },
  "assignmentExpressions": [
    {
      "nodeId": "var_def_1",
      "variablePath": "user_name",
      "newValue": { "literal": "李四" }
    },
    {
      "nodeId": "var_def_1",
      "variablePath": "user_age",
      "newValue": { "nodeId": "query_1", "variablePath": "age" }
    }
  ]
}
```

### 设备事件监听节点

作为流程的触发起始点，监听指定设备的事件。

```json
{
  "id": "event_1",
  "type": "deviceEventListen",
  "name": "咖啡完成事件",
  "position": { "x": 0, "y": 260 },
  "deviceModelId": "coffeeMaker",
  "deviceEvent": "coffeeComplete",
  "outputParams": [
    { "code": "duration", "type": "string" },
    { "code": "start_time", "type": "string" },
    { "code": "coffee_type", "type": "string" }
  ]
}
```

**说明**：

- `deviceModelId`：设备类型ID，参考 `assets/all-device-metadata.json` 中的 `modelId`
- `deviceEvent`：事件名称，参考 `assets/all-device-metadata.json` 中该设备类型的 `events` 字段
- `outputParams`：事件携带的参数列表，**必须包含该事件所有的 field**，对应设备元数据中该事件的 `fields` 下的每个字段。不能只添加部分字段，即使某些字段在当前流程中未使用也必须完整声明。

### 设备调用节点

调用指定设备的操作。

```json
{
  "id": "device_call_1",
  "type": "device",
  "name": "咖啡机",
  "position": { "x": 1520, "y": 0 },
  "deviceModelId": "coffeeMaker",
  "deviceId": "coffee001",
  "deviceAction": "makeCoffee",
  "inputParams": [
    { "code": "coffee_type", "value": { "literal": "拿铁" } },
    {
      "code": "amount",
      "value": { "nodeId": "var_def_1", "variablePath": "amount" }
    }
  ]
}
```

**说明**：

- `deviceModelId`：设备类型ID，参考 `assets/all-device-metadata.json` 中的 `modelId`
- `deviceAction`：操作名称，参考 `assets/all-device-metadata.json` 中该设备类型的 `actions` 字段
- `inputParams`：操作入参列表，参考设备元数据中该操作的 `arguments` 字段
- `deviceId`：具体设备ID，为空表示自动选择设备

### 选择器节点

根据条件将流程分发到不同分支。

```json
{
  "id": "selector_1",
  "type": "selector",
  "name": "条件分支",
  "position": { "x": 1100, "y": 215 },
  "branches": [
    {
      "logicOperator": "and",
      "conditions": [
        {
          "left": { "nodeId": "var_def_1", "variablePath": "user_list" },
          "operator": "contain",
          "right": { "nodeId": "var_def_1", "variablePath": "user_code" }
        },
        {
          "left": { "nodeId": "var_def_1", "variablePath": "user_code" },
          "operator": "notEqual",
          "right": { "literal": "" }
        }
      ],
      "port": "branch_1"
    },
    {
      "logicOperator": "and",
      "conditions": [
        {
          "left": { "nodeId": "event_1", "variablePath": "coffee_type" },
          "operator": "equal",
          "right": { "literal": "拿铁" }
        }
      ],
      "port": "branch_2"
    },
    {
      "logicOperator": null,
      "conditions": [],
      "port": "else"
    }
  ]
}
```

**说明**：

- `logicOperator`：多个条件之间的关系，`and` 表示且，`or` 表示或，`null` 表示 ELSE 分支
- `conditions`：条件数组，每个条件为 `{ left, operator, right }` 格式
- `port`：输出端口ID，当条件满足时流程从该端口流出

**比较运算符（operator）**：

| 值                     | 说明         |
| ---------------------- | ------------ |
| equal                  | 等于         |
| notEqual               | 不等于       |
| greaterThan            | 大于         |
| greaterThanEqual       | 大于等于     |
| lessThan               | 小于         |
| lessThanEqual          | 小于等于     |
| contain                | 包含         |
| notContain             | 不包含       |
| isEmpty                | 为空         |
| notEmpty               | 不为空       |
| lengthGreaterThan      | 长度大于     |
| lengthGreaterThanEqual | 长度大于等于 |
| lengthLessThan         | 长度小于     |
| lengthLessThanEqual    | 长度小于等于 |

### 循环节点

根据数组循环执行子画布中的逻辑。

```json
{
  "id": "loop_1",
  "type": "loop",
  "name": "循环处理",
  "position": { "x": 300, "y": 200 },
  "iterableExpr": { "nodeId": "query_items", "variablePath": "items" },
  "iterableVariable": "item",
  "outputParams": []
}
```

循环节点的子节点提升到顶层数组中，通过 `parentNodeId` 字段关联父节点：

```json
{
  "id": "loop_child_1",
  "type": "methodInvoke",
  "name": "处理项",
  "position": { "x": 300, "y": 350 },
  "parentNodeId": "loop_1",
  "typeUrl": "com.inspur.edp.rule.dsl.core.function.list.ListUtils",
  "methodCode": "size",
  "parameters": [
    { "code": "list", "value": { "nodeId": "loop_1", "variablePath": "items" } }
  ],
  "outputParams": [{ "code": "returnValue", "type": "number" }]
}
```

### 函数调用节点

调用业务方法。

```json
{
  "id": "invoke_1",
  "type": "methodInvoke",
  "name": "获取字符串长度",
  "position": { "x": 600, "y": 200 },
  "typeUrl": "com.inspur.edp.rule.dsl.core.function.StringUtils",
  "methodCode": "length",
  "parameters": [
    {
      "code": "str",
      "value": { "nodeId": "var_def_1", "variablePath": "user_name" }
    }
  ],
  "outputParams": [{ "code": "returnValue", "type": "number" }]
}
```

**说明**：

- `typeUrl`：方法所属的类型ID，参考 `assets/all-method-type.json` 中的 `typeUrl`
- `methodCode`：方法编号，参考 `assets/all-method-type.json` 中该类型的 `methods.code`
- `parameters`：方法入参列表，参考 `assets/all-method-type.json` 中该方法的 `parameters` 字段
- `outputParams`：固定为 `returnValue`，表示函数返回值

#### 嵌套函数调用

参数值可以是另一个函数调用：

```json
{
  "id": "invoke_2",
  "type": "methodInvoke",
  "name": "截取字符串",
  "position": { "x": 900, "y": 200 },
  "typeUrl": "com.inspur.edp.rule.dsl.core.function.StringUtils",
  "methodCode": "subString",
  "parameters": [
    {
      "code": "str",
      "value": {
        "methodInvoke": {
          "typeUrl": "com.inspur.edp.rule.dsl.core.function.StringUtils",
          "methodCode": "toLowerCase",
          "parameters": [
            {
              "code": "str",
              "value": { "nodeId": "var_def_1", "variablePath": "user_name" }
            }
          ]
        }
      }
    },
    { "code": "beginIndex", "value": { "literal": 0 } },
    { "code": "length", "value": { "literal": 5 } }
  ],
  "outputParams": [{ "code": "returnValue", "type": "string" }]
}
```

## 值表达式

表示一个具体的值，三种形式：

### 1. 变量引用

引用某个前序节点的输出变量：

```json
{ "nodeId": "node_id", "variablePath": "field_name" }
```

### 2. 常量

字面量常量值：

```json
{ "literal": "字符串" }
{ "literal": 123 }
{ "literal": true }
{ "literal": ["a", "b", "c"] }
```

### 3. 嵌套函数调用

函数返回值作为当前参数的值：

```json
{
  "methodInvoke": {
    "typeUrl": "类型ID",
    "methodCode": "方法编号",
    "parameters": [...]
  }
}
```

## 连接线

表示节点之间的数据流向：

```json
{
  "sourceNodeId": "node_a",
  "targetNodeId": "node_b"
}
```

### 端口说明

- 普通节点：源端口默认为 `output`，目标端口默认为 `input`
- 选择器节点：需要指定源端口（从 `branches` 中选择端口）

选择器节点的连接线示例：

```json
{
  "sourceNodeId": "selector_1",
  "sourcePort": "branch_1",
  "targetNodeId": "node_b"
}
```

## 简单示例

监听咖啡完成事件，根据咖啡类型是卡布奇诺还是其它，分别将空调设为制冷或制热模式：

```json
{
  "nodes": [
    {
      "id": "event_1",
      "type": "deviceEventListen",
      "name": "咖啡完成事件",
      "position": { "x": 0, "y": 260 },
      "deviceModelId": "coffeeMaker",
      "deviceEvent": "coffeeComplete",
      "outputParams": [
        { "code": "duration", "type": "string" },
        { "code": "start_time", "type": "string" },
        { "code": "coffee_type", "type": "string" }
      ]
    },
    {
      "id": "selector_1",
      "type": "selector",
      "name": "判断咖啡类型",
      "position": { "x": 400, "y": 260 },
      "branches": [
        {
          "logicOperator": "and",
          "conditions": [
            {
              "left": { "nodeId": "event_1", "variablePath": "coffee_type" },
              "operator": "equal",
              "right": { "literal": "Cappuccino" }
            }
          ],
          "port": "cappuccino"
        },
        {
          "logicOperator": null,
          "conditions": [],
          "port": "else"
        }
      ]
    },
    {
      "id": "device_call_cool",
      "type": "device",
      "name": "空调制冷",
      "position": { "x": 700, "y": 160 },
      "deviceModelId": "AC",
      "deviceId": "",
      "deviceAction": "setMode",
      "inputParams": [{ "code": "mode", "value": { "literal": "cool" } }]
    },
    {
      "id": "device_call_heat",
      "type": "device",
      "name": "空调制热",
      "position": { "x": 700, "y": 360 },
      "deviceModelId": "AC",
      "deviceId": "",
      "deviceAction": "setMode",
      "inputParams": [{ "code": "mode", "value": { "literal": "heat" } }]
    }
  ],
  "edges": [
    { "sourceNodeId": "event_1", "targetNodeId": "selector_1" },
    {
      "sourceNodeId": "selector_1",
      "sourcePort": "cappuccino",
      "targetNodeId": "device_call_cool"
    },
    {
      "sourceNodeId": "selector_1",
      "sourcePort": "else",
      "targetNodeId": "device_call_heat"
    }
  ]
}
```

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "流程编排数据",
  "description": "描述流程编排数据的JSON结构",
  "type": "object",
  "required": ["nodes", "edges"],
  "properties": {
    "nodes": {
      "type": "array",
      "description": "节点列表，节点只能和同一画布内的节点连线",
      "items": {
        "oneOf": [
          { "$ref": "#/definitions/VariableDefNode" },
          { "$ref": "#/definitions/VariableAssignmentNode" },
          { "$ref": "#/definitions/DeviceEventListenNode" },
          { "$ref": "#/definitions/DeviceCallNode" },
          { "$ref": "#/definitions/SelectorNode" },
          { "$ref": "#/definitions/LoopNode" },
          { "$ref": "#/definitions/MethodInvokeNode" }
        ]
      }
    },
    "edges": {
      "type": "array",
      "description": "连接线列表，表示节点之间的数据流向",
      "items": { "$ref": "#/definitions/Edge" }
    }
  },
  "definitions": {
    "Node": {
      "type": "object",
      "description": "所有节点的基类属性",
      "required": ["id", "type", "name"],
      "properties": {
        "id": {
          "type": "string",
          "description": "节点唯一标识，全局不能重复。必须符合 Java 变量命名规则：字母、数字、下划线组成，不能以数字开头"
        },
        "type": {
          "type": "string",
          "description": "节点类型，决定节点的配置结构"
        },
        "name": {
          "type": "string",
          "description": "节点名称，要求语义化、全局不重复，一般使用中文命名"
        },
        "position": {
          "type": "object",
          "description": "节点在画布上的坐标",
          "properties": {
            "x": { "type": "number", "description": "横坐标" },
            "y": { "type": "number", "description": "纵坐标" }
          }
        }
      }
    },

    "Edge": {
      "type": "object",
      "description": "连接线，连接同一画布内的两个节点",
      "required": ["sourceNodeId", "targetNodeId"],
      "properties": {
        "sourceNodeId": {
          "type": "string",
          "description": "源节点ID"
        },
        "targetNodeId": {
          "type": "string",
          "description": "目标节点ID"
        },
        "sourcePort": {
          "type": "string",
          "description": "源端口ID。普通节点默认为 output；选择器节点需要指定具体端口（如 branch_1、branch_2）"
        },
        "targetPort": {
          "type": "string",
          "description": "目标端口ID，默认为 input"
        }
      }
    },

    "ValueExpr": {
      "description": "值表达式，表示一个具体的值，可以是常量、变量引用或嵌套函数调用",
      "oneOf": [
        {
          "type": "object",
          "required": ["nodeId", "variablePath"],
          "description": "引用某个前序节点的输出变量",
          "properties": {
            "nodeId": { "type": "string", "description": "被引用节点ID" },
            "variablePath": {
              "type": "string",
              "description": "变量名或字段路径，如 duration 或 user.name"
            }
          }
        },
        {
          "type": "object",
          "required": ["literal"],
          "description": "字面量常量值",
          "properties": {
            "literal": {
              "type": ["string", "number", "boolean", "array", "object"],
              "description": "常量值"
            }
          }
        },
        {
          "type": "object",
          "required": ["methodInvoke"],
          "description": "嵌套的函数调用表达式，函数返回值作为当前参数的值",
          "properties": {
            "methodInvoke": {
              "type": "object",
              "required": ["typeUrl", "methodCode"],
              "description": "函数调用详情",
              "properties": {
                "typeUrl": {
                  "type": "string",
                  "description": "函数所属的类型ID"
                },
                "methodCode": { "type": "string", "description": "函数编号" },
                "parameters": {
                  "type": "array",
                  "description": "函数入参列表",
                  "items": {
                    "type": "object",
                    "required": ["code", "value"],
                    "description": "单个入参",
                    "properties": {
                      "code": {
                        "type": "string",
                        "description": "参数编号，必须符合 Java 变量命名规则"
                      },
                      "value": {
                        "$ref": "#/definitions/ValueExpr",
                        "description": "参数值，可以是变量引用、常量或嵌套函数调用"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    },

    "CompareOperator": {
      "type": "string",
      "description": "比较运算符",
      "enum": [
        "equal",
        "notEqual",
        "greaterThan",
        "greaterThanEqual",
        "lessThan",
        "lessThanEqual",
        "lengthGreaterThan",
        "lengthGreaterThanEqual",
        "lengthLessThan",
        "lengthLessThanEqual",
        "contain",
        "notContain",
        "isEmpty",
        "notEmpty"
      ]
    },

    "LoopChildNode": {
      "type": "object",
      "description": "可作为循环节点子节点的节点配置",
      "properties": {
        "parentNodeId": {
          "type": "string",
          "description": "指向父循环节点的ID，表示此节点属于该循环节点的子画布"
        }
      }
    },

    "VariableDefNode": {
      "description": "变量定义节点，用于声明新的变量供后续节点使用",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        { "$ref": "#/definitions/LoopChildNode" },
        {
          "type": "object",
          "required": ["outputParams"],
          "properties": {
            "type": { "const": "variableDef" },
            "outputParams": {
              "type": "array",
              "description": "定义的变量列表，作为节点的输出变量供后续节点引用",
              "items": {
                "type": "object",
                "required": ["code", "type", "value"],
                "description": "单个变量定义",
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "变量编号，必须符合 Java 变量命名规则，全局唯一"
                  },
                  "type": {
                    "type": "string",
                    "description": "变量类型，如 string、number、boolean、object、array"
                  },
                  "value": {
                    "$ref": "#/definitions/ValueExpr",
                    "description": "变量初始值，可以是常量或变量引用"
                  }
                }
              }
            }
          }
        }
      ]
    },

    "VariableAssignmentNode": {
      "description": "变量赋值节点，用于给已定义的变量赋予新值",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        { "$ref": "#/definitions/LoopChildNode" },
        {
          "type": "object",
          "required": ["assignmentExpressions"],
          "properties": {
            "type": { "const": "batchAssignValue" },
            "assignmentExpressions": {
              "type": "array",
              "description": "赋值表达式列表，支持批量赋值",
              "items": {
                "type": "object",
                "required": ["nodeId", "variablePath", "newValue"],
                "description": "单个赋值表达式",
                "properties": {
                  "nodeId": {
                    "type": "string",
                    "description": "要赋值的变量所属节点ID"
                  },
                  "variablePath": {
                    "type": "string",
                    "description": "变量名或字段路径"
                  },
                  "newValue": {
                    "$ref": "#/definitions/ValueExpr",
                    "description": "新值，可以是常量、变量引用或函数调用"
                  }
                }
              }
            }
          }
        }
      ]
    },

    "DeviceEventListenNode": {
      "description": "设备事件监听节点，作为流程的触发起始点。只能作为主画布的起始节点，不能被循环节点嵌套",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        {
          "type": "object",
          "required": ["deviceModelId", "deviceEvent", "outputParams"],
          "properties": {
            "type": { "const": "deviceEventListen" },
            "deviceModelId": {
              "type": "string",
              "description": "要监听的设备类型ID，对应设备元数据中的 modelId"
            },
            "deviceEvent": {
              "type": "string",
              "description": "要监听的事件名称，如 coffeeComplete"
            },
            "outputParams": {
              "type": "array",
              "description": "事件携带的参数列表，作为节点的输出变量",
              "items": {
                "type": "object",
                "required": ["code", "type"],
                "description": "单个输出参数",
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "参数编号，必须符合 Java 变量命名规则"
                  },
                  "type": { "type": "string", "description": "参数类型" }
                }
              }
            }
          }
        }
      ]
    },

    "DeviceCallNode": {
      "description": "设备调用节点，用于调用指定设备的操作",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        { "$ref": "#/definitions/LoopChildNode" },
        {
          "type": "object",
          "required": ["deviceModelId", "deviceAction", "inputParams"],
          "properties": {
            "type": { "const": "device" },
            "deviceModelId": {
              "type": "string",
              "description": "设备类型ID，如 coffeeMaker"
            },
            "deviceId": {
              "type": "string",
              "description": "具体设备ID，为空表示自动选择设备"
            },
            "deviceAction": {
              "type": "string",
              "description": "要调用的设备操作，如 makeCoffee"
            },
            "inputParams": {
              "type": "array",
              "description": "设备操作的入参列表",
              "items": {
                "type": "object",
                "required": ["code", "value"],
                "description": "单个入参",
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "参数编号，必须符合 Java 变量命名规则"
                  },
                  "value": {
                    "$ref": "#/definitions/ValueExpr",
                    "description": "参数值"
                  }
                }
              }
            }
          }
        }
      ]
    },

    "SelectorBranch": {
      "type": "object",
      "description": "选择器节点的条件分支",
      "required": ["conditions", "port"],
      "properties": {
        "logicOperator": {
          "type": ["string", "null"],
          "enum": ["and", "or", null],
          "description": "多个条件之间的逻辑关系，and 表示且，or 表示或"
        },
        "conditions": {
          "type": "array",
          "description": "条件列表，为空则表示ELSE分支",
          "items": {
            "type": "object",
            "required": ["left", "operator", "right"],
            "description": "单个比较条件",
            "properties": {
              "left": {
                "$ref": "#/definitions/ValueExpr",
                "description": "左值表达式"
              },
              "operator": {
                "$ref": "#/definitions/CompareOperator",
                "description": "比较运算符"
              },
              "right": {
                "$ref": "#/definitions/ValueExpr",
                "description": "右值表达式"
              }
            }
          }
        },
        "port": {
          "type": "string",
          "description": "输出端口ID，当条件满足时流程从该端口流出"
        }
      }
    },

    "SelectorNode": {
      "description": "选择器节点，根据条件将流程分发到不同分支",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        { "$ref": "#/definitions/LoopChildNode" },
        {
          "type": "object",
          "required": ["branches"],
          "properties": {
            "type": { "const": "selector" },
            "branches": {
              "type": "array",
              "description": "分支列表，每个分支对应一个输出端口",
              "items": { "$ref": "#/definitions/SelectorBranch" }
            }
          }
        }
      ]
    },

    "LoopNode": {
      "description": "循环节点，根据数组循环执行子画布中的逻辑",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        { "$ref": "#/definitions/LoopChildNode" },
        {
          "type": "object",
          "required": ["iterableExpr", "iterableVariable"],
          "properties": {
            "type": { "const": "loop" },
            "iterableExpr": {
              "$ref": "#/definitions/ValueExpr",
              "description": "循环数组表达式，其值必须是可迭代的数组"
            },
            "iterableVariable": {
              "const": "item",
              "description": "循环变量名，固定为 item，表示当前遍历的元素"
            },
            "outputParams": {
              "type": "array",
              "description": "循环节点的输出变量列表，可被子节点和后续节点引用",
              "items": {
                "type": "object",
                "description": "输出参数",
                "properties": {
                  "code": { "type": "string", "description": "参数编号" },
                  "type": { "type": "string", "description": "参数类型" }
                }
              }
            }
          }
        }
      ]
    },

    "MethodInvokeNode": {
      "description": "函数调用节点，用于调用一个业务方法",
      "allOf": [
        { "$ref": "#/definitions/Node" },
        { "$ref": "#/definitions/LoopChildNode" },
        {
          "type": "object",
          "required": ["typeUrl", "methodCode", "parameters", "outputParams"],
          "properties": {
            "type": { "const": "methodInvoke" },
            "typeUrl": {
              "type": "string",
              "description": "方法所属的类型ID，对应类型元数据中的 typeId"
            },
            "methodCode": {
              "type": "string",
              "description": "方法编号，对应类型元数据中 methods.code"
            },
            "parameters": {
              "type": "array",
              "description": "方法入参列表",
              "items": {
                "type": "object",
                "required": ["code", "value"],
                "description": "单个入参",
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "参数编号，必须符合 Java 变量命名规则"
                  },
                  "value": {
                    "$ref": "#/definitions/ValueExpr",
                    "description": "参数值，可以是常量、变量引用或嵌套函数调用"
                  }
                }
              }
            },
            "outputParams": {
              "type": "array",
              "description": "方法调用节点的输出参数列表",
              "items": {
                "type": "object",
                "required": ["code", "type"],
                "description": "固定为 returnValue，表示函数返回值",
                "properties": {
                  "code": {
                    "const": "returnValue",
                    "description": "固定为 returnValue"
                  },
                  "type": { "type": "string", "description": "返回值类型" }
                }
              }
            }
          }
        }
      ]
    }
  }
}
```
