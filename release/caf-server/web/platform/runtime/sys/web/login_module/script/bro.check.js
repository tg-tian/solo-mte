// 设置浏览器支持版本
var Chrome_Version = 63;
var Firefox_Version = 70;
var Opera_Version;
var IE_Version;
var Safari_Version;
// 设置浏览器检查失败后跳转地址
var checkFailedUrl = "/browser.html";

function checkMyBrowser() {
    var userAgent = navigator.userAgent;
    var isOpera = userAgent.indexOf("Opera") > -1;
    var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera; //判断是否IE浏览器  
    var isEdge = userAgent.toLowerCase().indexOf("edge") > -1 && !isIE;
    var isIE11 = (userAgent.toLowerCase().indexOf("trident") > -1 && userAgent.indexOf("rv") > -1);

    // 检查Firefox版本
    if (/[Ff]irefox(\/\d+\.\d+)/.test(userAgent)) {
        tempArray = /([Ff]irefox)\/(\d+\.\d+)/.exec(userAgent);
        if (tempArray[2] < Firefox_Version && tempArray[2] != 52.0)
            checkFailed();
    }
    // 检查Chrome版本
    else if (/[Cc]hrome\/\d+/.test(userAgent)) {
        tempArray = /([Cc]hrome)\/(\d+)/.exec(userAgent);
        if (tempArray[2] < Chrome_Version)
            checkFailed();
    }
    // IE、Edge不支持
    else if (isIE || isEdge) {
        checkFailed();
    }
    //IE11支持
    else if (isIE11) {
        checkFailed();
    }
    // Safari支持
    else if (/[Vv]ersion\/\d+\.\d+\.\d+(\.\d)* *[Ss]afari/.test(userAgent)) {
        //checkFailed();
    }
    // Opera支持
    else if (/[Oo]pera.+[Vv]ersion\/\d+\.\d+/.test(userAgent)) {
        //checkFailed();
    } else {
        //checkFailed();
    }
};

// 浏览器检查失败后动作
function checkFailed() {
    var resourceUri = "./api/runtime/sys/v1.0/rtf-configuration/loginresource/";
    var uri = resourceUri + "-1/zh-CHS";
    rest(uri, false, "get", "json", null, function(data) {
        if (data != undefined && data.browserCheckUrl != undefined) {
            checkFailedUrl = data.browserCheckUrl;
        }
    });
    window.location.href = checkFailedUrl;
}

function rest(url, async, method, dataType, param, suc, err) {
    $.ajax({
        url: url,
        async: async,
        type: method,
        contentType: 'application/json',
        dataType: dataType,
        data: param,
        success: function(data) {
            if (suc) {
                suc(data);
            }
        },
        error: function(_info) {
            if (err) {
                err(_info);
            } else
                return;
        }
    });
}