import { DesignerMode } from "./designer-context";

export function resolveFormModulePropertyConfig(designerMode: DesignerMode) {
    return {
        "title": "module",
        "description": "表单元数据属性配置",
        "type": "object",
        "categories": {
            "rtcBasic": {
                "title": "扩展表单",
                "hide": designerMode !== DesignerMode.PC_RTC,
                "properties": {
                    "rtcId": {
                        "title": "表单元数据标识",
                        "type": "string",
                        "readonly": true
                    },
                    "rtcCode": {
                        "title": "表单元数据编号",
                        "type": "string",
                        "readonly": true
                    },
                    "rtcName": {
                        "title": "表单元数据名称",
                        "type": "string",
                        "readonly": true
                    }
                }
            },
            "basic": {
                "title": designerMode === DesignerMode.PC_RTC ? "基础表单" : "基本信息",
                "properties": {
                    "id": {
                        "title": "表单元数据标识",
                        "type": "string",
                        "readonly": true
                    },
                    "code": {
                        "title": "表单元数据编号",
                        "type": "string",
                        "readonly": true
                    },
                    "name": {
                        "title": "表单元数据名称",
                        "type": "string",
                        "readonly": true
                    }
                }
            }
        }
    }
};
