const DESIGN_ELEMENT_LOCAL = {
    "zh-CHS": {
        codeEditor: {
            switchTo: '切换到',
            unexist: '当前文件"{param}"在系统中未创建',
            nohook: '未注入"{command}"钩子，不能执行{command2}',
            noeditor: '当前编辑器实例不存在',
            unsave: '当前编辑器内容未保存，不能覆盖内容',
            addFailed: '添加方法失败，找不到对应的类代码',
            showFailed: '当前文件不存在，无法渲染',
            modifyNosave: '当前文件已修改尚未保存',
            noshow: '当前文件未渲染，无法进行格式化',
            noshow2: '当前编辑器没有渲染，无法定位到具体位置',
            note: '参数缺少注释',
            note2: '方法缺少注释',
            chatExplainLabel: '解释代码',
            chatExplainText: '解释这段代码',
            chatCommentLabel: '生成代码注释',
            chatCommentText: '生成这段代码的注释',
            chatTestLabel: '生成单元测试',
            chatTestText: '生成这段代码的单元测试'
        }
    }
};

export class DesignElementLocaleHandler {
    static getValue(key: string) {
        const languageCode = 'zh-CHS';
        return DESIGN_ELEMENT_LOCAL[languageCode][key] || '';
    }
}
