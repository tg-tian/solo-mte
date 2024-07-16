var authenContexts = new Array(3);
var authenContextsIndex = -1;
var loadtime;
var authenform = (function () {
    return {
        //UI隐藏
        hidden: function (obj) {
            var array = obj.split(/[&|]/);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'UserPassword') {
                  window.gspformService.rtf.userPasswordAuthenform.hidden(array[i]);
                } else if (array[i] === 'Windows') {
                    WindowsHidden();
                } else if (array[i] === 'Certificate') {
                    CertificateHidden();
                } else if (array[i] === 'SMS') {
                   window.gspformService.rtf.smsAuthenform.hidden(array[i]);
                } else if (array[i] === 'No_Phone_SMS') {
                  window.gspformService.rtf.noPhoneSmsAuthenform.hidden(array[i]);
                } else {
                    window.gspformService.rtf.authenform.hidden(array[i]);
                }
            }
        },
        //UI显示
        show: function (obj) {
            var array = obj.split(/[&|]/);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'UserPassword') {
                  window.gspformService.rtf.userPasswordAuthenform.show(array[i]);
                } else if (array[i] === 'Windows') {
                    WindowsShow();
                } else if (array[i] === 'Certificate') {
                    CertificateShow();
                } else if (array[i] === 'SMS') {
                  window.gspformService.rtf.smsAuthenform.show(array[i]);
                } else if (array[i] === 'No_Phone_SMS') {
                  window.gspformService.rtf.noPhoneSmsAuthenform.show(array[i]);
                } else {
                    window.gspformService.rtf.authenform.show(array[i]);
                }
            }
        },
        //form提交前事件
        beformsubmit: function (obj) {
            var array = obj.split(/[&|]/);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'UserPassword') {
                  window.gspformService.rtf.userPasswordAuthenform.beformsubmit(array[i]);
                } else if (array[i] === 'Windows') {
                    Windowssubmit();
                } else if (array[i] === 'Certificate') {
                    Certificatesubmit();
                } else if (array[i] === 'SMS') {
                } else if (array[i] === 'No_Phone_SMS') {
                  window.gspformService.rtf.noPhoneSmsAuthenform.beformsubmit(array[i]);
                } else {
                    window.gspformService.rtf.authenform.beformsubmit(array[i]);
                }
            }
        },
        //构造认证上下文
        getcontext: function (obj) {
            var array = obj.Authenstrategy.split(/[&|]/);
            authenContexts = new Array(array.length);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'Windows') {
                    authenContexts[i] = getWindowsContext(obj);
                } else if (array[i] === 'UserPassword') {
                    authenContexts[i] =  window.gspformService.rtf.userPasswordAuthenform.getcontext(array[i], obj);
                } else if (array[i] === 'Certificate') {
                    authenContextsIndex = i;
                } else if (array[i] === 'SMS') {
                    authenContexts[i] =window.gspformService.rtf.smsAuthenform.getcontext(array[i], obj);
                } else if (array[i] === 'No_Phone_SMS') {
                   authenContexts[i] = window.gspformService.rtf.noPhoneSmsAuthenform.getcontext(array[i], obj);
                } else {
                    authenContexts[i] = window.gspformService.rtf.authenform.getcontext(array[i], obj);
                }
            }
            if (authenContextsIndex != -1)
                getCAContext(obj);
            else
                signOver4beforesubmit(authenContexts);
        },
        //登录设置用户信息
        setInfo: function (obj) {
            var array = obj[0].Authenstrategy.split(/[&|]/);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'UserPassword') {
                  window.gspformService.rtf.userPasswordAuthenform.setInfo(array[i], obj[i])
                } else if (array[i] === 'Windows') {
                    setWindows(obj[i]);
                } else if (array[i] === 'Certificate') {

                } else if (array[i] === 'SMS') {
                    window.gspformService.rtf.smsAuthenform.setInfo(array[i], obj[i])
                } else if (array[i] === 'No_Phone_SMS') {
                  window.gspformService.rtf.noPhoneSmsAuthenform.setInfo(array[i], obj[i]);
                } else {
                    window.gspformService.rtf.authenform.setInfo(array[i], obj[i]);
                }
            }
        },
        i18n: function (authenStrategyId) {
            var array = authenStrategyId.split(/[&|]/);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'UserPassword') {
                  window.gspformService.rtf.userPasswordAuthenform.i18n()
                } else if (array[i] === 'Windows') {
                    i18nWindows();
                } else if (array[i] === 'Certificate') {

                } else if(array[i] === 'SMS') {
                  window.gspformService.rtf.smsAuthenform.i18n()
                } else if (array[i] === 'No_Phone_SMS') {
                  window.gspformService.rtf.noPhoneSmsAuthenform.i18n(array[i]);
                } else {
                  window.gspformService.rtf.authenform.i18n(array[i]);
                }
            }
        },
        //构造加密上下文
        getSecurityContext: function (obj, authenstrategyId) {
            var array = authenstrategyId.split(/[&|]/);
            authenContexts = new Array(array.length);
            for (var i = 0; i < array.length; i++) {
                if (array[i] === 'Windows') {
                    authenContexts[i] = getWindowsSecurityContext(obj[i]);
                } else if (array[i] === 'UserPassword') {
                    authenContexts[i] = getPwdSecurityContext(obj[i]);
                } else if (array[i] === 'Certificate') {
                    authenContexts[i] = getCertSecurityContext(obj[i]);
                } else if(array[i] === 'SMS') {
                } else if (array[i] === 'No_Phone_SMS') {
                } else {
                    authenContexts[i] = window.gspformService.rtf.authenform.getSecurityContext(obj[i], array[i]);
                }
            }
            return authenContexts;
        }
    }
})(authenform || {})

var self = this;
self.errorinfo = document.getElementById("errorMessage");

//域移除
function WindowsHidden() {
    if (isIE() || isIE11()) {
        document.getElementById('windows').removeNode(true);
    } else {
        document.getElementById('windows').remove();
    }
    if (document.getElementById("vcode"))
        document.getElementById("vcode").style.display = "none";
}
//证书移除
function CertificateHidden() {
    if (isIE() || isIE11()) {
        document.getElementById('certificate').removeNode(true);
    } else {
        document.getElementById('certificate').remove();
    }
}

//域显示
var home;
var userName;
var passWord;

function WindowsShow() {
    var up = document.createElement('div');
    up.id = 'windows';
    up.style = 'margin-bottom: 10px';
    rest("./api/runtime/sys/v1.0/ldap/state/" + self.curtTenantId + "/1 ", false, "GET", 'json', null, function (data) {
        if (data && data.length === 1) {
            up.innerHTML = '<span class=\"form-control\"  style="display:none;padding-top:0px;padding-right:0px;margin:0;position:relative;background-color:transparent" \/>\
            <img src=\"./platform/runtime/sys/web/assets/img/home.svg\" style="position:absolute;top:50%;margin-top:-7.5px"\/>\
            <input type=\"text\" class=\"form-control\"  autocomplete=\"off\" id=\"home\" name=\"home\"  style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>\
            <span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;background-color:transparent" \/>\
            <img src=\"./platform/runtime/sys/web/assets/img/homeuser.svg\" style="position:absolute;top:50%;margin-top:-7.5px"\/>\
            <input type=\"text\" class=\"form-control\"  autocomplete=\"off\" id=\"windowsuserName\" name=\"windowsuserName\"  style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>\
            <span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;margin-top:12px;background-color:transparent" \/>\
            <img src=\"./platform/runtime/sys/web/assets/img/homepwd.svg\" style="position:absolute;top:50%;margin-top:-7.5px"\/>\
            <input type=\"password\" class=\"form-control\"  autocomplete=\"new-password\" id=\"windowspassWord\" name=\"windowspassWord\"   onpaste=\"return false\" oncontextmenu=\"return false\" oncopy=\"return false\" oncut=\"return false\" style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>';
        } else {
            up.innerHTML = '<span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;background-color:transparent" \/>\
            <img src=\"./platform/runtime/sys/web/assets/img/home.svg\" style="position:absolute;top:50%;margin-top:-7.5px"\/>\
            <input type=\"text\" class=\"form-control\"  autocomplete=\"off\" id=\"home\" name=\"home\"  style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>\
            <span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;margin-top:12px;background-color:transparent" \/>\
            <img src=\"./platform/runtime/sys/web/assets/img/homeuser.svg\" style="position:absolute;top:50%;margin-top:-7.5px"\/>\
            <input type=\"text\" class=\"form-control\"  autocomplete=\"off\" id=\"windowsuserName\" name=\"windowsuserName\"  style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>\
            <span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;margin-top:12px;background-color:transparent" \/>\
            <img src=\"./platform/runtime/sys/web/assets/img/homepwd.svg\" style="position:absolute;top:50%;margin-top:-7.5px"\/>\
            <input type=\"password\" class=\"form-control\"  autocomplete=\"new-password\" id=\"windowspassWord\" name=\"windowspassWord\"   onpaste=\"return false\" oncontextmenu=\"return false\" oncopy=\"return false\" oncut=\"return false\" style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>';
        }
        document.getElementById('authenform').appendChild(up);
        i18nWindows();
        if (data && data.length === 1) {
            document.getElementById("home").value = data[0].domainname;
        }
        if (this.checkMode == null) {
            rest(configUri, false, "GET", 'json', null, function (data) {
                this.checkMode = data;
            });
        }
        if (this.checkMode && this.checkMode.vcode) {
            document.getElementById("vcode_img").src = "./api/runtime/sys/v1.0/authenitems/vCode?ran=" + Math.random();
            document.getElementById("vcode").style.display = "inline-flex";
        }
    });
    document.onkeydown = function (e) { // 回车提交表单
        var theEvent = window.event || e;
        var code = theEvent.keyCode || theEvent.which || theEvent.charCode;
        if (code == 13 && self.enterflag == 0) {
            beforesubmit();
        }
    }
}

//证书显示
function CertificateShow() {
    var up = document.createElement('div');
    up.id = 'certificate';
    up.innerHTML = '<select class=\"custom-select w-100 loginsection formselect\" id=\"CAselect\" style="margin-bottom: 12px;padding-left: 36px;background-color:transparent">  <\/select>\
	<img src="./platform/runtime/sys/web/assets/img/cert.svg" style="margin-top: -35px;margin-left: 10px;position:absolute;display:block" \/>\
    <input type=\"text\"  id=\"RandomMsg\" name=\"RandomMsg\" style="display:none" \/>\
    <input type=\"text\"  id=\"SignedMsg\" name=\"SignedMsg\" style="display:none" \/>\
    <input type=\"text\"  id=\"CertBase64String\" name=\"CertBase64String\" style="display:none" \/>\
    <input type=\"text\"  id=\"SerialNumber\" name=\"SerialNumber\" style="display:none" \/>';
    document.getElementById('authenform').appendChild(up);

    var loading = "";
    var option;
    var sel = document.getElementById('CAselect');
    loadtime = setInterval(function () {
        if (loading == " . . .")
            loading = "";
        loading += " .";
        option = new Option(loading, "-1");
        sel.options[1] = option;
        sel.selectedIndex = 1;
    }, 500);
    gspCA.getCertList('', 1);
}

var certsArray = [];
$(document).on("getCertOver", getCertOver);

function getCertOver(event, certs) {
    clearInterval(loadtime);
    var options = new Array();
    for (var i = 0; i < certs.length; i++) {
        var cert = certs[i];
        certsArray.push(cert);
        option = new Option(cert.CommonName, i);
        options[options.length] = option;
    }
    var sel = document.getElementById('CAselect');
    if (sel != null) {
        if (options) {
            for (var i = 0; i < options.length; i++) {
                sel.options[i] = options[i];
            }
        }
        sel.selectedIndex = 0; //默认选中第一个
    }
}


//用户名密码构造认证上下文
function getPwdContext(obj) {
    var param = {
        AuthenType: 'UserPassword',
        Authenstrategy: obj.Authenstrategy,
        Tenant: obj.Tenant,
        language: obj.language,
        username: obj.userName,
        password: obj.passWord
    }
    if (!param.username || !param.password) {
        document.getElementById("login").disabled = false;
        document.getElementById("errorMessage").style.display = '';
        addClass(self.errorinfo, "alert-warning");
        document.getElementById("errorMessage").innerHTML = window.loginResource == undefined ? $.i18n.prop('errorInfo') : window.loginResource.errorInfo;
        return false;
    }
    return param;
}
//域构造认证上下文
function getWindowsContext(obj) {
    var param = {
        AuthenType: 'Windows',
        Authenstrategy: obj.Authenstrategy,
        Tenant: obj.Tenant,
        language: obj.language,
        home: document.getElementById('home').value,
        windowsuserName: document.getElementById('windowsuserName').value,
        windowspassWord: document.getElementById('windowspassWord').value
    }
    if (!param.home || !param.windowsuserName || !param.windowspassWord) {
        document.getElementById("login").disabled = false;
        document.getElementById("errorMessage").style.display = '';
        addClass(self.errorinfo, "alert-warning");
        document.getElementById("errorMessage").innerHTML = window.loginResource == undefined ? $.i18n.prop('errorInfo') : window.loginResource.errorInfo;
        return false;
    }
    return param;
}
var random;
var certParam;

function getCAContext(obj) {
    var index = document.getElementById('CAselect').selectedIndex;
    random = getrandom();
    if (index < 0) {
        document.getElementById("login").disabled = false;
        this.authenContextsIndex = -1;
        alert('请先选择数字证书');
        return null;
    }
    certParam = {
        AuthenType: 'Certificate',
        Authenstrategy: obj.Authenstrategy,
        Tenant: obj.Tenant,
        language: obj.language,
        RandomMsg: random,
        SignedMsg: "",
        CertBase64String: gspCA.getCertBase64(certsArray[index]),
        SerialNumber: gspCA.getCertKey(certsArray[index])
    }
    certParam.SignedMsg = gspCA.signMessage(certsArray[index], [random], '');
}

$(document).on("signOver", signOver);
function signOver(event, signedData) {
    if (signedData && signedData.length > 0) {
        certParam.SignedMsg = signedData[1][0];
        authenContexts[authenContextsIndex] = certParam;
        this.authenContextsIndex = -1;
    }
    signOver4beforesubmit(authenContexts);
}

//IE浏览器不支持remove(),要使用removeNode()
function isIE() {
    if (!!window.ActiveXObject || "ActiveXObject" in window) {
        return true;
    } else {
        return false;
    }
}

function isIE11() {
    if ((/Trident\/7\./).test(navigator.userAgent)) {
        return true;
    } else {
        return false;
    }
}

//获取随机数
function getrandom() {
    var strings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var result = '';
    for (var i = 0; i < 20; i++) {
        var number = Math.floor(Math.random() * 48);
        result += strings.slice(number, number + 1);
    }
    random = result;
    return random;
}


function setWindows(obj) {
    document.getElementById("home").value = obj.home;
    document.getElementById("windowsuserName").value = obj.windowsuserName;
    document.getElementById("windowspassWord").value = obj.windowspassWord;
}


function Windowssubmit() {
    var domainpwd = document.getElementById("windowspassWord").value;
    var domainenpwd = slRun_t(domainpwd);
    document.getElementById("windowspassWord").value = domainenpwd;
    while (document.getElementById("windowspassWord").value !== domainenpwd) {
        document.getElementById("passWord").value = domainenpwd;
    }
}

function Certificatesubmit() {
    var index = document.getElementById('CAselect').selectedIndex;
    if (index < 0) {
        alert('请先选择数字证书');
        return null;
    }
    document.getElementById("RandomMsg").value = certParam.RandomMsg;
    document.getElementById("SignedMsg").value = certParam.SignedMsg;
    document.getElementById("CertBase64String").value = certParam.CertBase64String;
    document.getElementById("SerialNumber").value = certParam.SerialNumber;
}



function slRun_t(info) {
    var bis = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCPpLfSzW7K7ZP1CGL6iUbOHXMtZaiRicIdiNzPDv29DdzSRRHzFhYZRa5FWI7mrIgcDha+eGHHfmoy3JPI0XwfHQ0w9mat6isasBp+ZTQhutkP2BaBGXZKYdVuOOV9TTVL45UTQAIzdJwSsBBDVCeo+xfyxt4gUxxtrdDa+iImWQIDAQAB';
    var encrypt = new JSEncrypt();
    encrypt.setPublicKey(bis);
    var encrypted = encrypt.encryptLong(info);
    return encrypted;
}


function i18nWindows() {
    $('#home')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('home') : window.loginResource.home;
    $('#windowsuserName')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('windowsuserName') : window.loginResource.windowsuserName;
    $('#windowspassWord')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('windowspassWord') : window.loginResource.windowspassWord;
}

function getWindowsSecurityContext(obj) {
    obj.windowspassWord = slRun_t(obj.windowspassWord);
    return obj;
}

function getPwdSecurityContext(obj) {
    obj.password = slRun_t(obj.password);
    return obj;
}

function getCertSecurityContext(obj) {
    return obj;
}
