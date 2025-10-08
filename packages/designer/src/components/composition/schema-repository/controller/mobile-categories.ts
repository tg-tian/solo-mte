export default  [
    {
        id: "all",
        code: "all",
        name: "全部",
        active: true,
        contains: []
    },
    {
        id: "data",
        code: "data",
        name: "数据",
        active: false,
        contains: ['AddCommands','RemoveCommands', 'EditCommands','UpdateCommands','ViewCommands', 'SaveCommands','LoadCommands','CancelCommands']
    },
    {
        id: "navigate",
        code: "navigate",
        name: "路由",
        active: false,
        contains: ['NavigateCommands']
    },
    {
        id: "flow",
        code: "flow",
        name: "流程",
        active: false,
        contains: ['ApproveService']
    },
    {
        id: "file",
        code: "file",
        name: "附件",
        active: false,
        contains: ['MobileAttachmentCmd']
    },
    {
        id: "stateMachine",
        code: "stateMachine",
        name: "状态机",
        active: false,
        contains: ['StateMachineCommands']
    },
    {
        id: "discussion",
        code: "discussion",
        name: "评论区",
        active: false,
        contains: ['DiscussionGroupCommands']
    },
    {
        id: "ui",
        code: "ui",
        name: "UI相关",
        active: false,
        contains: ['UICommands']
    },
    {
        id: "loadPage",
        code: "loadPage",
        name: "页面加载",
        active: false,
        contains: ['LoadPageCommands']
    },
    {        
        id: "other",
        code: "other",
        name: "其他",
        active: false,
        contains: ['VoVariableService']
    }

];
