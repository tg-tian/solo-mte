var themKey = "gsp_rtf_themesKey"
var themSKey = 'gsp_rtf_themSKey';
var themesStyleKey = 'gsp_rtf_themesStyleKey';
var lanCode = 'languageCode';
var key = localStorage.getItem(themKey);
var key2 = localStorage.getItem(themSKey);
var key3 = localStorage.getItem(themesStyleKey);
var deployMode = false;
var themesUrl = "/api/runtime/sys/v1.0/loginInfo?infoType=themes";
var defaultUrl = "/api/runtime/sys/v1.0/userinfos/themes/default?defaultflag=";

var topWin = window.self;
while (topWin.location.origin === topWin.parent.location.origin) {
    if (topWin != topWin.parent) {
        topWin = topWin.parent;
    } else {
        break;
    }
}
var json;
var themesJson = topWin.gspframeworkService;
if (!!themesJson && !!themesJson.common) {
    themesJson = themesJson.common.userInfos;
    if (!!themesJson && !!themesJson.getThemeBack) {
        themesJson.getThemeBack(function (json) {
            if (json && json !== "[]" && json !== null) {
                key = json[0].path;
                localStorage.setItem(themKey, key.themesColor);
                localStorage.setItem(themSKey, key.themesSize);
                localStorage.setItem(themesStyleKey, key.themesStyle);
                addThemes(key.themesColor, key.themesSize);
            } else
                getDefaultThemes();
        })
    } else {
        var path = topWin.gspframeworkService.common.getBasePath.get();
        httpRest('GET', path + themesUrl, function (jsonResult) {
            if (jsonResult && jsonResult !== "[]" && jsonResult !== null) {
                key = JSON.parse(jsonResult)[0].path;
                localStorage.setItem(themKey, key.themesColor);
                localStorage.setItem(themSKey, key.themesSize);
                localStorage.setItem(themesStyleKey, key.themesStyle);
                addThemes(key.themesColor, key.themesSize);
            } else
                getDefaultThemes();
        });
    }
} else {
    try {
        var path = topWin.gspframeworkService.common.getBasePath.get();
        httpRest('GET', path + themesUrl, function (jsonResult) {
            if (jsonResult && jsonResult !== "[]" && jsonResult !== null) {
                key = JSON.parse(jsonResult)[0].path;
                localStorage.setItem(themKey, key.themesColor);
                localStorage.setItem(themSKey, key.themesSize);
                localStorage.setItem(themesStyleKey, key.themesStyle);
                addThemes(key.themesColor, key.themesSize);
            } else
                getDefaultThemes();
        });
    } catch (ex) {
    }
}

if (topWin.gspframeworkService && topWin.gspframeworkService.common && topWin.gspframeworkService.common.frmConfig) {
    topWin.gspframeworkService.common.frmConfig.getBack(function (result) {
        var cssExtendJs = null;
        cssExtendJs = result.frmConfig.cssExtendJs;
        if (cssExtendJs !== null && cssExtendJs !== '' && cssExtendJs !== undefined) {
            var oHead = document.getElementsByTagName('head').item(0);
            var oScript = document.createElement("script");
            oScript.type = "text/javascript";
            oScript.src = cssExtendJs;
            oHead.appendChild(oScript);
        }
    })
}

function getDefaultThemes() {
    var path = topWin.gspframeworkService.common.getBasePath.get();
    httpRest('GET', path + defaultUrl + "1", function (json) {
        var result = JSON.parse(json);
        var defaultColor;
        var defaultSize;
        var defaultStyle;
        for (var i = 0; i < result.length; i++) {
            if (result[i].type === 'color') {
                defaultColor = result[i].code;
                defaultStyle = result[i].style;
                localStorage.setItem(themKey, defaultColor);
                localStorage.setItem(themesStyleKey, defaultStyle);
            } else if (result[i].type === 'size') {
                defaultSize = result[i].code;
                localStorage.setItem(themSKey, defaultSize);
            }
        }
        addThemes(defaultColor, defaultSize);
    })
}

function addThemes(key1, key2) {
    var path = topWin.gspframeworkService.common.getBasePath.get();
    var oHead = document.getElementsByTagName('head').item(0);
    var link2 = document.createElement('link');
    link2.rel = "stylesheet";
    link2.type = "text/css";
    link2.href = path + "/platform/common/web/assets/themes/" + key1 + "/" + key2 + "/farris-all.css?v=202404230101";
    oHead.appendChild(link2);

    var link = document.createElement('link');
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = path + "/platform/runtime/sys/web/assets/style/themes/" + key1 + "/gsp-cloud-web.css?v=202404230101";
    oHead.appendChild(link);
}

function httpRest(action, url, suc, fail) {
    var httpRequest = new XMLHttpRequest(); //第一步：建立所需的对象
    httpRequest.open(action, url, true); //第二步：打开连接  
    httpRequest.send(); //第三步：发送请求  将请求参数写在URL中

    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState == 4) {
            if (httpRequest.status == 200) {
                var json = httpRequest.responseText;
                if (suc) {
                    suc(json);
                }
            } else {
                if (fail) {
                    fail();
                }
            }
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

window.rtfThemesHasLoaded = true;