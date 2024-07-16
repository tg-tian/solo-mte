//调用CA脚本
var gspCA = (function () {
    return {
        curCert: null,
        needSignMsg: null,
        // 设置需要签名的信息
        setSignMsg: function (msg) {
            gspCA.needSignMsg = msg;
        },
        // 获取需要签名的信息
        getSignMsg: function () {
            return gspCA.needSignMsg;
        },
        // 设置当前用户证书
        setCurCert: function (cert) {
            gspCA.curCert = cert;
        },
        // 获取当前用户证书
        getCurCert: function () {
            return gspCA.curCert;
        },
        // 使用当前用户绑定签名证书进行签名
        getSignedMsg: function (msg) {
            gspCA.setSignMsg(msg);
            gspCA.getCertList('', 1);
        },
        certBak: function () {
            return certBak();
        },
        //==========证书扩展需要实现的方法==========
        // 获取证书列表
        getCertList: function (arrayIssuerDN, dateFlag) {
            if (typeof getCertList != 'undefined' && getCertList instanceof Function) {
                return getCertList(arrayIssuerDN, dateFlag);
            } else {
                checkScript();
                checkState(function call() {
                    getCertList(arrayIssuerDN, dateFlag);
                });
            }
        },
        // 签名
        signMessage: function (cert, random, opt) {
            if (typeof signMessage != 'undefined' && signMessage instanceof Function) {
                return signMessage(cert, random, opt);
            } else {
                return top.signMessage(cert, random, opt);
            }
        },
        // 获取证书密钥
        getCertBase64: function (cert) {
            if (typeof getCertBase64 != 'undefined' && getCertBase64 instanceof Function) {
                return getCertBase64(cert);
            } else {
                return top.getCertBase64(cert);
            }
        },
        // 获取证书序列号
        getCertKey: function (cert) {
            if (typeof getCertKey != 'undefined' && getCertKey instanceof Function) {
                return getCertKey(cert);
            } else {
                return top.getCertKey(cert);
            }
        },
        //启动证书服务
        startService: function () {
            if (typeof startService != 'undefined' && startService instanceof Function) {
                return startService();
            } else {
                return top.startService();
            }
        }
        //==========证书扩展需要实现的方法=========
    }
})(gspCA || {})


//获取证书、签名
if (window.gspframeworkService && window.gspframeworkService.rtf) {
    window.gspframeworkService.rtf.caEvent.on(window.gspframeworkService.rtf.caEvent.getCertOverToken(),
        'getCertOver',
        function getCertOver(certlist) {
            if (gspCA.getSignMsg() == null) {
                //不签名，只获取当前证书
                certCommon(certlist);
            } else {
                //获取当前证书，签名数据
                signCommon(certlist);
            }
        });


    //获取签名数据
    window.gspframeworkService.rtf.caEvent.on(window.gspframeworkService.rtf.caEvent.signOverToken(),
        'signOver',
        function signOver(signedData) {
            if (gspCA.getSignMsg() == null)
                return;
            else {
                gspCA.needSignMsg = null;
                // 捕捉signedMsgOver事件，获取当前用户绑定证书
                if (window.gspframeworkService && window.gspframeworkService.rtf)
                    window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signedMsgOverToken(), signedData);
                else
                    $(document).trigger("signedMsgOver", signedData);
            }
        });
}

var gsp_cert_error_nocert = {
    "zh-CHS": "未获取到数字证书，请确认证书是否已插入",
    "en": "Unable to obtain digital certificate. Please confirm if the certificate has been inserted",
    "zh-CHT": "未獲取到數位憑證，請確認證書是否已插入"
};
var gsp_cert_error_nomap = {
    "zh-CHS": "签名发生错误，请确认当前用户是否已绑定签名证书",
    "en": "Signature error occurred. Please confirm if the current user has bound a signing certificate",
    "zh-CHT": "簽名發生錯誤，請確認當前用戶是否已綁定簽名證書"
};
var gsp_cert_error_errormap = {
    "zh-CHS": "无法匹配用户证书，请确认证书是否正确",
    "en": "Unable to match user certificate, please confirm if the certificate is correct",
    "zh-CHT": "無法匹配用戶證書，請確認證書是否正確"
};
var gsp_cert_error_wrong = {
    "zh-CHS": "签名发生错误，请联系系统管理员",
    "en": "Signature error, please contact the system administrator",
    "zh-CHT": "簽名發生錯誤，請聯系系統管理員"
};
var commonService = top.gspframeworkService.common;
var defaultCAList = ["apisocket.js", "itrus.api.js"];
var uri = "./api/runtime/sys/v1.0/rtf-configuration/loginresource/-1/zh-CHS";

function signCommon(certlist) {
    var lan = localStorage.getItem("languageCode") || "zh-CHS";
    var stringResult;
    if (certlist.length <= 0) {
        stringResult = gsp_cert_error_nocert[lan];
        signOverTokenResult("false", stringResult);
    } else {
        var sessionId = window.gspframeworkService.rtf.session.getUserSessionId();
        var result = null;
        let path = "";
        if (!!commonService && !!commonService.getBasePath && commonService.getBasePath.get() != undefined) {
            path = commonService.getBasePath.get();
        }
        $.ajax({
            headers: {
                "sessionId": sessionId
            },
            url: path + "/api/runtime/sys/v1.0/map/Sign",
            async: false,
            type: "get",
            contentType: 'application/json',
            dataType: 'text',
            data: null,
            success: function (data) {
                if (data == "") {
                    stringResult = gsp_cert_error_nomap[lan];
                    signOverTokenResult("false", stringResult);
                    return;
                } else {
                    for (var i = 0; i < certlist.length; i++) {
                        if (gspCA.getCertKey(certlist[i]) == data) {
                            result = certlist[i];
                        }
                    }
                }
                if (result !== null) {
                    gspCA.setCurCert(result);
                    gspCA.signMessage(result, gspCA.needSignMsg, '');
                } else {
                    stringResult = gsp_cert_error_errormap[lan];
                    signOverTokenResult("false", stringResult);
                }
            },
            error: function (_info) {
                stringResult = gsp_cert_error_wrong[lan];
                signOverTokenResult("false", stringResult);
            }
        });
    }
}

function certCommon(certlist) {
    var lan = localStorage.getItem("languageCode") || "zh-CHS";
    var stringResult;
    if (certlist.length <= 0) {
        stringResult = gsp_cert_error_nocert[lan];
        getCurCertOverTokenResult("false", stringResult);
    } else {
        var sessionId = window.gspframeworkService.rtf.session.getUserSessionId();
        var result = null;
        let path = "";
        if (!!commonService && !!commonService.getBasePath && commonService.getBasePath.get() != undefined) {
            path = commonService.getBasePath.get();
        }
        $.ajax({
            headers: {
                "sessionId": sessionId
            },
            url: path + "/api/runtime/sys/v1.0/map/Sign",
            async: false,
            type: "get",
            contentType: 'application/json',
            dataType: 'text',
            data: null,
            success: function (data) {
                if (data == "") {
                    stringResult = gsp_cert_error_nomap[lan];
                    getCurCertOverTokenResult("false", stringResult);
                    return;
                } else {
                    for (var i = 0; i < certlist.length; i++) {
                        if (gspCA.getCertKey(certlist[i]) == data) {
                            result = certlist[i];
                        }
                    }
                }
                if (result !== null) {
                    gspCA.setCurCert(result);
                    stringResult = result;
                    getCurCertOverTokenResult("true", stringResult);
                } else {
                    stringResult = gsp_cert_error_errormap[lan];
                    getCurCertOverTokenResult("false", stringResult);
                }
            },
            error: function (_info) {
                stringResult = gsp_cert_error_wrong[lan];
                getCurCertOverTokenResult("false", stringResult);
            }
        });
    }
}

function getCurCertOverTokenResult(boolResult, result) {
    var signResult = new Array();
    signResult[0] = boolResult;
    signResult[1] = result;
    if (window.gspframeworkService && window.gspframeworkService.rtf)
        window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.getCurCertOverToken(), signResult);
    else
        $(document).trigger("getCurCertOver", [signResult]);
}

function signOverTokenResult(boolResult, result) {
    var signResult = new Array();
    signResult[0] = boolResult;
    signResult[1] = result;
    if (window.gspframeworkService && window.gspframeworkService.rtf)
        window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signOverToken(), signResult);
    else
        $(document).trigger("signOver", [signResult]);
}

function certBak() {
    if (window.gspframeworkService && window.gspframeworkService.rtf) {
        if (window.gspframeworkService.rtf.caEvent.getCertOverToken().eventSubject.observers.length == 0) {
            window.gspframeworkService.rtf.caEvent.on(window.gspframeworkService.rtf.caEvent.getCertOverToken(),
                'getCertOver',
                function getCertOver(certlist) {
                    if (gspCA.getSignMsg() == null) {
                        //不签名，只获取当前证书
                        certCommon(certlist);
                    } else {
                        //获取当前证书，签名数据
                        signCommon(certlist);
                    }
                });
        }

        if (window.gspframeworkService.rtf.caEvent.signOverToken().eventSubject.observers.length == 0) {
            window.gspframeworkService.rtf.caEvent.on(window.gspframeworkService.rtf.caEvent.signOverToken(),
                'signOver',
                function signOver(signedData) {
                    if (gspCA.getSignMsg() == null)
                        return;
                    else {
                        gspCA.needSignMsg = null;
                        // 捕捉signedMsgOver事件，获取当前用户绑定证书
                        if (window.gspframeworkService && window.gspframeworkService.rtf)
                            window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signedMsgOverToken(), signedData);
                        else
                            $(document).trigger("signedMsgOver", signedData);
                    }
                });
        }
    }
}

function checkScript() {
    var caList = null;
    if (!!commonService && commonService.frmConfig.get() != undefined && commonService.frmConfig.get().frmConfig != undefined) {
        caList = commonService.frmConfig.get().frmConfig.CAPath;
    }

    if (caList != null && caList != undefined) {
        defaultCAList = caList.split("&");
    } else {
        if (!!commonService) {
            var options = {
                url: uri,
                async: false,
                dataType: 'json'
            };
            commonService.rest.get(options, function (data) {
                if (data != undefined && data.CAPath != undefined) {
                    defaultCAList = data.CAPath.split("&");
                }
            });
        }
    }
}

async function checkState(suc) {
    let path = "";
    if (!!commonService && !!commonService.getBasePath && commonService.getBasePath.get() != undefined) {
        path = commonService.getBasePath.get();
    }
    var src = path + "/platform/runtime/sys/web/login_module/script/" + defaultCAList[0];
    await $.getScript(src, function call() {
        defaultCAList.splice(0, 1);
        if (defaultCAList.length == 0)
            suc();
        else
            checkState(suc);
    });
}

// //调用签名demo
// var msg1 = ["签名数据1", "签名数据2"];
// var msg2 = ["签名数据3"];
// //批量签名
// //gspCA.getSignedMsg(msg1);

// //单条签名
// gspCA.getSignedMsg(msg2);

// if (window.gspframeworkService && window.gspframeworkService.rtf) {
//     window.gspframeworkService.rtf.caEvent.on(window.gspframeworkService.rtf.caEvent.signedMsgOverToken(),
//         'signedMsgOver', function signMsgOver(signedData) {
//             if (signedData && signedData[0] == "true" && signedData.length > 0) {
//                 //签名后数据
//                 var signedMsg = signedData[1][0];
//                 //证书对象
//                 var cert = gspCA.getCurCert();
//                 //证书密钥
//                 var certKey = gspCA.getCertBase64(cert);
//                 //发送服务器端验签，三个参数都要传到服务器
//                 // doMethod (signedMsg, cert, certKey);
//             }
//         });
// }


//不签名，获取当前用户绑定证书
// gspCA.getCertList('', 1);
// if (window.gspframeworkService && window.gspframeworkService.rtf) {
//     window.gspframeworkService.rtf.caEvent.on(window.gspframeworkService.rtf.caEvent.getCurCertOverToken(),
//         'getCurCertOver', function signMsgOver(signedData) {
//             if (signedData && signedData[0] == "true") {
//                 //证书对象
//                 var cert = gspCA.getCurCert();
//                 //证书密钥
//                 var certKey = gspCA.getCertBase64(cert);
//             }
//         });
// }