var CryptoKit = null;
var signedNum = 0;
var signBatch = new Array();
var signInnerBatch = new Array();
var certInfo_url = "/api/runtime/sys/v1.0/certificates/CFCA";
if (CryptoKit == null) {
    CryptoKit = new nmCryptokit("Chrome");
}
startService();
function getCertList(arrayIssuerDN, dateFlag) {
    var issuers;
    var commonService;
    var certCommonName;
    var certSerialNumber;
    var certCertContent;
    if (top.gspframeworkService && top.gspframeworkService.common)
        commonService = top.gspframeworkService.common;
    if (!!commonService) {
        var options = {
            url: certInfo_url,
            async: false,
            dataType: 'json'
        };
        commonService.rest.get(options, function (data) {
            var loginResource = data;
            if (loginResource != undefined && loginResource != null) {
                issuers = data.issuers;
            }
        });
    }
    CryptoKit.selectCertificate("", issuers, "", "")
        .then(function (response) {
            if (response.result) {
                return CryptoKit.getSignCertInfo("SubjectCN")
                    .then(function (response) {
                        certCommonName = response.result;
                        return CryptoKit.getSignCertInfo("SerialNumber")
                            .then(function (response) {
                                certSerialNumber = response.result;
                                return CryptoKit.getSignCertInfo("CertContent")
                                    .then(function (response) {
                                        certCertContent = response.result;
                                        var certName = [];
                                        certName[0] = { "CommonName": certCommonName, "SerialNumber": certSerialNumber, "CertContent": certCertContent };
                                        if (window.gspframeworkService && window.gspframeworkService.rtf)
                                            window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.getCertOverToken(), certName);
                                        else
                                            $(document).trigger("getCertOver", [certName]);
                                    })
                                    .catch(function (response) {
                                        CryptoKit.getLastErrorDesc()
                                            .then(function (response) {
                                                alert(response.result);
                                            });
                                    });
                            })
                            .catch(function (response) {
                                CryptoKit.getLastErrorDesc()
                                    .then(function (response) {
                                        alert(response.result);
                                    });
                            });
                    })
                    .catch(function (response) {
                        CryptoKit.getLastErrorDesc()
                            .then(function (response) {
                                alert(response.result);
                            });
                    });
            }
        })
        .catch(function (response) {
            CryptoKit.getLastErrorDesc()
                .then(function (response) {
                    alert(response.result);
                });
        });;
}
// 签名
function signMessage(cert, random, opt) {
    // var msg = encodeURIComponent(random[i]).replace(/%20/g, "+");
    // msg = msg.replace(/\!/g, "%21");
    // msg = msg.replace(/\(/g, "%28");
    // msg = msg.replace(/\)/g, "%29");
    // msg = msg.replace(/\'/g, "%27");
    // msg = msg.replace(/\~/g, "%7E");
    CryptoKit.signMsgPKCS7(random[signedNum], "SHA-256", false)
        .then(function (response) {
            signBatch[0] = "true";
            signInnerBatch[signedNum] = response.result;
            if (signedNum < random.length - 1) {
                signedNum += 1;
                signMessage(cert, random, opt);
            } else {
                signedNum = 0;
                signBatch[1] = signInnerBatch;
                signInnerBatch = new Array();
                if (window.gspframeworkService && window.gspframeworkService.rtf)
                    window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signOverToken(), signBatch);
                else
                    $(document).trigger("signOver", [signBatch]);
                return;
            }
        })
        .catch(function (response) {
            CryptoKit.getLastErrorDesc()
                .then(function (response) {
                    alert(response.result);
                });
            signBatch[0] = "false";
            signInnerBatch = new Array();
            signInnerBatch[0] = "签名失败:" + response;
            signBatch[1] = signInnerBatch;
            if (window.gspframeworkService && window.gspframeworkService.rtf)
                window.gspframeworkService.rtf.caEvent.trigger(window.gspframeworkService.rtf.caEvent.signOverToken(), signBatch);
            else
                $(document).trigger("signOver", [signBatch]);
            return;
        });
}
// 获取证书密钥
function getCertBase64(cert) {
    return cert.CertContent;
}
// 获取证书序列号
function getCertKey(cert) {
    return cert.SerialNumber;
}
//启动证书服务
function startService() {
    CryptoKit.init()
        .catch(function (response) {
            CryptoKit.getLastErrorDesc()
                .then(function (response) {
                    alert(response.result);
                });
        });;
}
