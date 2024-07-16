/**
 * 框架服务适配层接口
 * 框架公共服务，在当前window上暴露js原生接口
 * 实现1 npm导入解耦；2 非ng技术栈场景
 * 
 * @author huangwenchao
 */

window.gspframeworkService = window.gspframeworkService || {};
gspframeworkService.rtf = gspframeworkService.rtf || {};

gspframeworkService.rtf = (function(rtf, win) {

    var gspCommon = gspframeworkService.common || {};
    var $rest = gspCommon.rest;

    /**
     * 不跨域的最顶层window
     */
    var topWin = window.self;
    try {
        while (topWin.location.origin === topWin.parent.location.origin) {
            if (topWin != topWin.parent) {
                topWin = topWin.parent;
            } else {
                break;
            }
        }
    } catch (e) {}

    /**
     * 框架的最顶层window
     */
    var rtfTopWin = window.self;
    try {
        while (rtfTopWin.location.origin === rtfTopWin.parent.location.origin) {
            if (rtfTopWin !== rtfTopWin.parent && !rtfTopWin.isRTFTopWin) {
                rtfTopWin = rtfTopWin.parent;
            } else {
                break;
            }
        }
    } catch (e) {}

    rtf.adapter = (function(adapter) {

        adapter.adatperSerice = function() {
            var frmWin = win;
            while (!frmWin.gspframeworkAdapterService && frmWin != topWin) {
                frmWin = frmWin.parent;
            }
            return frmWin.gspframeworkAdapterService || {};
        }

        return adapter;

    })(rtf.adapter || {});

    var _adapterSvc = rtf.adapter.adatperSerice();

    /**
     * 获取url hash上的query参数
     * @param {*} paraName 
     */
    var queryParam = function(paraName) {
        var url = window.location.hash;
        var arrObj = url && url.split('?');
        if (arrObj) {
            var arrPara;
            if (arrObj.length > 1) {
                arrPara = arrObj[1].split('&'); 
            } else if (arrObj.length === 1) {
                arrPara = arrObj[0].split('&')
            } else {
                arrPara = [];
            }

            for (var i = 0; i < arrPara.length; i++) {
                var arr = arrPara[i].split('=');
                if (arr != null && arr[0] === paraName) {
                    return arr[1];
                }
            }
            return '';
        } else {
            return getQueryStringByName(paraName);
        }
    }

    var getQueryStringByName = function(name) {
        try {
            var result = location.search.match(new RegExp("[\?\&]" + name + "=([^\&]+)", "i"));
            if (result == null || result.length < 1) {
                return "";
            }
            return result[1];
        } catch (e) {
            console.log(e);
            return '';
        }
    }

    var objCopy = function(target) {
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

    rtf.tabs = (function(tabs) {
        var tabsSvc = (_adapterSvc && _adapterSvc.tabArrSvc) || {};

        tabs.getActiveTab = function() {
            return tabsSvc.getActiveTab();
        }

        tabs.getAll = function() {
            return tabsSvc.getTabs();
        }
        return tabs;
    })(rtf.tabs || {})

    rtf.session = (function(session) {

        var _sessionSvc = (_adapterSvc && _adapterSvc.session) || {};

        /**
         * 适用于N版获取当前用户session
         */
        session.getUserSessionId = function() {
            return _sessionSvc.getUserSessionId();
        }

        /**
         * 适用于N版获取funcSession
         */
        session.getCurrentSeesionId = function() {
            var _funcSession = queryParam('cvft');
            return _funcSession || _sessionSvc.getUserSessionId();
        }

        session.getCurrentTenantId = function() {
            try {
                var tabId = queryParam('tabId');
                var allTabs = rtf.tabs.getAll();
                var curTab = allTabs && allTabs.find(function(t) {
                    if (t && t.id === tabId)
                        return t;
                });
                return curTab && curTab.tId;
            } catch (e) {
                return null;
            }
        }

        session.getFormToken = function() {
            return queryParam('cvft');
        }

        session.getCommonVariable = function() {
            var commonVariable = {
                tabId: queryParam('tabId'),
                appType: queryParam('appType'),
                formToken: queryParam('cvft'),
                appMode: queryParam('appMode')
            };
            if (queryParam('funcId')) {
                commonVariable.funcId = queryParam('funcId');
            }
            if (queryParam('appId')) {
                commonVariable.appId = queryParam('appId');
            }
            if (queryParam('appEntrance')) {
                commonVariable.appEntrance = queryParam('appEntrance');
            }
            commonVariable.token = commonVariable.formToken;
            if (!!session.getCurrentTenantId()) {
                commonVariable.tId = session.getCurrentTenantId();
            }
            return commonVariable;
        }

        return session;

    })(rtf.session || {});

    rtf.language = (function(language) {

        var languageService = function() {
            return (_adapterSvc && _adapterSvc.language) || {};
        }

        var _languageSvc = languageService();
        language.getLanguageCode = function() {
            if (!_languageSvc || typeof(_languageSvc.getLanguageCode) !== 'function') {
                var _languageCode = localStorage.getItem('languageCode')
                return _languageCode || 'zh-CHS';
            }
            return _languageSvc.getLanguageCode();
        }

        language.allLanguages = function(callback, errhandle) {
            if (!!$rest && typeof($rest.get) === 'function') {
                var basePath = window.gspframeworkService.common.getBasePath.get();
                var options = {
                    url: basePath + '/api/runtime/sys/v1.0/i18n/languageservice/getenabledlanguages',
                    async: false,
                    dataType: 'json'
                };
                $rest.get(options, function(res) {
                    callback && callback(res);
                }, function(err) {
                    console.log('获取语言列表失败');
                    errhandle && errhandle(err);
                });
            }
        }

        language.i18nSetting = function(callback, errhandle) {
            if (!!$rest && typeof($rest.get) === 'function') {
                var basePath = window.gspframeworkService.common.getBasePath.get();
                var options = {
                    url: basePath + '/api/runtime/sys/v1.0/i18n/i18nusersetting/setting',
                    async: false,
                    dataType: 'json'
                };
                $rest.get(options, function(res) {
                    callback && callback(res);
                }, function(err) {
                    console.log('获取多语配置失败');
                    errhandle && errhandle(err);
                });
            }
        }

        return language;

    })(rtf.language || {});

    rtf.http = (function(http) {

        var _httpSvc = (_adapterSvc && _adapterSvc.http) || {};

        http.request = function(method, url, options) {
            return _httpSvc.request(method, url, options);
        }

        http.request$ = function(method, url, options) {
            return _httpSvc.request$(method, url, options);
        }

        http.setHeader = function(headerOptions) {
            var options = {};
            options.headers = {
                'Content-Type': 'application/json'
            };
            if (headerOptions && headerOptions.bizContextId) {
                var bizContextKey = 'X-CAF-Runtime-Context';
                options.headers[bizContextKey] = headerOptions.bizContextId;
            }
            if (headerOptions && headerOptions.formToken) {
                var commonVariableKey = 'X-CAF-Runtime-CommonVariable';
                options.headers[commonVariableKey] = headerOptions.formToken;
            }
            if (headerOptions && headerOptions.body) {
                options.body = headerOptions.body;
            }

            return options;
        }

        return http;

    })(rtf.http || {});

    rtf.func = (function(func) {

        var frmSvc = function() {
            return (_adapterSvc && _adapterSvc.frmSvc) || {};
        }

        var _frmSvc = frmSvc();

        func.openMenu = function(options) {
            _frmSvc.openMenu(options);
        }

        func.openMenuByStream = function(options) {
            return _frmSvc.openMenu$(options);
        }

        func.openMenuChangeTenant = function(options) {
            if (!options) {
                throw new Error('联查参数为空');
            }
            var curOptions = rtf.session.getCommonVariable();
            _frmSvc.openMenuChangeTenant(curOptions, options);
        }

        func.close = function(options) {
            _frmSvc.closeMenu(options);
        }

        func.beforeClose = function(options) {
            _frmSvc.beforeCloseMenu(options);
        }

        func.getMenuParams = function(funcId, callback) {
            _frmSvc.getPresetParams(funcId).subscribe(function(res) {
                if (callback && typeof callback === 'function') {
                    callback(res);
                }
            });
        }

        func.getEntityParam = function(tabId, callback, isSubonce) {
            _frmSvc.getEntityParam(tabId, callback, isSubonce);
        }

        func.newPageId = function(options) {
            if (options && options.appType === 'app') {
                var mergeAppId = options.appId + '_' + options.appEntrance
                return !!options.tabId ? mergeAppId + '_' + options.tabId : mergeAppId;
            }
            if (options && options.appType === 'menu') {
                var mergeFuncId = options.funcId;
                return !!options.tabId ? mergeFuncId + '_' + options.tabId : mergeFuncId;
            }
        }

        return func;

    })(rtf.func || {});

    rtf.frmEvent = (function(frmEvent) {

        var _frmEventSvc = _adapterSvc && _adapterSvc.frmSvc;

        frmEvent.eventListener = function(token, callback, options) {
            _frmEventSvc && _frmEventSvc.eventListner(token, callback, options);
        }

        frmEvent.eventFire = function(token, value) {
            _frmEventSvc && _frmEventSvc.eventFire(token, value);
        }

        return frmEvent;

    })(rtf.frmEvent || {})

    rtf.broadcast = (function(broadcast) {
        var _broadcastSvc = _adapterSvc && _adapterSvc.broadcastingStation;

        broadcast.subjectRegister = function(subjectCode, options, customSub) {
            return _broadcastSvc && _broadcastSvc.subjectRegister(subjectCode, options, customSub);
        }

        broadcast.subjectRemove = function(subjectToken) {
            _broadcastSvc && _broadcastSvc.subjectRemove(subjectToken);
        }

        broadcast.notify = function(subjectToken, info) {
            _broadcastSvc && _broadcastSvc.notify(subjectToken, info);
        }

        broadcast.response = function(subjectToken, observerToken, callback) {
            _broadcastSvc && _broadcastSvc.response(subjectToken, observerToken, callback);
        }

        broadcast.responseUnSubscribe = function(subjectToken, observerToken) {
            _broadcastSvc && _broadcastSvc.responseUnSubscribe(subjectToken, observerToken);
        }

        return broadcast;

    })(rtf.broadcast || {})

    rtf.polling = (function(polling) {

        var _pollingSvc = _adapterSvc && _adapterSvc.pollingSvc;

        polling.requestPolling = function(method, url, options, span) {
            return _pollingSvc && _pollingSvc.requestPolling$(method, url, options, span);
        }
        return polling;

    })(rtf.polling || {})

    /**
     * 框架工具栏定义
     */
    rtf.toolbarEvent = (function(toolbarEvent) {

        var event = (_adapterSvc && _adapterSvc.tbSvc) || {};

        toolbarEvent.barMenuClickListenr = function(callback) {
            event && event.barMenuClickListenr(callback);
        }

        /**
         * 消息角标提示回调，参数toolbar id 和 消息数
         * @param { barId: string, msgCount: number } arg 
         */
        toolbarEvent.barMsgCallTrigger = function(arg) {
            event && event.barMsgCallTrigger(arg);
        }

        return toolbarEvent;
    })(rtf.toolbarEvent || {});

    /**
     * 框架扩展事件监听
     */
    rtf.extEvent = (function(extEvent) {

        var event = (_adapterSvc && _adapterSvc.extEvSvc) || {};

        extEvent.rtcDimCheckListener = function(callback) {
            event && event.rtcDimCheckListener(callback);
        }

        return extEvent;
    })(rtf.extEvent || {});

    rtf.caEvent = (function(caEvent) {

        var _broadcastSvc = _adapterSvc && _adapterSvc.broadcastingStation;

        caEvent.regEvent = function(options) {
            return _broadcastSvc && _broadcastSvc.customSubjectRegister(options);
        }

        caEvent.trigger = function(sub, info) {
            sub.post(info);
        }

        caEvent.on = function(sub, observerToken, callback) {
            sub.unSubscribeWithObkey(observerToken);
            sub.subscribeWithObkey(observerToken, callback);
        }

        caEvent.cancleEvent = function(eventToken) {
            _broadcastSvc && _broadcastSvc.subjectRemove(eventToken);
        }

        caEvent.removeObserver = function(eventToken, observerToken) {
            _broadcastSvc && _broadcastSvc.responseUnSubscribe(eventToken, observerToken);
        }

        caEvent.signedMsgOverToken = function() {
            return _signedMsgOverToken;
        }

        caEvent.getCertOverToken = function() {
            return _getCertOverToken;
        }

        caEvent.signOverToken = function() {
            return _signOverToken;
        }

        return caEvent;
    })(rtf.caEvent || {})

    rtf.cache = (function(cache) {
        var _cacheSvc = _adapterSvc && _adapterSvc.cache;

        cache.set = function(key, value) {
            return _cacheSvc && _cacheSvc.set(key, value);
        }

        cache.get = function(key) {
            return _cacheSvc && _cacheSvc.get(key);
        }

        cache.exists = function(key) {
            return _cacheSvc && _cacheSvc.exists(key);
        }

        cache.remove = function(key) {
            return _cacheSvc && _cacheSvc.remove(key);
        }
        return cache;
    })(rtf.cache || {})

    rtf.extendMethod = (function(extend) {

        /**
         * 获取框架的顶级window
         */
        extend.rtfFrmTopWindow = function() {
            return rtfTopWin;
        }

        extend.getExtObj = function() {
            if (!rtfTopWin || !rtfTopWin.gspfrm || !rtfTopWin.gspfrm.rtfExtend) {
                return null;
            }
            return rtfTopWin.gspfrm.rtfExtend.extendObj;
        }
        return extend;
    })(rtf.extendMethod || {})

    var _signedMsgOverToken = window.gspframeworkService.rtf.caEvent.regEvent({ customToken: "signedMsgOver" }) && window.gspframeworkService.rtf.caEvent.regEvent({ customToken: "signedMsgOver" }).get('signedMsgOver');
    var _getCertOverToken = window.gspframeworkService.rtf.caEvent.regEvent({ customToken: "getCertOver" }) && window.gspframeworkService.rtf.caEvent.regEvent({ customToken: "getCertOver" }).get('getCertOver');
    var _signOverToken = window.gspframeworkService.rtf.caEvent.regEvent({ customToken: "signOver" }) && window.gspframeworkService.rtf.caEvent.regEvent({ customToken: "signOver" }).get('signOver');
    return rtf;

})(gspframeworkService.rtf || {}, window);