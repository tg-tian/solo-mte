var apisock = null;
var apiok = false;
var signedNum = 0;
var signBatch = new Array();
var signInnerBatch = new Array();
var batchLength = 0;
var itrus_curCert;
var itrus_oriMsg;
var itrus_opt;
var certInfo_url = "/api/runtime/sys/v1.0/certificates/iTrus";
var itrus_error = {
    "zh-CHS": "数字证书驱动运行失败，请检查驱动是否已正常安装并运行",
    "en": "The driver for the digital certificate failed to run. Please check if the driver has been installed and running properly",
    "zh-CHT": "數位憑證驅動運行失敗，請檢查驅動是否已正常安裝並運行"
};
function startService() {
    if (!apisock) {
        createapisocket("itrus");
    }
}

function createapisocket(type) {
    // 创建ApiSocket对象
    apisock = new ApiSocket(type);
    // 设置重试端口次数
    apisock.retry = 1;
    apiok = false;
    // 当open成功时，绑定到scca_api上
    apisock.onopen = function (evt) {
        // 绑定到scca_api上		
        var bindreq = JSON.stringify(apisock.bindreq("alihealth_api"));
        apisock.send(bindreq);
        // 设置状态
        apiok = true;
    };
    // 接收到消息事件
    apisock.onmessage = my_onmessage
    // 关闭事件处理
    apisock.onclose = function (evt) {
        apisock = null;
    };
    // 错误事件处理
    apisock.onerror = function (evt) {
        apisock = null;
        var signResult = new Array();
        signResult[0] = "false";
        var lan = localStorage.getItem("languageCode") || "zh-CHS";
        signResult[1] = itrus_error[lan];
        if (window.gspframeworkService && window.gspframeworkService.rtf)
            window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signOverToken(), signResult);
        else
            $(document).trigger("signOver", [signResult]);
        return;
    };
}

function getCertList(arrayIssuerDN, dateFlag) {
    if (!apisock) {
        startService();
        setTimeout(function () { getCerts(arrayIssuerDN, dateFlag); }, 2000);
    } else {
        getCerts(arrayIssuerDN, dateFlag);
    }
}

function getCerts(arrayIssuerDN, dateFlag) {
    var req;
    var issuers = [];
    var commonService;
    if (top.gspframeworkService && top.gspframeworkService.common)
        commonService = top.gspframeworkService.common;
    if (!!commonService && !!commonService.getBasePath && commonService.getBasePath.get() != undefined) {
        let path = commonService.getBasePath.get();
        certInfo_url = path + certInfo_url;
    } else {
        certInfo_url = "./api/runtime/sys/v1.0/certificates/iTrus";
    }
    if (!!commonService) {
        var options = {
            url: certInfo_url,
            async: false,
            dataType: 'json'
        };
        commonService.rest.get(options, function (data) {
            var loginResource = data;
            if (loginResource != undefined && loginResource != null) {
                issuers[0] = data.issuers;
            }
        });
    }
    if (issuers == [] || issuers[0] == null || issuers[0] == "") {
        req = {
            nocache: 1,
            cmd: "enumCerts"
        };
    } else {
        req = {
            nocache: 1,
            cmd: "enumCerts",
            issuers: issuers
        };
    }
    var reqtext = JSON.stringify(req);
    if (!apisock) {
        startService();
        setTimeout(function () { apisock.send(reqtext); }, 2000);
    } else {
        apisock.send(reqtext);
    }
}

function signMessage(cert, random, opt) {
    this.itrus_curCert = cert;
    this.itrus_oriMsg = random;
    this.itrus_opt = opt;

    if (!apisock)
        return;
    var b64cert = cert.CertBase64;
    batchLength = random.length;
    signBatch = new Array(batchLength);
    if (batchLength > 0) {
        var msg = encodeURIComponent(random[signedNum]).replace(/%20/g, "+");
        msg = msg.replace(/\!/g, "%21");
        msg = msg.replace(/\(/g, "%28");
        msg = msg.replace(/\)/g, "%29");
        msg = msg.replace(/\'/g, "%27");
        msg = msg.replace(/\~/g, "%7E");
        var req = {
            cmd: "signMessage",
            text: msg,
            gbk: 0, // 1表示采用GBK编码；0为缺省值，表示采用UTF8编码
            detached: 1,
            raw: 1,
            cert: b64cert,
            hashAlgorithm: "2.16.840.1.101.3.4.2.1" // SHA256算法
        };
        var reqtext = JSON.stringify(req);
        apisock.send(reqtext)
    }
}

function getCertBase64(cert) {
    return cert.CertBase64;
}

function getCertKey(cert) {
    return cert.SerialNumber;
}

function my_onmessage(evt) {
    var ret = JSON.parse(evt.data);
    if (ret.req.cmd == "enumCerts") {
        if (ret.resp._code_ != 0)
            return;
        for (var i = 0; i < ret.resp.certs.length; i++) {
            if (ret.resp.certs[i].ProvName == "LongmaiSKF") {
                ret.resp.certs.splice(i, 1);
                --i;
            }
        }
        gspCA.certBak();
        // 捕捉getCertOver事件，获取证书列表
        if (window.gspframeworkService && window.gspframeworkService.rtf)
            window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.getCertOverToken(), ret.resp.certs);
        else
            $(document).trigger("getCertOver", [ret.resp.certs]);
    }
    if (ret.req.cmd == "signMessage") {
        if (ret.resp._code_ != 0) {
            signBatch[0] = "false";
            signInnerBatch[0] = "签名失败";
            signBatch[1] = signInnerBatch;
            if (window.gspframeworkService && window.gspframeworkService.rtf)
                window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signOverToken(), signBatch);
            else
                $(document).trigger("signOver", [signBatch]);
            return;
        } else {
            signedData = ret.resp.signedData;
            signBatch[0] = "true"
            if (signedNum < batchLength) {
                signInnerBatch[signedNum] = signedData;
                ++signedNum;
            }
            if (signedNum >= batchLength) {
                signedNum = 0;
                signBatch[1] = signInnerBatch;
                signInnerBatch = new Array();
                // 捕捉signOver事件，获取签名后信息
                if (window.gspframeworkService && window.gspframeworkService.rtf)
                    window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signOverToken(), signBatch);
                else
                    $(document).trigger("signOver", [signBatch]);
                return;
            }
            signMessage(window.itrus_curCert, window.itrus_oriMsg, window.itrus_opt);
        }
    }
}