window.gspframeworkService = window.gspframeworkService || {};
gspframeworkService.common = gspframeworkService.common || {};
var thisTopWin = window.self;
var rtfCommonScript = document.currentScript.src;
var userDefaultImg = "/platform/runtime/sys/web/assets/img/avatar-default.png";

gspframeworkService.common = (function (common, win, $) {
    common.base64 = (function (base64) {
        var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        base64.encode = function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = base64._utf8_encode(input);
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output +
                    _keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
                    _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
            }
            return output;
        }

        // public method for decoding  
        base64.decode = function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = _keyStr.indexOf(input.charAt(i++));
                enc2 = _keyStr.indexOf(input.charAt(i++));
                enc3 = _keyStr.indexOf(input.charAt(i++));
                enc4 = _keyStr.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            output = base64._utf8_decode(output);
            return output;
        }

        base64._utf8_encode = function (string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }
            return utftext;
        }

        // private method for UTF-8 decoding  
        base64._utf8_decode = function (utftext) {
            var string = "";
            var i = 0;
            var c = c1 = c2 = 0;
            while (i < utftext.length) {
                c = utftext.charCodeAt(i);
                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i + 1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                } else {
                    c2 = utftext.charCodeAt(i + 1);
                    c3 = utftext.charCodeAt(i + 2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }
            }
            return string;
        }

        return base64;

    })(common.base64 || {});


    common.rest = (function (rest) {

        rest.get = function (p, s, e) {
            ajaxRest('get', p, s, e);
        }

        rest.put = function (p, s, e) {
            ajaxRest('put', p, s, e);
        }

        rest.post = function (p, s, e) {
            ajaxRest('post', p, s, e);
        }

        function ajaxRest(method, options, suc, err) {
            $.ajax({
                url: options.url,
                async: options.async,
                type: method,
                contentType: 'application/json',
                dataType: options.dataType,
                data: options.param,
                success: function (data) {
                    suc && suc(data);
                },
                error: function (errInfo) {
                    if (err) {
                        err(errInfo);
                    }
                }
            });
        }

        return rest;
    })(common.rest || {});

    common.frmConfig = (function (frmConfig) {
        var configValue = null;
        var options = {
            url: getUrl("/api/runtime/sys/v1.0/rtf-configuration"),
            async: false,
            dataType: 'json'
        };
        frmConfig.load = function () {
            if (!thisTopWin.currentRTFfrmConfig) {
                common.rest.get(options, function (res) {
                    configValue = res;
                    thisTopWin.currentRTFfrmConfig = configValue;
                }, function (res) {
                    if (res.status != '401' && res.status != '403') {
                        var msg = (res && res.responseJSON && res.responseJSON.Message) || "Warning: Get configuration error";
                        alert(msg);
                    } else {
                        configValue = res;
                        thisTopWin.currentRTFfrmConfig = configValue;
                    }
                });
            }
        }

        frmConfig.get = function () {
            if (thisTopWin.currentRTFfrmConfig) {
                return thisTopWin.currentRTFfrmConfig;
            } else if (configValue) {
                return configValue;
            } else {
                common.rest.get(options, function (res) {
                    configValue = res;
                    thisTopWin.currentRTFfrmConfig = configValue;
                    return configValue;
                }, function (res) {
                    configValue = res;
                    thisTopWin.currentRTFfrmConfig = configValue;
                    return configValue;
                });
            }
        }

        frmConfig.getBack = function (back) {
            if (thisTopWin.currentRTFfrmConfig) {
                if (back)
                    back(thisTopWin.currentRTFfrmConfig);
            } else if (configValue) {
                if (back)
                    back(configValue);
            } else {
                common.rest.get(options, function (res) {
                    configValue = res;
                    thisTopWin.currentRTFfrmConfig = configValue;
                    if (back)
                        back(configValue);
                }, function (res) {
                    configValue = res;
                    thisTopWin.currentRTFfrmConfig = configValue;
                    if (back)
                        back(configValue);
                });
            }
        }

        frmConfig.waterMark = function () {
            var waterMarkShow = false;
            if (!!configValue && configValue.frmConfig)
                waterMarkShow = !!configValue.frmConfig.waterMark ? configValue.frmConfig.waterMark : false;
            return waterMarkShow;
        }
        return frmConfig;
    })(common.frmConfig || {});


    common.userInfos = (function (userInfos) {
        var users = null;
        var themes = null;
        var userInfoUrl = getUrl("/api/runtime/sys/v1.0/userinfos/data");
        var options = {
            "url": userInfoUrl,
            "async": true,
            "dataType": "json",
            "param": null
        }

        userInfos.load = function () {
            if (!thisTopWin.currentRTFUserinfos || !thisTopWin.currentRTFThemes || !users || !themes) {
                common.rest.get(options, function (res) {
                    users = res.userInfo;
                    themes = res.themeInfo;
                    if (users.userSetting.imgblob.endsWith(userDefaultImg)) {
                        users.userSetting.imgblob = createCanvas(users.name, themes[0].path.themesColor);
                    }
                    thisTopWin.currentRTFUserinfos = users;
                    thisTopWin.currentRTFThemes = themes;
                }, function (res) {
                    if (res.status != '401' && res.status != '403') {
                        var msg = (res && res.responseJSON && res.responseJSON.Message) || "Warning: Get information error";
                        alert(msg);
                    } else {
                        thisTopWin.currentRTFUserinfos = res;
                        thisTopWin.currentRTFThemes = res;
                    }
                });
            }
        }

        userInfos.loadOnce = function () {
            common.rest.get(options, function (res) {
                users = res.userInfo;
                themes = res.themeInfo;
                if (users.userSetting.imgblob.endsWith(userDefaultImg)) {
                    users.userSetting.imgblob = createCanvas(users.name, themes[0].path.themesColor);
                }
                thisTopWin.currentRTFUserinfos = users;
                thisTopWin.currentRTFThemes = themes;
            });
        }

        userInfos.get = function () {
            if (thisTopWin.currentRTFUserinfos) {
                return thisTopWin.currentRTFUserinfos;
            } else if (users) {
                return users;
            } else {
                common.rest.get(options, function (res) {
                    users = res.userInfo;
                    themes = res.themeInfo;
                    if (users.userSetting.imgblob.endsWith(userDefaultImg)) {
                        users.userSetting.imgblob = createCanvas(users.name, themes[0].path.themesColor);
                    }
                    thisTopWin.currentRTFUserinfos = users;
                    thisTopWin.currentRTFThemes = themes;
                    return users;
                }, function (res) {
                    thisTopWin.currentRTFUserinfos = res;
                    thisTopWin.currentRTFThemes = res;
                    return res;
                });
            }
        }

        userInfos.getBack = function (back) {
            if (thisTopWin.currentRTFUserinfos) {
                if (back)
                    back(thisTopWin.currentRTFUserinfos);
            } else if (users) {
                if (back)
                    back(users);
            } else {
                common.rest.get(options, function (res) {
                    users = res.userInfo;
                    themes = res.themeInfo;
                    if (users.userSetting.imgblob.endsWith(userDefaultImg)) {
                        users.userSetting.imgblob = createCanvas(users.name, themes[0].path.themesColor);
                    }
                    thisTopWin.currentRTFUserinfos = users;
                    thisTopWin.currentRTFThemes = themes;
                    if (back)
                        back(users);
                }, function (res) {
                    thisTopWin.currentRTFUserinfos = res;
                    thisTopWin.currentRTFThemes = res;
                    if (back)
                        back(users);
                });
            }
        }

        userInfos.getTheme = function () {
            if (thisTopWin.currentRTFThemes) {
                return thisTopWin.currentRTFThemes;
            } else if (themes) {
                return themes;
            } else {
                common.rest.get(options, function (res) {
                    users = res.userInfo;
                    themes = res.themeInfo;
                    if (users.userSetting.imgblob.endsWith(userDefaultImg)) {
                        users.userSetting.imgblob = createCanvas(users.name, themes[0].path.themesColor);
                    }
                    thisTopWin.currentRTFUserinfos = users;
                    thisTopWin.currentRTFThemes = themes;
                    return themes;
                });
            }
        }

        userInfos.getThemeBack = function (back) {
            if (thisTopWin.currentRTFThemes) {
                if (back)
                    back(thisTopWin.currentRTFThemes);
            } else if (themes) {
                if (back)
                    back(themes);
            } else {
                common.rest.get(options, function (res) {
                    users = res.userInfo;
                    themes = res.themeInfo;
                    if (users.userSetting.imgblob.endsWith(userDefaultImg)) {
                        users.userSetting.imgblob = createCanvas(users.name, themes[0].path.themesColor);
                    }
                    thisTopWin.currentRTFUserinfos = users;
                    thisTopWin.currentRTFThemes = themes;
                    if (back)
                        back(themes);
                });
            }
        }

        userInfos.getKey = function (key) {
            if (users.hasOwnProperty(key))
                return users[key];
            else
                return "";
        }
        return userInfos;
    })(common.userInfos || {});

    common.userHeaderImg = (function (userHeaderImg) {
        var userHeaderImgUrl = getUrl("/api/runtime/sys/v1.0/userinfos/setting/thumbnail");
        userHeaderImg.getThumbnail = function (userId, sucMethod) {
            var json = {
                "userId": userId
            }
            var options = {
                "url": userHeaderImgUrl,
                "async": true,
                "dataType": null,
                "param": JSON.stringify(json)
            }

            common.rest.post(options, function (res) {
                for (var i = 0; i < userId.length; i++) {
                    if (res[userId[i]].userHeaderImg.endsWith(userDefaultImg)) {
                        res[userId[i]].userHeaderImg = createCanvas(res[userId[i]].name, localStorage.getItem("gsp_rtf_themesKey"));
                    }
                }
                if (sucMethod) {
                    sucMethod(res);
                }
            });
        }
        return userHeaderImg;
    })(common.userHeaderImg || {});

    common.getBasePath = (function (getBasePath) {
        getBasePath.get = function () {
            if (common.frmConfig.get() && common.frmConfig.get().frmConfig && common.frmConfig.get().frmConfig.BasePath !== undefined) {
                return common.frmConfig.get().frmConfig.BasePath;
            }
        }

        getBasePath.rest = function (suc) {
            if (suc && common.frmConfig.get() && common.frmConfig.get().frmConfig && common.frmConfig.get().frmConfig.BasePath !== undefined) {
                suc(common.frmConfig.get().frmConfig.BasePath);
            }
        }
        return getBasePath;
    })(common.getBasePath || {});

    getTopWin();
    if (!thisTopWin.isRTFLogin) {
        common.frmConfig.load();
        common.userInfos.load();
    }
    return common;
})(gspframeworkService.common || {}, window, jQuery);

function createCanvas(item, backColor) {
    if (item) {
        const pattern = /[`~!@#$^&*()=|{}':;',\\\[\]\.<>\/?~！@#￥……&*（）——|{}【】'；：""'。，、？\s]/g;
        item = item.replace(pattern, "");
        if (item) {
            item = item.substring(0, 1);
        }
    } else {
        var basePath = window.gspframeworkService.common.getBasePath.get();
        return basePath + userDefaultImg;
    }

    switch (backColor) {
        case "default":
        case "mimicry-default": backColor = "#4E9BFE"; break;
        case "red":
        case "mimicry-red": backColor = "#C6330C"; break;
        case "green":
        case "mimicry-green": backColor = "#119898"; break;
        default: backColor = window.gspframeworkService.common.userInfos.getTheme()[0].path.colorSetting; break;
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

function getTopWin() {
    while (thisTopWin.location.origin === thisTopWin.parent.location.origin) {
        if (thisTopWin !== thisTopWin.parent && !thisTopWin.isRTFTopWin) {
            thisTopWin = thisTopWin.parent;
        } else {
            break;
        }
    }
    return thisTopWin;
}

function getUrl(url) {
    var a = window.rtfCommonScript || document.currentScript.src;
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
