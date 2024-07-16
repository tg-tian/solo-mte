window.gspframeworkService = window.gspframeworkService || {};
gspframeworkService.common = gspframeworkService.common || {};
var userDefaultImg = getUrl("/platform/runtime/sys/web/assets/img/avatar-default.png");
var contentPath = "";
var serviceCommonScript = document.currentScript ? document.currentScript.src : "";

gspframeworkService.common = (function (common, win) {
    common.userHeaderImgOri = (function (userHeaderImgOri) {
        var userHeaderImgOriUrl = getUrl("/api/runtime/sys/v1.0/userinfos/setting/thumbnail");
        userHeaderImgOri.getThumbnail = function (userId, sucMethod) {
            var json = {
                "userId": userId
            }
            const httppost = new XMLHttpRequest();
            const url = userHeaderImgOriUrl;
            httppost.open("POST", url, true);
            httppost.setRequestHeader("Content-Type", "application/json");  //设置请求头信息
            httppost.onreadystatechange = function () {  //绑定响应状态事件监听函数
                if (httppost.readyState == 4) {  //监听readyState状态
                    if (httppost.status == 200 || httppost.status == 0) {  //监听HTTP状态码
                        var res = httppost.responseText;
                        res = JSON.parse(res);
                        for (var i = 0; i < userId.length; i++) {
                            if (res[userId[i]].userHeaderImg == userDefaultImg) {
                                res[userId[i]].userHeaderImg = createCanvas(res[userId[i]].name, localStorage.getItem("gsp_rtf_themesKey"));
                            }
                        }
                        if (sucMethod) {
                            sucMethod(res);
                        }
                    }
                }
            }
            httppost.send(JSON.stringify(json));
        }
        return userHeaderImgOri;
    })(common.userHeaderImgOri || {});

    common.basePathOri = (function (basePathOri) {
        var getBasePathOriUrl = getUrl("/api/runtime/sys/v1.0/rtf-configuration");
        basePathOri.loadBasePathOri = function () {
            const httppost = new XMLHttpRequest();
            const url = getBasePathOriUrl;
            httppost.open("GET", url, false);
            httppost.setRequestHeader("Content-Type", "application/json");  //设置请求头信息
            httppost.onreadystatechange = function () {  //绑定响应状态事件监听函数
                if (httppost.readyState == 4) {  //监听readyState状态
                    if (httppost.status == 200 || httppost.status == 0) {  //监听HTTP状态码
                        var res = httppost.responseText;
                        res = JSON.parse(res);
                        contentPath = res.frmConfig.BasePath;
                    }
                }
            }
            httppost.send();
        }

        basePathOri.getBasePathOri = function () {
            return contentPath;
        }
        return basePathOri;
    })(common.basePathOri || {});
    common.basePathOri.loadBasePathOri();

    return common;
})(gspframeworkService.common || {}, window);

function createCanvas(item, backColor) {
    if (item) {
        const pattern = /[`~!@#$^&*()=|{}':;',\\\[\]\.<>\/?~！@#￥……&*（）——|{}【】'；：""'。，、？\s]/g;
        item = item.replace(pattern, "");
        if (item) {
            item = item.substring(0, 1);
        }
    } else {
        return userDefaultImg;
    }

    switch (backColor) {
        case "default":
        case "mimicry-default": backColor = "#4E9BFE"; break;
        case "red":
        case "mimicry-red": backColor = "#C6330C"; break;
        case "green":
        case "mimicry-green": backColor = "#119898"; break;
        default: backColor = "#4E9BFE"; break;
    }
    var cvs = document.createElement("canvas");
    cvs.setAttribute("height", 100);
    cvs.setAttribute("width", 100);
    let ctx = cvs.getContext("2d");
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, 2 * Math.PI, false);
    ctx.fillStyle = backColor;
    ctx.fill();
    ctx.font = "50px Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(item, 50, 51);
    ctx.strokeStyle = backColor;
    ctx.stroke();
    return cvs.toDataURL();
}

function getUrl(url) {
    var basePath = window.gspframeworkService;
    if (!!basePath && !!basePath.common && !!basePath.common.getBasePath) {
        return basePath.common.getBasePath.get() + url;
    }
    var a = window.serviceCommonScript || document.currentScript.src;
    var b = a.indexOf('/');
    var c = a.indexOf('/', b + 1);
    var d = a.indexOf('/', c + 1);
    var e = a.indexOf('/platform', d + 1);
    if (e == -1) {
        url = url;
    } else {
        var f = a.slice(d, e);
        url = f == '/' ? url : f + url;
    }
    return url;
}
