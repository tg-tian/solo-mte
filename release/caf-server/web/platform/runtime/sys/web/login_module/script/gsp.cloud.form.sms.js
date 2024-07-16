

const SMSCodeSuccessInfo = {
  "zh-CHS": "短信验证码已发送，可能会有延后，请耐心等待",
  "en": "SMS verification code has been sent, there may be delay, please wait patiently",
  "zh-CHT": "短信驗證碼已發送，可能會有延後，請耐心等待"
};

const SMSCodeEmptyInfo = {
  "zh-CHS": "请先输入验证码",
  "en": "Please enter the verification code first",
  "zh-CHT": "請先輸入驗證碼"
};

const SMSCodeErrorInfo = {
  "zh-CHT": "短信验证码错误或已失效，请重新获取",
  "en": "The SMS verification code is incorrect or invalid, please obtain it again",
  "zh-CHS": "短信验证码错误或已失效，请重新获取"
};


const SMSCodePhoneEmptyInfo = {
  "zh-CHS": "请先输入手机号",
  "en": "Please enter your phone number first",
  "zh-CHT": "請先輸入手機號"
};

const SMSCodePhoneFormatErrorInfo = {
  "zh-CHS": "手机号格式不正确，请重新输入",
  "zh-CHT": "手機號格式不正確，請重新輸入",
  "en": "Phone number format error, please re-enter"
};

const SMSCodePhoneCountInfo = {
  "zh-CHS": "{0}秒后重发",
  "en": "Resend after{0}seconds",
  "zh-CHT": "{0}秒後重發"
};

window.gspformService = window.gspformService || {};
gspformService.rtf = gspformService.rtf || {};

gspformService.rtf = (function (rtf) {

  rtf.smsAuthenform = (function (smsAuthForm) {
    smsAuthForm.hidden = function (authType) {
      document.getElementById('SMS').remove();
    }

    smsAuthForm.show = function (authType) {
      showSmsAuth();
    }

    smsAuthForm.beformsubmit = function (authType) {

    }

    smsAuthForm.getcontext = function (authType, obj) {
      var param = {
        AuthenType: 'SMS',
        Authenstrategy: obj.Authenstrategy,
        Tenant: obj.Tenant,
        language: obj.language,
        phoneNumber: $('#SMS-mobile').val(),
        smsCode: $('#SMS-code').val()
      }
      return checkSMS() && param;
    }

    smsAuthForm.setInfo = function (authType, obj) {
      $('#SMS-mobile').val(obj.mobile);
    }

    smsAuthForm.i18n = function (authType) {
      $('#SMS-mobile')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('smsMobile') : window.loginResource.smsMobile;
      $('#SMS-code')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('smsCode') : window.loginResource.smsCode;
      $('#SMS-send')[0].textContent = window.loginResource == undefined ? $.i18n.prop('smsSend') : window.loginResource.smsSend;
    }

    return smsAuthForm;
  })(rtf.smsAuthenform || {})

  return rtf;
})(gspformService.rtf || {}, window);



function showSmsAuth(){
  var str  = '                        <div id="SMS-container">\n' +
    '                                <span class="form-control"\n' +
    '                                    id="SMS-mobile-container"\n' +
    '                                    style="padding-top:0px;padding-right:0px;margin:0;position:relative;background-color:transparent">\n' +
    '                                    <img\n' +
    '                                        src="./platform/runtime/sys/web/assets/img/mobile.svg"\n' +
    '                                        style="position:relative;top:50%;margin-top:-5px">\n' +
    '                                    <input type="text" class="form-control"\n' +
    '                                        id="SMS-mobile" name="phoneNumber"\n' +
    '                                        style="margin-bottom:\n' +
    '                                        12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent"\n' +
    '                                       >\n' +
    '                                </span>\n' +
    '                                <span class="form-control"\n' +
    '                                    id="SMS-code-container"\n' +
    '                                    style="padding-top:0px;padding-right:0px;margin:0;position:relative;margin-top:12px;background-color:transparent">\n' +
    '                                    <img\n' +
    '                                        src="./platform/runtime/sys/web/assets/img/mobile-code.svg"\n' +
    '                                        style="position:relative;top:50%;margin-top:-5px">\n' +
    '                                    <span\n' +
    '                                        style="\n' +
    '                                        display: inline-block;\n' +
    '                                        width:75px;\n' +
    '                                        float: right;\n' +
    '                                        font-family: PingFangSC-Regular;\n' +
    '                                        font-size: 12px;\n' +
    '                                        color: #388FFF;\n' +
    '                                        text-align: right;\n' +
    '                                        line-height: 30px;\n' +
    '                                        font-weight: 400;\n' +
    '                                        padding: 0 4px;\n' +
    '                                        ">\n' +
    '                                        <span id="SMS-send" style="cursor:\n' +
    '                                            pointer" onclick="sendCode(event)">\n' +
    '                                            \n' +
    '                                        </span>\n' +
    '                                        <span id="SMS-after-send"\n' +
    '                                            style="display:none">\n' +
    '\n' +
    '                                        </span>\n' +
    '                                    </span>\n' +
    '                                    <input type="text" class="form-control"\n' +
    '                                        autocomplete="new-password"\n' +
    '                                        id="SMS-code" name="smsCode"\n' +
    '                                        style="margin-bottom:\n' +
    '                                        12px;display:inline;float:right;width:204px;height:30px;border:none;background-color:transparent"\n' +
    '                                        >\n' +
    '                                </span>\n' +
    '                            </div>';

  var up = document.createElement('div');
  up.id = 'SMS';
  up.innerHTML = str;
  //authenform是固定的，不用变
  document.getElementById('authenform').appendChild(up);
}




function sendCode() {
  const messageElement = document.getElementById('errorMessage');
  // 先输入手机号
  if (!checkSMSMobile(messageElement)) {
    return;
  }
  backSMSCode();
  const sendElement = document.getElementById('SMS-send');
  const afterSendElement = document.getElementById('SMS-after-send');
  hideSend(sendElement);
  showSMSMessage(messageElement, SMSCodeSuccessInfo[this.curLanguage.code]);
  var count = 60;
  showAfterSend(afterSendElement, count);
  const setInterId = setInterval(() => {
    if (count > 1) {
      count--;
      showAfterSend(afterSendElement, count);
    } else {
      clearInterval(setInterId);
      showSend(sendElement);
      hideAfterSend(afterSendElement);
      hideSMSMessage(messageElement);
    }
  }, 1000);
  // 请求发送接口
  const mobile = $('#SMS-mobile').val();
  rest('./api/runtime/sys/v1.0/sms/smscode/' + mobile + '/' + self.curtTenantId, true, 'GET', 'json', null, function (e) {
  }, function (err) {
    console.log(err);
  });
}

function hideSend(sendElement) {
  const state = sendElement.style.display;
  if (state !== 'none') {
    sendElement.style.display = 'none';
  }
}

function showSend(sendElement) {
  const state = sendElement.style.display;
  if (state !== 'inline') {
    sendElement.style.display = 'inline';
  }
}

function showAfterSend(afterSendElement, second) {
  // 展示文本
  afterSendElement.innerText = stringFormat(SMSCodePhoneCountInfo[this.curLanguage.code], [second]);
  // 展示元素
  const state = afterSendElement.style.display;
  if (state !== 'inline') {
    afterSendElement.style.display = 'inline';
  }
  afterSendElement.style.color = 'rgba(0,0,0,0.45)';
}

function hideAfterSend(afterSendElement) {
  const state = afterSendElement.style.display;
  if (state !== 'none') {
    afterSendElement.style.display = 'none';
  }
  const text = afterSendElement.innerText;
  if (!!text) {
    afterSendElement.innerText = '';
  }
}


function showSMSMessage(messageElement,  message) {
  const state = messageElement.style.display;
  if (state !== 'block') {
    messageElement.style.display = 'block';
    messageElement.style.fontSize = '12px';
  }
  messageElement.style.color = 'rgba(0,0,0,0.45)';
  messageElement.innerText = message;
}



function hideSMSMessage(messageElement) {
  const state = messageElement.style.display;
  if (state !== 'none') {
    messageElement.style.display = 'none';
  }
}

/**
 * 请求前校验
 * @returns
 */
function checkSMS() {
  const messageElement = document.getElementById('errorMessage');
  return checkSMSMobile(messageElement) && checkSMSCode(messageElement);
}

function checkSMSMobile(messageElement) {
  const mobile = document.getElementById('SMS-mobile');
  const mobileContainer = document.getElementById('SMS-mobile-container');
  const val = mobile.value;
  if (!val) {
    showSMSMessage(messageElement, SMSCodePhoneEmptyInfo[this.curLanguage.code]);
    mobileContainer.style.boxShadow = '0 0 4px 2px rgb(255 59 42 / 12%)';
    mobileContainer.style.borderColor = '#F46160';
    messageElement.style.color = '#F46160';
    return false;
  }
  // 校验手机号格式
  const regex = /^(\(\+86\)|\(86\)|86|\+86)?[1][3456789][0-9]{9}$/;
  if (!regex.test(val)) {
    showSMSMessage(messageElement, SMSCodePhoneFormatErrorInfo[this.curLanguage.code]);
    mobileContainer.style.boxShadow = '0 0 4px 2px rgb(255 59 42 / 12%)';
    mobileContainer.style.borderColor = '#F46160';
    messageElement.style.color = '#F46160';
    return false;
  }
  return true;
}

function checkSMSCode(messageElement) {
  const code = document.getElementById('SMS-code');
  if (!code.value) {
    const codeContainer = document.getElementById('SMS-code-container');
    codeContainer.style.borderColor = '#F46160';
    codeContainer.style.boxShadow = '0 0 4px 2px rgb(255 59 42 / 12%)';
    showSMSMessage(messageElement, SMSCodeEmptyInfo[this.curLanguage.code]);
    messageElement.style.color = '#F46160';
  }
  return !!code.value;
}



function backSMSCode() {
  const codeContainer = document.getElementById('SMS-code-container');
  codeContainer.style.borderColor = '#d9d9d9';
  codeContainer.style.boxShadow = '';
}
