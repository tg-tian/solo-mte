var oHead = document.getElementsByTagName('head').item(0);
var defaultCAList = ["apisocket.js", "itrus.api.js"];
var uri = "./api/runtime/sys/v1.0/rtf-configuration/loginresource/-1/zh-CHS";

var topWin = window.self;
while (topWin.location.origin === topWin.parent.location.origin) {
    if (topWin != topWin.parent) {
        topWin = topWin.parent;
    } else {
        break;
    }
}
var caList = topWin.gspframeworkService;
if (!!caList && !!caList.common) {
    if (!!caList.common.frmConfig)
        defaultCAList = caList.common.frmConfig.get().frmConfig.CAPath.split("&");
} else {
    var commonService = top.gspframeworkService.common;
    if (!!commonService) {
        var options = {
            url: uri,
            async: false,
            dataType: 'json'
        };
        commonService.rest.get(options, function (data) {
            var loginResource = data;
            if (loginResource != undefined && loginResource.CAPath != undefined) {
                defaultCAList = loginResource.CAPath.split("&");
            }
            loadCS(defaultCAList);
        }, function () { loadCS(defaultCAList); });
    }
}
loadCS(defaultCAList);

function loadCS(CAList) {
    for (var i = 0; i < CAList.length; i++) {
        var oScript = document.createElement("script");
        oScript.type = "text/javascript";

        let path = topWin.gspframeworkService.common.getBasePath.get();

        oScript.src = path+"/platform/runtime/sys/web/login_module/script/" + CAList[i] + "?v=2023110901001";
        oHead.appendChild(oScript);
    }
}

async function checkState(suc) {
    var src = "/platform/runtime/sys/web/login_module/script/" + defaultCAList[0] + "?v=2023110901001";
    await $.getScript(src, function call() {
        defaultCAList.splice(0, 1);
        if (defaultCAList.length == 0)
            suc();
        else
            checkState(suc);
    });
}



