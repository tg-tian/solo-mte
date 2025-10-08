/**
 * 支持的变量类型
 */
export const FormVariableTypes = [
    { text: '字符串', value: 'String' },
    { text: '数字', value: 'Number' },
    { text: '布尔', value: 'Boolean' },
    { text: '日期', value: 'Date' },
    { text: '日期时间', value: 'DateTime' },
    { text: '文本', value: 'Text' },
    { text: '对象', value: 'Object' },
    { text: '数组', value: 'Array' }
];

export const MetadataServiceToken = 'Meatdata_Http_Service_Token';
export const MetadataPathToken = 'Metadata_Path_Token';


/**
 * schema字段的类型名称（国际化）
 */
export const EntityFieldTypeDisplayNamei18n = {
    String: '字符串',
    Number: '数字',
    BigNumber: '大数字',
    Boolean: '布尔',
    Date: '日期',
    DateTime: '日期时间',
    Text: '文本',
    Enum: '枚举',
    MultiLanguage: '多语言'
};


export const FormVariableCategories = [
    { text: '组件变量', value: 'locale' },
    { text: '表单变量', value: 'remote' },
];
