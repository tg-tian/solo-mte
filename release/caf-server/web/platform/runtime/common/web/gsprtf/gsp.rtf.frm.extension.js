window.gspframeworkService = window.gspframeworkService || {};
gspframeworkService.frmExtend = gspframeworkService.frmExtend || {};

gspframeworkService.frmExtend = (function (frmExtend, win, $) {
    var topWin = win.self;
    try {
        while (topWin != topWin.top) {
            if (topWin.location.origin === topWin.parent.location.origin) {
                topWin = topWin.parent;
            }
        }
    }
    catch (e) { };

    frmExtend.rest = (function (rest) {

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
    })(frmExtend.rest || {});

    frmExtend.customTemplate = (function (customTemplate) {

        customTemplate.loadFunc = function (callback) {
            var options = {
                url: '/api/runtime/sys/v1.0/functions/funcGroups?funcType=4',
                async: false,
                dataType: 'json'
            };
            frmExtend.rest.get(options, function (res) {
                callback && callback(res);
            });
        }

        customTemplate.loadMyFunc = function (callback) {
            var options = {
                url: '/api/runtime/sys/v1.0/custom-functions/funcGroups?customer=frm-custom-func',
                async: false,
                dataType: 'json'
            };
            frmExtend.rest.get(options, function (res) {
                callback && callback(res);
            });
        }

        customTemplate.getUserInfo = function (callback) {
            var options = {
                url: '/api/runtime/sys/v1.0/userinfos?infoType=user',
                async: false,
                dataType: 'json'
            };
            var setOps = {
                url: '/api/runtime/sys/v1.0/userinfos/setting',
                async: false,
                dataType: 'json'
            };
            frmExtend.rest.get(options, function (res1) {
                frmExtend.rest.get(setOps, function (res2) {
                    if (res1) {
                        res1.userSetting = res2;
                    }
                    callback && callback(res1);
                });
            });
        }

        customTemplate.header = function () {
            if (window.getCustomHeaderTemp && typeof (window.getCustomHeaderTemp) === 'function') {
                return window.getCustomHeaderTemp();
            }
        }
        customTemplate.leftWorkArea = function () {
            if (window.getCustomLeftAreaTemp && typeof (window.getCustomLeftAreaTemp) === 'function') {
                return window.getCustomLeftAreaTemp();
            }
        }
        customTemplate.rightWorkArea = function () {
            if (window.getCustomRightAreaTemp && typeof (window.getCustomRightAreaTemp) === 'function') {
                return window.getCustomRightAreaTemp();
            }
        }

        customTemplate.treeNavArea = function () {
            if (window.getCustomTreeNavAreaTemp && typeof (window.getCustomTreeNavAreaTemp) === 'function') {
                return window.getCustomTreeNavAreaTemp();
            }
        }

        customTemplate.afterInitTrigger = function () {
            $(document).trigger('custom-temp-initOn', true);
        }

        customTemplate.afterInitOn = function (callback) {
            $(document).on('custom-temp-initOn', callback);
        }

        return customTemplate;
    })(frmExtend.customTemplate || {});

    return frmExtend;

})(gspframeworkService.frmExtend, window, jQuery);

window.funcUiInit && window.funcUiInit();