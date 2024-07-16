/**
 * 浏览器刷新、关闭事件监听，ajax清理func state，坑比较多，参考链接
 * https://stackoverflow.com/questions/568977/identifying-between-refresh-and-close-browser-actions/13916847#13916847 
 * @author huangwenchao
 * @date 2021/1/26
 */

window.gspWindowEvent = window.gspWindowEvent || {};
gspWindowEvent.event = gspWindowEvent.event || {};

gspWindowEvent.event = (function (event, win, $) {

    var userAgent = navigator.userAgent;
    var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera; //判断是否IE浏览器  
    var isEdge = userAgent.toLowerCase().indexOf("edge") > -1 && !isIE;
    var isIE11 = (userAgent.toLowerCase().indexOf("trident") > -1 && userAgent.indexOf("rv") > -1);
    var isFF = userAgent.indexOf("Firefox") > -1;

    window.onbeforeunload = function (e) {
        var tabs = gspframeworkService.rtf.tabs.getAll();
        var bodyParam = [];
        if (!tabs || tabs.length === 0) {

            return;
        }

        for (var i = 0; i < tabs.length; i++) {
            if (!tabs[i]) {
                continue;
            }
            var actionType;
            var t = tabs[i];
            if (t.appType === 'app') {
                actionType = 'quitapp';
            } else {
                actionType = 'quit';
            }
            bodyParam.push({
                tabId: t.id,
                token: t.formToken,
                funcId: t.funcId,
                appId: t.appId,
                appEntrance: t.appEntrance,
                menuName: t.FuncName,
                action: actionType
            });
        }
        var options = {
            url: './api/runtime/sys/v1.0/function-states/clear',
            async: !(isIE || isEdge || isIE11 || isFF),
            dataType: 'json',
            param: JSON.stringify(bodyParam)
        };
        gspframeworkService.common.rest.post(options, function (res) {
            console.log(res);
        }, function (err) {
            console.log(err);
        });
    };

    window.onunload = function (e) {
        return;
    };

    $(window).on('popstate', function () {
        window.history.forward(1)
    });

    return event;
})(gspWindowEvent.event || {}, window, jQuery);

