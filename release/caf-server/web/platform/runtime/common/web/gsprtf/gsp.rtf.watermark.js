(function ($, h, c) {
    var a = $([]),
        e = $.resize = $.extend($.resize, {}),
        i,
        k = "setTimeout",
        j = "resize",
        d = j + "-special-event",
        b = "delay",
        f = "throttleWindow";
    e[b] = 250;
    e[f] = true;
    $.event.special[j] = {
        setup: function () {
            if (!e[f] && this[k]) {
                return false;
            }
            var l = $(this);
            a = a.add(l);
            $.data(this, d, {
                w: l.width(),
                h: l.height()
            });
            if (a.length === 1) {
                g();
            }
        },
        teardown: function () {
            if (!e[f] && this[k]) {
                return false;
            }
            var l = $(this);
            a = a.not(l);
            l.removeData(d);
            if (!a.length) {
                clearTimeout(i);
            }
        },
        add: function (l) {
            if (!e[f] && this[k]) {
                return false;
            }
            var n;
            function m(s, o, p) {
                var q = $(this),
                    r = $.data(this, d);
                r.w = o !== c ? o : q.width();
                r.h = p !== c ? p : q.height();
                n.apply(this, arguments);
            }
            if ($.isFunction(l)) {
                n = l;
                return m;
            } else {
                n = l.handler;
                l.handler = m;
            }
        }
    };
    function g() {
        i = h[k](function () {
            a.each(function () {
                var n = $(this),
                    m = n.width(),
                    l = n.height(),
                    o = $.data(this, d);
                if (m !== o.w || l !== o.h) {
                    n.trigger(j, [o.w = m, o.h = l]);
                }
            });
            g();
        },
            e[b]);
    }
})(jQuery, this);

window.gspwatermarkService = window.gspwatermarkService || {};
gspwatermarkService.rtf = gspwatermarkService.rtf || {};
gspwatermarkService.rtf = (function (rtf, win) {
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
            var commonService = gspframeworkService.common;
            if (!!commonService) {
                isWaterMarkEnabled = commonService.frmConfig.waterMark();
                if (!!isWaterMarkEnabled) {
                    var users = null;
                    if (text) {
                        users = window.gspRtfWatermarkText || text;
                    } else {
                        users = window.gspRtfWatermarkText || commonService.userInfos.getKey("code");
                    }
                    isWaterMarkAvailable = true;
                    window.addEventListener('resize', () => {
                        $(".mask_div").remove();
                        var cout = Math.round(document.documentElement.clientHeight / 140);
                        waterMarkSetting({ watermark_txt: users, watermark_rows: cout });
                    });

                    var cout = Math.round(document.documentElement.clientHeight / 140);
                    waterMarkSetting({ watermark_txt: users, watermark_rows: cout });
                }
            }
        }

        watermark.remove = function () {
            isWaterMarkAvailable = false;
            $(".mask_div").remove();
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
                watermark_alpha: window.gspRtfWatermarkAlpha || 0.3,//水印透明度
                watermark_fontsize: window.gspRtfWatermarkSize || '22px',//水印字体大小
                watermark_font: window.gspRtfWatermarkFont || '微软雅黑',//水印字体
                watermark_width: window.gspRtfWatermarkWidth || 210,//水印宽度
                watermark_height: window.gspRtfWatermarkHeight || 80,//水印长度
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
                defaultSettings.watermark_cols = parseInt((page_width - defaultSettings.watermark_x + defaultSettings.watermark_x_space) / (defaultSettings.watermark_width + defaultSettings.watermark_x_space));
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
                    mask_div.appendChild(document.createTextNode(defaultSettings.watermark_txt));
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

    rtf.watermark.add();
    return rtf;
})(gspwatermarkService.rtf || {}, window);



