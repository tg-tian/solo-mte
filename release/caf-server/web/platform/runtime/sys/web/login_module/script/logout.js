var runtimeStackMode = {};


//加载完立即执行
window.onload = function () {
    // 用户退出时，对框架标识清空
    localStorage.removeItem('frameworkInitTime');
    removeCookie('caf_web_language');
    var queryKey = 'logout-before-redirect';
    var queryValue = this.getQueryParamFromHash(queryKey);
    var extResult = {};
    !queryValue ? extResult = gsprtf.logoutExt.beforeLogout({ sessionValid: true }) :
        extResult = gsprtf.logoutExt.beforeLogout({ sessionValid: false });
    if (extResult && extResult.isRedirect) {
        return;
    }
    this.userLogout();
    gsprtf.logoutExt.afterLogout(null);
}

function userLogout() {
    var uri4J = './logout';
    rest(uri4J, false, "post", 'json', null, null, null);
    var uri4N = './api/runtime/sys/v1.0/UserLogout';
    rest(uri4N, false, "post", 'json', null,
        function () {
            top.window.location.href = "./login.html";
        },
        function () {
            top.window.location.href = "./login.html";
        }
    );
}

function removeCookie(key) {
    var cookieKeys = document.cookie.match(/[^ =;]+(?=\=)/g);
    if (cookieKeys) {
        for (var i = cookieKeys.length; i--;)
            if (cookieKeys[i] == key) {
                document.cookie = cookieKeys[i] + '=0;expires=' + new Date(0).toUTCString()
            }
    }
}

//请求处理
function rest(url, async, method, dataType, param, suc, err) {
    $.ajax({
        url: url,
        async: async,
        type: method,
        contentType: 'application/json',
        dataType: dataType,
        data: param,
        success: function (data) {
            if (suc) {
                suc(data);
            }
        },
        error: function (_info) {
            if (err) {
                err(_info);
            } else
                return;
        }
    });
}

function getQueryParamFromHash(paraName) {
    var url = window.location.hash;
    var arrObj = url.split('?');
    if (arrObj.length > 1) {
        var arrPara = arrObj[1].split('&');
        var arr;
        for (var i = 0; i < arrPara.length; i++) {
            arr = arrPara[i].split('=');
            if (arr != null && arr[0] === paraName) {
                return arr[1];
            }
        }
        return '';
    } else {
        return '';
    }
}
