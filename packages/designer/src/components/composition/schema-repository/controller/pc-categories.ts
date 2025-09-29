export default [
    {
        id: 'all',
        code: 'all',
        name: '全部',
        active: true,
        contains: []
    }, {
        id: 'dict',
        code: 'dict',
        name: '字典',
        active: false,
        contains: ['ListCardController', 'AdvancedListCardController', 'AdvancedListCardWithSidebarController', 'TreeCardController']
    },
    {
        id: 'list',
        code: 'list',
        name: '列表',
        active: false,
        contains: ['ListListController', 'ListController', 'TreeListController', 'EditableTreeController', 'EditableListController', 'DatagridController']
    },
    {
        id: 'document',
        code: 'document',
        name: '单据',
        active: false,
        contains: ['CardController']
    },
    {
        id: 'data',
        code: 'data',
        name: '数据',
        active: false,
        contains: ['RemoveCommands', 'EditCommands', 'BatchEditCommands', 'LoadCommands', 'ReferenceDictDataCommands']
    },
    // {
    //     id: 'flow',
    //     code: 'flow',
    //     name: '流程',
    //     active: false,
    //     contains: ['ApproveController']
    // },
    // {
    //     id: 'impExp',
    //     code: 'impExp',
    //     name: '导入导出',
    //     active: false,
    //     contains: ['DataImportExportCommand', 'ListDataImportExportCommand']
    // },
    // {
    //     id: 'file',
    //     code: 'file',
    //     name: '附件',
    //     active: false,
    //     contains: ['FileController', 'AttachmentController']
    // },
    // {
    //     id: 'print',
    //     code: 'print',
    //     name: '打印',
    //     active: false,
    //     contains: ['PrintService']
    // },
    {
        id: 'others',
        code: 'others',
        name: '其他',
        active: false,
        contains: ['DialogController', 'DiscussionGroupController', 'WizardCommands', 'CommandController', 'PopController']
    }
];
