export interface TemplateEntity {
    id?: string;
    name: string;
    description?: string;
    // 模板内容
    component: any;
}

export const mockData = [
    {
        "id":"template111",
        "name":"分类导航1",
        "component":{
            "id": "html_template_9941",
            "type": "html-template",
            "html": "<li class=\"f-list-view-group-item f-listview-card-content-fill f-tmpl-card--header-multicontent02\"\r\nid=\"5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c\">\r\n<div class=\"f-list-select \">\r\n<list-view-checkout>\r\n<div class=\"custom-control custom-checkbox custom-control-inline listview-checkbox\"><input\r\nclass=\"custom-control-input\" type=\"checkbox\"><label class=\"custom-control-label\"></label></div>\r\n</list-view-checkout>\r\n</div>\r\n<div class=\"f-list-content\">\r\n<div class=\"header-multicontent02 \">\r\n<div class=\"header-multicontent02--header\">\r\n<h4 class=\"f-title\">差旅费报销单</h4>\r\n<div class=\"f-state\">\r\n<span class=\"badge badge-danger\">待审批</span>\r\n</div>\r\n</div>\r\n<div class=\"header-multicontent02--content\">\r\n<p><span class=\"text-label\">报销单号：</span>BX20240522001</p>\r\n<p><span class=\"text-label\">申请人：</span>陈思远</p>\r\n<p><span class=\"text-label\">所属部门：</span>\r\n<span class=\"\">市场部</span>\r\n</p>\r\n<p><span class=\"text-label\">报销日期：</span>\r\n<span class=\"\">2024-05-22</span>\r\n</p>\r\n<p><span class=\"text-label\">报销金额：</span><span class=\"f-emphasize\">¥4,280.50</span></p>\r\n</div>\r\n<div class=\"d-flex align-items-center header-multicontent02--footer\">\r\n<div class=\"footer--auxiliary\"><img src=\"assets/img/person-3.png\"></div>\r\n<p class=\"mr-auto text--name\">财务审核</p>\r\n<p class=\"f-toolbar\"><span class=\"icon-btn\"><i class=\"f-icon f-icon-editor\"></i></span><span\r\nclass=\"icon-btn\"><i class=\"f-icon f-icon-expense\"></i></span></p>\r\n</div>\r\n</div>\r\n</div>\r\n</li>"
        }
    },
    {
        "id":"template1222",
        "name":"卡片摘要1",
        "component":{
            "id": "html_template_1111",
            "type": "html-template",
            "html": "<div class=\"f-list-nav-in  resizable-handle-redefine\" style=\"width: 240px; height: 100%;\">\r\n<div class=\"f-list-nav-main\">\r\n<div class=\"f-list-nav-header\">\r\n<div class=\"f-list-nav-title\" style=\"\r\nfont-size: 17px !important;\r\ncolor: rgb(45, 47, 51) !important;\r\nline-height: 24px !important;\r\npadding: 0.625rem 0.875rem 0.375rem !important;\r\nborder-width: initial !important;\r\nborder-style: none !important;\r\nborder-color: initial !important;\r\nborder-image: initial !important;\r\n\"> 系统设置 </div>\r\n</div>\r\n<div class=\"f-list-nav-content\">\r\n<farris-list-view listidname=\"id\">\r\n<div class=\"f-list-view\">\r\n<div class=\"f-list-view-content\">\r\n<ul class=\"f-list-view-group\">\r\n<li class=\"f-list-view-group-item f-listview-active\" style=\" background: inherit;\" id=\"401\">\r\n<div class=\"f-list-content\">\r\n<div class=\"f-template-listnav-row\">\r\n<a class=\"list-nav-link active\" title=\"基础设置\">\r\n<span class=\"nav-item-name\"> 基础设置 </span>\r\n<span class=\"nav-item-counter\"> 3 </span>\r\n</a>\r\n</div>\r\n</div>\r\n</li>\r\n<li class=\"f-list-view-group-item\" id=\"402\">\r\n<div class=\"f-list-content\">\r\n<div class=\"f-template-listnav-row\">\r\n<a class=\"list-nav-link\" title=\"用户权限\">\r\n<span class=\"nav-item-name\"> 用户权限 </span>\r\n<span class=\"nav-item-counter\"> 5 </span>\r\n</a>\r\n</div>\r\n</div>\r\n</li>\r\n<li class=\"f-list-view-group-item\" id=\"403\">\r\n<div class=\"f-list-content\">\r\n<div class=\"f-template-listnav-row\"><a class=\"list-nav-link\" title=\"系统参数\"><span\r\nclass=\"nav-item-name\"> 系统参数 </span>\r\n</a></div>\r\n</div>\r\n</li>\r\n<li class=\"f-list-view-group-item\" id=\"404\">\r\n<div class=\"f-list-content\">\r\n<div class=\"f-template-listnav-row\"><a class=\"list-nav-link\" title=\"数据备份\"><span\r\nclass=\"nav-item-name\"> 数据备份 </span>\r\n</a></div>\r\n</div>\r\n</li>\r\n<li class=\"f-list-view-group-item\" id=\"405\">\r\n<div class=\"f-list-content\">\r\n<div class=\"f-template-listnav-row\"><a class=\"list-nav-link\" title=\"日志管理\"><span\r\nclass=\"nav-item-name\"> 日志管理 </span>\r\n</a></div>\r\n</div>\r\n</li>\r\n<li class=\"f-list-view-group-item\" id=\"406\">\r\n<div class=\"f-list-content\">\r\n<div class=\"f-template-listnav-row\"><a class=\"list-nav-link\" title=\"接口配置\"><span\r\nclass=\"nav-item-name\"> 接口配置 </span>\r\n</a></div>\r\n</div>\r\n</li>\r\n</ul>\r\n</div>\r\n</div>\r\n</farris-list-view>\r\n</div>\r\n</div>\r\n<div class=\"f-list-nav-toggle-sidebar\"><span class=\"triangle\"></span>\r\n</div>\r\n</div>"
        }
    }
]