var result = decodeURIComponent(getQueryString("callParam"));
var tenantId = getQueryString("tenantId");
var languageCode = getQueryString("languageCode");
var common = gspframeworkService && gspframeworkService.common || {};

$.ajax({
    url: "./api/runtime/sys/v1.0/websession",
    async: false,
    type: "get",
    contentType: "application/json",
    dataType: "json",
    data: null,
    success: function (a) {
        if (a && a.sessionId) {
            if (localStorage.getItem("languageCode") == null) {
                localStorage.setItem("languageCode", languageCode);
            }
            getRouterInfo()
        }
    },
    error: function (e) {
        startRouter();
    }
})

function startRouter() {
    var options = {};
    options.ssoUri = getSSOUri();
    options.header = { 'Authorization': 'Bearer ' + getQueryString("routeParam"), 'X-ECC-Current-Tenant': tenantId, 'Accept-Language': languageCode };
    ajaxRest(options);
}

function getRouterInfo() {
    var options = {};
    options.ssoUri = getSSOUri();
    options.header = { 'X-ECC-Current-Tenant': tenantId, 'Accept-Language': languageCode };
    ajaxRest(options);
}

function ajaxRest(options) {
    $.ajax({
        url: options.ssoUri,
        async: false,
        headers: options.header,
        type: 'GET',
        contentType: 'application/json',
        data: null,
        success: function (res) {
            window.location.href = res;
        },
        error: function (err) {
            if (err.status == 200 && err.responseText) {
                if (localStorage.getItem("languageCode") == null) {
                    localStorage.setItem("languageCode", languageCode);
                }
                window.location.href = err.responseText;
            }
        }
    });
}

function getSSOUri() {
    var ssoUri = './api/runtime/sys/v1.0/routerBack?language=' + languageCode;
    if (getQueryString("callType"))
        ssoUri += '&callType=' + getQueryString("callType");
    if (getQueryString("callParam"))
        ssoUri += '&callParam=' + encodeURIComponent(getQueryString("callParam"));
    if (getQueryString("ssoEntpi"))
        ssoUri += '&ssoEntpi=' + encodeURIComponent(getQueryString("ssoEntpi"));
    var openMode = getQueryString('openMode') ? ('&openMode=' + getQueryString('openMode')) : '';
    var entityParam = base64Encode(getQueryString('entityParam')) ? ('&entityParam=' + base64Encode(getQueryString('entityParam'))) : '';
    var entityParamToMap = getQueryString('entityParamToMap') ? ('&entityParamToMap=' + getQueryString('entityParamToMap')) : '';
    var queryParam = base64Encode(getQueryString('queryParam')) ? ('&queryParam=' + base64Encode(getQueryString('queryParam'))) : '';
    var headerHideMode = getQueryString('headerHideMode') ? ('&headerHideMode=' + getQueryString('headerHideMode')) : '';
    return ssoUri + openMode + entityParam + queryParam + entityParamToMap + headerHideMode;
}

function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null) return unescape(r[2]); return null;
}

function base64Encode(content) {
    try {
        var base64 = common.base64.encode(content);
        return encodeURIComponent(base64);
    } catch (e) {
        console.log(e);
        return '';
    }
}
