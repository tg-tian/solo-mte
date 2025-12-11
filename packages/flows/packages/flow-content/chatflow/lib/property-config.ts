import { BaseControlProperty, type PropertyPanelConfig } from '@farris/flow-devkit';

class FlowProperty extends BaseControlProperty {

    public getPropertyConfig(_flowData: any) {
      // 暂时隐藏
        // this.propertyConfig.categories['chatflow'] = {
        //     title: '开场白',
        //     description: '对话流的开场白',
        //     properties: {
        //         introduction: {
        //             type: 'string',
        //             editor: {
        //               title: '开场白文案',
        //               type: 'user-prompt-editor',
        //               placeholder: '请输入开场白',
        //               maxLength: 600,
        //               showCount: true,
        //             },
        //         },
        //         openingQuestions: {
        //             type: 'array',
        //             editor: {
        //                 type: 'opening-questions-editor',
        //                 title: '预置问题',
        //                 placeholder: '请输入问题内容',
        //                 maxLength: 500,
        //                 maxQuestions: 5,
        //             },
        //         },
        //     },
        //     setPropertyRelates(changeObject: any, propertyData: any, _paramters: any) {
        //         switch (changeObject?.propertyID) {
        //             case 'introduction':
        //             case 'openingQuestions':
        //                 // 将开场白相关数据保存到extension字段中
        //                 if (!propertyData.extension) {
        //                     propertyData.extension = {};
        //                 }
        //                 propertyData.extension[changeObject.propertyID] = changeObject.propertyValue;
        //                 break;
        //         }
        //     }
        // };
        return this.propertyConfig;
    }
}

export function getPropertyPanelConfig(flowData: any): PropertyPanelConfig {
    const config = new FlowProperty();
    return config.getPropertyConfig(flowData);
}
