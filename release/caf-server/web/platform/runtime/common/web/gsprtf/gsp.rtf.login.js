window.gspframeworkLoginService = window.gspframeworkLoginService || {};
gspframeworkLoginService.common = gspframeworkLoginService.common || {};

gspframeworkLoginService.common = (function (common, win, $) {
    common.auth = (function (auth) {
        auth.login = function (formData, suc, failed, error) {
            formData.set('password', slRun_t(formData.get("password")));
            // var formData = new FormData();
            $.ajax({
                url: '/sign-in?do-not-redirect=true',
                data: formData,
                processData: false,
                type: 'POST',
                contentType: false,
                processData: false,
                success: function (data) {
                    if (data && data.authentication && data.authentication === "success") {
                        if (suc) {
                            suc();
                        } else {
                            window.location.href = "/platform/runtime/sys/web/index.html?v=20230203#/ssologin";
                        }
                    }
                    else if (data && data.error && data.error.message) {
                        var info = decodeURIComponent(data.error.message);
                        if (info.startsWith("00")) {
                            info = info.substring(4);
                        }
                        if (failed) {
                            failed(info);
                        } else {
                            return;
                        }
                    }
                },
                error: function (e) {
                    if (error) {
                        error(e);
                    }
                }
            });
        }
        return auth;
    })(common.auth || {});
    return common;
})(gspframeworkLoginService.common || {}, window, jQuery);

function slRun_t(info) {
    var bis = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCPpLfSzW7K7ZP1CGL6iUbOHXMtZaiRicIdiNzPDv29DdzSRRHzFhYZRa5FWI7mrIgcDha+eGHHfmoy3JPI0XwfHQ0w9mat6isasBp+ZTQhutkP2BaBGXZKYdVuOOV9TTVL45UTQAIzdJwSsBBDVCeo+xfyxt4gUxxtrdDa+iImWQIDAQAB';
    var encrypt = new JSEncrypt();
    encrypt.setPublicKey(bis);
    var encrypted = encrypt.encryptLong(info);
    return encrypted;
}
