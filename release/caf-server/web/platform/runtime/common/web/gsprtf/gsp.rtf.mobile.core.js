/**
 * 框架移动框架公共服务，
 * 支持获取formToken、联查表单及传参、表单关闭及会话注销
 * 
 * @author huangwenchao
 * @date 2020/09/24
 */

window.frmMobileService = window.frmMobileService || {};
frmMobileService.rtf = frmMobileService.rtf || {};
var mobileCommonScript = document.currentScript.src;

frmMobileService.rtf = (function (rtf, win) {

    /**
     * 从当前window url hash中获取query参数
     * hash 在路由场景中是通用方式
     * url: xxx/index.html#/x/x?query
     * @param {query 参数名} paraName 
     */
    var hashQuery = function (paraName) {
        var url = win.location.hash;
        var arrObj = url && url.split('?');
        if (arrObj && arrObj.length > 1) {
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

    /**
     * 无路由信息时，url无hash值，直接取url中的query
     * url: xxx/index.html?query
     * @param {query 参数名} paraName 
     */
    var urlQuery = function (paraName) {
        var result = location.search.match(new RegExp("[\?\&]" + paraName + "=([^\&]+)", "i"));
        if (result == null || result.length < 1) {
            return "";
        }
        return result[1];
    }

    var objCopy = function (target) {
        var result;
        if (typeof target === 'object') {
            if (Array.isArray(target)) {
                result = [];
                for (var i in target) {
                    result.push(objCopy(target[i]))
                }
            } else if (target === null) {
                result = null;
            } else if (target.constructor === RegExp) {
                result = target;
            } else {
                result = {};
                for (var i in target) {
                    result[i] = objCopy(target[i]);
                }
            }
        } else {
            result = target;
        }
        return result;
    }

    /**
    * 水印
    */
    rtf.watermark = (function (watermark) {
        /**
         * 是否开启水印
         */
        var isWaterMarkEnabled = false;
        /**
         * 是否水印存在
         */
        var isWaterMarkAvailable = false;

        watermark.add = function (text) {
            if (!isWaterMarkEnabled) {
                return;
            }
            var cout = Math.round(document.documentElement.clientHeight / 115);
            waterMarkSetting({ watermark_txt: text, watermark_rows: cout });
        }

        watermark.remove = function () {
            isWaterMarkAvailable = false;
            //$(".mask_div").remove();
            //改为非jquery
            var removeObj = document.getElementsByClassName('mask_div');
            while (removeObj.length > 0) {
                removeObj[removeObj.length - 1].parentNode.removeChild(removeObj[removeObj.length - 1])
            }
        }

        watermark.enabledSetting = function (value) {
            isWaterMarkEnabled = value;
        }

        watermark.enabled = function () {
            return isWaterMarkEnabled;
        }

        watermark.available = function () {
            return isWaterMarkAvailable;
        }

        function waterMarkSetting(settings) {
            //默认设置
            var defaultSettings = {
                watermark_txt: "",
                watermark_x: 20,//水印起始位置x轴坐标
                watermark_y: 20,//水印起始位置Y轴坐标
                watermark_rows: 10,//水印行数
                watermark_cols: 10,//水印列数
                watermark_x_space: 100,//水印x轴间隔
                watermark_y_space: 50,//水印y轴间隔
                watermark_color: window.gspRtfWatermarkColor || '#aaa',//水印字体颜色
                watermark_alpha: window.gspRtfWatermarkAlpha || 0.1,//水印透明度
                watermark_fontsize: window.gspRtfWatermarkSize || '16px',//水印字体大小
                watermark_font: window.gspRtfWatermarkFont || '微软雅黑',//水印字体
                watermark_width: window.gspRtfWatermarkWidth || 160,//水印宽度
                watermark_height: window.gspRtfWatermarkHeight || 55,//水印长度
                watermark_angle: window.gspRtfWatermarkAngle || 15//水印倾斜度数
            };
            //采用配置项替换默认值，作用类似jquery.extend
            if (arguments.length === 1 && typeof arguments[0] === "object") {
                var src = arguments[0] || {};
                for (key in src) {
                    if (src[key] && defaultSettings[key] && src[key] === defaultSettings[key])
                        continue;
                    else if (src[key])
                        defaultSettings[key] = src[key];
                }
            }

            var oTemp = document.createDocumentFragment();

            //获取页面最大宽度
            var page_width = Math.max(document.body.scrollWidth, document.body.clientWidth);
            var cutWidth = page_width * 0.0150;
            var page_width = page_width - cutWidth;
            //获取页面最大高度
            var page_height = document.documentElement.clientHeight - 80;
            // var page_height = document.body.scrollHeight+document.body.scrollTop;
            //如果将水印列数设置为0，或水印列数设置过大，超过页面最大宽度，则重新计算水印列数和水印x轴间隔
            if (defaultSettings.watermark_cols == 0 || (parseInt(defaultSettings.watermark_x + defaultSettings.watermark_width * defaultSettings.watermark_cols + defaultSettings.watermark_x_space * (defaultSettings.watermark_cols - 1)) > page_width)) {
                defaultSettings.watermark_cols = Math.round(parseFloat((page_width - defaultSettings.watermark_x + defaultSettings.watermark_x_space) / (defaultSettings.watermark_width + defaultSettings.watermark_x_space)));
                defaultSettings.watermark_x_space = parseInt((page_width - defaultSettings.watermark_x - defaultSettings.watermark_width * defaultSettings.watermark_cols) / (defaultSettings.watermark_cols - 1));
            }
            //如果将水印行数设置为0，或水印行数设置过大，超过页面最大长度，则重新计算水印行数和水印y轴间隔
            if (defaultSettings.watermark_rows == 0 || (parseInt(defaultSettings.watermark_y + defaultSettings.watermark_height * defaultSettings.watermark_rows + defaultSettings.watermark_y_space * (defaultSettings.watermark_rows - 1)) > page_height)) {
                defaultSettings.watermark_rows = parseInt((defaultSettings.watermark_y_space + page_height - defaultSettings.watermark_y) / (defaultSettings.watermark_height + defaultSettings.watermark_y_space));
                defaultSettings.watermark_y_space = parseInt(((page_height - defaultSettings.watermark_y) - defaultSettings.watermark_height * defaultSettings.watermark_rows) / (defaultSettings.watermark_rows - 1));
            }
            var x;
            var y;
            for (var i = 0; i < defaultSettings.watermark_rows; i++) {
                y = defaultSettings.watermark_y + (defaultSettings.watermark_y_space + defaultSettings.watermark_height) * i;
                for (var j = 0; j < defaultSettings.watermark_cols; j++) {
                    x = defaultSettings.watermark_x + (defaultSettings.watermark_width + defaultSettings.watermark_x_space) * j;

                    var mask_div = document.createElement('div');
                    mask_div.id = 'mask_div' + i + j;
                    mask_div.className = 'mask_div';
                    mask_div.appendChild(document.createTextNode(settings.watermark_txt));
                    //设置水印div倾斜显示
                    mask_div.style.webkitTransform = "rotate(-" + defaultSettings.watermark_angle + "deg)";
                    mask_div.style.MozTransform = "rotate(-" + defaultSettings.watermark_angle + "deg)";
                    mask_div.style.msTransform = "rotate(-" + defaultSettings.watermark_angle + "deg)";
                    mask_div.style.OTransform = "rotate(-" + defaultSettings.watermark_angle + "deg)";
                    mask_div.style.transform = "rotate(-" + defaultSettings.watermark_angle + "deg)";
                    mask_div.style.visibility = "";
                    mask_div.style.position = "absolute";
                    mask_div.style.left = x + 'px';
                    mask_div.style.top = y + 'px';
                    mask_div.style.overflow = "hidden";
                    mask_div.style.zIndex = "9999";
                    mask_div.style.pointerEvents = 'none';//pointer-events:none  让水印不遮挡页面的点击事件
                    //mask_div.style.border="solid #eee 1px";
                    mask_div.style.opacity = defaultSettings.watermark_alpha;
                    mask_div.style.fontSize = defaultSettings.watermark_fontsize;
                    mask_div.style.fontFamily = defaultSettings.watermark_font;
                    mask_div.style.color = defaultSettings.watermark_color;
                    mask_div.style.textAlign = "center";
                    mask_div.style.width = defaultSettings.watermark_width + 'px';
                    mask_div.style.height = defaultSettings.watermark_height + 'px';
                    mask_div.style.display = "block";
                    oTemp.appendChild(mask_div);
                };
            };
            document.body.appendChild(oTemp);
        }
        return watermark;
    })(rtf.watermark || {});

    /**
     * rest 公共服务封装
     */
    rtf.rest = (function (rest) {

        var setHeaders = function (http, headers) {
            if (!headers) {
                return;
            }
            Object.entries(headers).forEach((entry) => {
                const name = entry[0];
                const value = entry[1];
                http.setRequestHeader(name, value);
            })
        }

        var request = function (method, url, headers, body) {
            const http = new XMLHttpRequest();
            const promise = new Promise((resolve, reject) => {
                http.onreadystatechange = () => {
                    if (http.readyState !== 4) {
                        return;
                    }
                    if (http.status >= 200 && http.status < 300) {
                        if (http.responseText === undefined) {
                            resolve(result);
                        } else {
                            let result = http.responseText;
                            if (result) {
                                result = JSON.parse(http.responseText);
                            }
                            resolve(result);
                        }
                    } else {
                        reject();
                    }
                }
            });
            var a = window.mobileCommonScript || document.currentScript.src;
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
            http.open(method, url, false);
            setHeaders(http, headers);
            body = body ? JSON.stringify(body) : null;
            http.send(body);

            return promise;
        }

        rest.get = function (url, headers) {
            return request('GET', url, headers, null);
        }

        rest.put = function (url, body, headers) {
            return request('PUT', url, headers, body);
        }

        rest.post = function (url, body, headers) {
            return request('POST', url, headers, body);
        }

        return rest;
    })(rtf.rest || {});

    rtf.commonVariable = (function (commonVariable) {

        commonVariable.queryParam = function (queryName) {
            return hashQuery(queryName) || urlQuery(queryName);
        }

        commonVariable.formToken = function () {
            return hashQuery('cvft') || urlQuery('cvft');
        }

        return commonVariable;
    })(rtf.commonVariable || {});

    rtf.func = (function (func) {

        func.openMenu = function (opts, callback) {
            if (!opts) {
                throw new Error('opts 参数为空');
            }
            var bodyPara = {
                funcId: opts.funcId,
                action: opts.action
            };

            var url = '/api/runtime/sys/v1.0/mobile-func-state/enterFunc';
            var header = { 'Content-Type': 'application/json' };
            rtf.rest.post(url, bodyPara, header).then(
                (res) => callback && callback(res)
            );
        }

        func.closeMenu = function (options) { }

        func.clearState = function (options, suc, err) {
            var formToken = options && options.formToken;
            if (!formToken) {
                return;
            }
            var url = '/api/runtime/sys/v1.0/mobile-func-state/clear';
            var header = { 'Content-Type': 'application/json', 'X-CAF-Runtime-CommonVariable': formToken };
            rtf.rest.post(url, null, header).then(
                (res) => suc && suc(res)
            ).catch(
                (e) => err && err(e)
            );
        }

        return func;
    })(rtf.func || {})

    rtf.frmComfig = (function (frmConfig) {

        var configInfo = {};

        frmConfig.set = function (value) {
            configInfo = value;
        }

        frmConfig.get = function () {
            return objCopy(configInfo);
        }

        frmConfig.load = function () {
            var configUrl = '/api/runtime/sys/v1.0/rtf-configuration';
            return rtf.rest.get(configUrl, null);
        }

        return frmConfig;

    })(rtf.frmComfig || {})

    rtf.userInfo = (function (userInfo) {
        var info = {};

        userInfo.set = function (value) {
            info = value;
        }

        userInfo.get = function () {
            return objCopy(info);
        }

        userInfo.load = function () {
            var url = '/api/runtime/sys/v1.0/userinfos?infoType=user';
            return rtf.frmComfig.load().then(
                config => {
                    var wartmarkEnable = config && config.frmConfig && config.frmConfig.waterMark;
                    var mobileWaterOff = config && config.frmConfig && config.frmConfig.mobileWaterMark;
                    if (wartmarkEnable && mobileWaterOff) {
                        wartmarkEnable = !wartmarkEnable;
                    }
                    rtf.watermark.enabledSetting(wartmarkEnable);
                    rtf.frmComfig.set(config);
                    return rtf.rest.get(url, null);
                }
            );
        }

        return userInfo;
    })(rtf.userInfo || {})

    rtf.userInfo && rtf.userInfo.load().then(
        info => {
            rtf.userInfo.set(info);
            rtf.watermark.add(info && info.name);
        }
    ).catch(
        e => console.log(e)
    );

    rtf.frmComfig && rtf.frmComfig.load().then(
        info => {
            rtf.frmComfig.set(info);
        }
    ).catch(
        e => console.log(e)
    );

    return rtf;
})(frmMobileService.rtf || {}, window);