window.gspformService = window.gspformService || {};
gspformService.rtf = gspformService.rtf || {};

gspformService.rtf = (function (rtf) {

  rtf.userPasswordAuthenform = (function (userPasswordAuth) {
    userPasswordAuth.hidden = function (authType) {
      if (isIE() || isIE11()) {
        document.getElementById('userpassword').removeNode(true);
      } else {
        document.getElementById('userpassword').remove();
      }
      if (document.getElementById("vcode"))
        document.getElementById("vcode").style.display = "none";
    }

    userPasswordAuth.show = function (authType) {
      UserPasswordShow();
    }

    userPasswordAuth.beformsubmit = function (authType) {
      document.getElementById("passWord").type = "password";
      document.getElementById("loginpasswordicon").style.display = "none";
      var pwd = document.getElementById("passWord").value;
      var enpwd = slRun_t(pwd);
      document.getElementById("passWord").value = enpwd;
      while (document.getElementById("passWord").value !== enpwd) {
        document.getElementById("passWord").value = enpwd;
      }
    }

    userPasswordAuth.getcontext = function (authType, obj) {
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

    userPasswordAuth.setInfo = function (authType, obj) {
      $("#userName")[0].value = obj.username;
      $("#passWord")[0].value = obj.password;
    }

    userPasswordAuth.i18n = function (authType) {
      $('#userName')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('userName') : window.loginResource.userName;
      $('#passWord')[0].placeholder = window.loginResource == undefined ? $.i18n.prop('passWord') : window.loginResource.passWord;
      var imgSrc = window.loginResource == undefined ? $.i18n.prop('upCapsLock') : window.loginResource.upCapsLock;
      document.getElementById("UPCapsLock").style.background = "url(\'" + imgSrc + "\')";
    }

    return userPasswordAuth;
  })(rtf.userPasswordAuthenform || {})

  return rtf;
})(gspformService.rtf || {}, window);


//用户名密码显示
function UserPasswordShow() {
  var up = document.createElement('div');
  up.id = 'userpassword';
  up.style = 'margin-bottom: 10px';
  var passwordHtml = '<span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;background-color:transparent" \/>\
    <img src=\"./platform/runtime/sys/web/assets/img/user.svg\" style="position:relative;top:50%;margin-top:-5px"\/>\
    <input type=\"text\" class=\"form-control\"  autocomplete=\"off\" id=\"userName\" name=\"username\" style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>\
    <span class=\"form-control\"  style="padding-top:0px;padding-right:0px;margin:0;position:relative;margin-top:12px;background-color:transparent" \/>\
    <img src=\"./platform/runtime/sys/web/assets/img/pwd.svg\" style="position:relative;top:50%;margin-top:-5px"\/>\
    <input type=\"password\" class=\"form-control\" autocomplete=\"new-password\"  id=\"passWord\" name=\"password\"  onpaste=\"return false\" oncontextmenu=\"return false\" oncopy=\"return false\" oncut=\"return false\" style="margin-bottom: 12px;display:inline;float:right;width:278px;height:30px;border:none;background-color:transparent" \/></span>\
    <img id="loginpasswordicon" src="./platform/runtime/sys/web/assets/img/ph.svg" class="login-setting-password-img"\
            onclick="changePwdIconStete(event)">\
    <span id=\"UPCapsLock\" style=\"display: none;position: relative;width: 78px;height: 20px;background: url(./platform/runtime/sys/web/assets/img/capslock.svg);margin-top: -38px;margin-right:30px;float:right;background-color:rgba(255,255,255,0.5)\"></span>';
  up.innerHTML = passwordHtml;

  document.getElementById('authenform').appendChild(up);
  if (localStorage.getItem(this.loginStoreKey) == "true" && window.passwordAbleVisible && document.getElementById("passWord").value) {
    document.getElementById("loginpasswordicon").style.display = "block";
  }
  $("#passWord").keyup(function () {
    if (document.getElementById("passWord").value) {
      if (window.passwordAbleVisible) {
        document.getElementById("loginpasswordicon").style.display = "block";
      }
    } else {
      document.getElementById("loginpasswordicon").style.display = "none";
    }
  });
  // 如果有异常信息，小眼睛图标会往下移，兼容
  if (window.passwordAbleVisible) {
    if ($('#errorMessage').css('display') != 'none') {
      var height = document.getElementsByClassName("login-setting-password-img")[0];
      if (height != null) {
        var topNumber = height.style.top;
        if (topNumber != '') {
          height.style.top = parseInt(height.style.top.split('%').join("")) - 5 + '%';
        } else {
          height.style.top = 45 + '%';
        }
      }
    }
  }

  if (this.checkMode == null) {
    rest(configUri, false, "GET", 'json', null, function (data) {
      this.checkMode = data;
    });
  }
  if (this.checkMode && this.checkMode.vcode) {
    document.getElementById("vcode_img").src = "./api/runtime/sys/v1.0/authenitems/vCode?ran=" + Math.random();
    document.getElementById("vcode").style.display = "inline-flex";
    if (window.passwordAbleVisible) {
      var height = document.getElementsByClassName("login-setting-password-img")[0];
      if (height != null) {
        var topNumber = height.style.top;
        if (topNumber != '') {
          height.style.top = parseInt(height.style.top.split('%').join("")) - 5 + '%';
        } else {
          height.style.top = 45 + '%';
        }
      }
    }
  }
  var imgSrc = window.loginResource == undefined ? $.i18n.prop('upCapsLock') : window.loginResource.upCapsLock;
  document.getElementById("UPCapsLock").style.background = "url(\'" + imgSrc + "\')";
  document.onkeydown = function (e) { // 回车提交表单
    if (e.target.id == "passWord" || e.target.id == "userName" || e.target.id == "vcode_input") {
      var theEvent = window.event || e;
      var code = theEvent.keyCode || theEvent.which || theEvent.charCode;
      if (code == 13 && self.enterflag == 0) {
        beforesubmit();
      }
      if (code != null && code != undefined && code != 13 && self.oriauthenstrategy == "UserPassword") {
        var shiftKeyState = e.getModifierState('CapsLock');
        if (shiftKeyState) {
          document.getElementById("UPCapsLock").style.display = "";
        } else {
          document.getElementById("UPCapsLock").style.display = "none";
        }
      }
    }
  }
  $('#userName').on('focus', function () {
    $('#userName').bind('input', function () {
      document.getElementById("passWord").value = '';
    });
  });
}
