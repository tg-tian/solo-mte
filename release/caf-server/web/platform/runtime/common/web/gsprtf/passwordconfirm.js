class passwordConfirm {
  dialogEl = null;
  option = null;
  password = '';
  constructor(option) {
    this.init();
    this.option = option;
  }

  init() {
    this.setStyleTag();
    let dialogWrapper = document.createElement('div');
    dialogWrapper.classList.add('my-dialog-wrapper');
    dialogWrapper.innerHTML = `
              <div class="mask"></div>
              <div class="dialog-wrapper">
                <div class="dialog-title">
                  <div class="title">独立密码</div>
                  <div class="close-icon">✕</div>
                </div>
                <div class="dialog-content">
                <div class="dialog-tips-box">
  <!--                  <p class="tips-content">密码验证通过！</p>-->
                  </div>
                  <div class="dialog-from">
                  <label class="label">输入密码</label>
                  <input  type="text" autocomplete='off'  id="pwd" placeholder="密码" onpaste="return false" ondragenter="return false" oncontextmenu="return false;" oncopy="return false;" oncut="return false;" ondrop="return false;" onselectstart="return false;" oncontextmenu="return false;"></input>
                  </div>
                </div>
                <div class="dialog-footer">
                  <button class="cancel-btn">取消</button>
                  <button class="confirm-btn">确认</button>    
                </div>
              </div>
          `
    // 页面加载后输入框默认聚焦
    setTimeout(function () {
      document.querySelector('#pwd').focus();
    }, 0)

    dialogWrapper.querySelector('.cancel-btn').addEventListener('click', () => {
      this.closeDialog();
    })

    dialogWrapper.querySelector('.close-icon').addEventListener('click', () => {
      this.closeDialog();
    })

    dialogWrapper.querySelector('.confirm-btn').addEventListener('click', () => {
      this.submit();
    })

    this.dialogEl = dialogWrapper;
    document.body.appendChild(dialogWrapper);

    const that = this;

    //监听
    dialogWrapper.querySelector('#pwd').addEventListener('input', function (event) {

      // 火狐浏览器
      if (navigator.userAgent.indexOf("Firefox") != '-1') {
        let val = event.target.value;
        let nDot = /[^●]/g; // 非圆点字符
        let index = -1; // 新输入的字符位置
        let lastChar = void 0; // 新输入的字符
        let realArr = that.password.split(''); // 真实密码数组
        let coverArr = val.split(''); // 文本框显示密码数组
        let coverLen = val.length; // 文本框字符串长度
        let realLen = that.password.length; // 真实密码长度
        // 找到新输入的字符及位置
        coverArr.forEach((el, idx) => {
          if (nDot.test(el)) {
            index = idx;
            lastChar = el;
          }
        });
        if (realLen < coverLen) {
          // 新增字符
          realArr.splice(index, 0, lastChar);
        } else if (coverLen <= realLen && index !== -1) {
          // 替换字符（选取一个或多个字符直接替换）
          realArr.splice(index, realLen - (coverLen - 1), lastChar);
        } else {
          // 删除字符，因为 val 全是 ● ，没有办法匹配，不知道是从末尾还是中间删除的字符，删除了几个，不好对 password 处理，所以可以通过光标的位置和 val 的长度来判断
          let pos = document.getElementById('pwd').selectionEnd; // 获取光标位置
          realArr.splice(pos, realLen - coverLen);
        }
        // 将 pwdCover 替换成 ●
        document.querySelector('#pwd').value = val.replace(/\S/g, '●');
        that.password = realArr.join('');
      } else {
        that.password = document.querySelector('#pwd').value
      }
    })
  }

  // 关闭弹窗
  closeDialog() {
    document.body.removeChild(this.dialogEl);
  }

  // 提交
  submit() {
    // 每次提交前清空提示语
    if (this.dialogEl.querySelector('.tips-content')) {
      const tipscontent = this.dialogEl.querySelector('.tips-content')
      this.dialogEl.querySelector('.dialog-tips-box').removeChild(tipscontent)
    }
    if (!this.password) {
      let tipsContent = this.dialogEl.querySelector('.dialog-tips-box');
      let p = document.createElement('p');
      p.classList.add('tips-content');
      p.innerHTML = `<span class="icon-error">✕</span>密码不能为空，请输入密码`;
      tipsContent.appendChild(p);
      return
    }

    // 加密
    function slRun_t(info) {
      var bis = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCPpLfSzW7K7ZP1CGL6iUbOHXMtZaiRicIdiNzPDv29DdzSRRHzFhYZRa5FWI7mrIgcDha+eGHHfmoy3JPI0XwfHQ0w9mat6isasBp+ZTQhutkP2BaBGXZKYdVuOOV9TTVL45UTQAIzdJwSsBBDVCeo+xfyxt4gUxxtrdDa+iImWQIDAQAB';
      var encrypt = new JSEncrypt();
      encrypt.setPublicKey(bis);
      var encrypted = encrypt.encryptLong(info);
      return encrypted;
    }
    const inputvalue = slRun_t(this.password)

    // 调用接口
    fetch('/api/runtime/sys/v1.0/proving/checkPwd', {
      body: JSON.stringify({ "info": inputvalue }),
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(res => {
        this.showTips(res);
        this.option.submitCallback && this.option.submitCallback(res);
      })
      .catch(err => {
        // console.log(err)
      })

  }


  // 设置样式
  setStyleTag() {
    let style = document.createElement('style');
    style.innerHTML = `
        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        }
        button,button:focus {
          outline:none;
        }
        .my-dialog-wrapper {
            width: 100%;
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
            overflow: hidden;
            z-index: 999;
          }
        
          .my-dialog-wrapper .mask {
            width: 100%;
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            animation: fadeIn 0.5s ease;
          }
        
          .my-dialog-wrapper .dialog-wrapper {
            position: absolute;
            width: 520px;
            height: 223px;
            background: white;
            top:50%;
            left:50%;
            margin-left: -260px;
            margin-top:-112px;
            border-radius: 16px;
            z-index: 1001;
            animation: fadeInDown 0.8s ease both 0.3s;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-title {
            width: 100%;
            font-size: 17px;
            line-height: 24px;
            padding: 16px 24px 0 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-title .title {
            font-size: 17px;
            font-weight: bold;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-title .close-icon {
            cursor: pointer;
            font-size: 14px;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content {
            width: 100%;
            padding:0 20px;
            position: relative;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-from{
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin: 10px auto;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-tips-box{
            height: 20px;
            margin: 10px auto;
            padding-left: 102px;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-tips-box .tips-content{
            margin: 0;
            font-size: 12px;
            display: inline-block;
            color: #F24645;
            font-weight: 400;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-from .label {
            width: 52px;
            font-size: 13px;
            margin-right: 10px;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-from #pwd {
            width: 380px;
            height: 26px;
            background: #FFFFFF;
            border: 1px solid #D9DEE7;
            border-radius: 4px;
            outline: none;
            padding: 0 10px;
            transition: all 0.2s ease;
            text-security: disc;
            -webkit-text-security: disc;
            ime-mode: disabled;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content #pwd:active {
            border: 1px solid #2d74f3;
          }
          .my-dialog-wrapper .dialog-wrapper .dialog-content #pwd:hover {
            border: 1px solid #2d74f3;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content #pwd::placeholder {
            color: #B4BCCC;
          }

          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-forget {
            text-align: right;
            font-size: 13px;
            color: #2A87FF;
            font-weight: 400;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-content .dialog-forget span{
            cursor: pointer;
          }

          .my-dialog-wrapper .dialog-wrapper .dialog-footer {
            height: 32px;
            width: 100%;
            padding: 0 24px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding-top: 36px;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-footer .cancel-btn {
            width: 70px;
            height: 32px;
            background: #FFFFFF;
            border: 1px solid #E8EBF2;
            box-shadow: 0 2px 6px 0 rgba(31, 35, 41, 0.06);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-footer .cancel-btn:hover {
            border: 1px solid #085ac7;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-footer .confirm-btn {
            width: 70px;
            height: 32px;
            color: white;
            border: 1px solid #328BFF;
            background: #328BFF;
            box-shadow: 0 4px 10px 0 rgba(69, 144, 255, 0.25);
            border-radius: 6px;
            cursor: pointer;
            margin-left: 10px;
            transition: all 0.2s ease;
            outline: none;
          }
        
          .my-dialog-wrapper .dialog-wrapper .dialog-footer .confirm-btn:hover {
            background-color: #085ac7;
            border: 1px solid #085ac7;
          }
        
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-100%);
            }
            to {
              opacity: 1;
            }
          }
          .icon-error,.icon-success {
            background: #F46160;
            width: 16px;
            height: 16px;
            display: inline-block;
            border-radius: 50%;
            color:#fff;
            text-align:center;
            margin-right:6px;
          }
          .icon-error {
            background: #F46160;
            box-shadow: 0 2px 4px 0 rgba(244, 97, 96, 0.30);
          }
          .icon-success {
            background: #5CC171;
            box-shadow: 0 2px 7px 0 rgba(92,193,113,0.30);
          }
          .color { color: #2D2F33;}
          #loginform{
            width:300px;
          margin:0 auto;
        }
          `
    document.querySelector('head').appendChild(style);
  }

  // 点击提交按钮后页面展示效果
  showTips(res) {
    let tipsContent = this.dialogEl.querySelector('.dialog-tips-box');
    let p = document.createElement('p');
    if (res.status == 'SUCCESS') {
      p.classList.add('tips-content');
      p.innerHTML = `<span class="icon-success">✓</span><p class="tips-content color">${res.message}</p>`
      tipsContent.appendChild(p);
      this.closeDialog()
    } else {
      p.classList.add('tips-content');
      p.innerHTML = `<span class="icon-error">✕</span><p class="tips-content">${res.message}</p>`
      tipsContent.appendChild(p);
    }
  }

  static showDialog() {

  }
}

window.passwordConfirm = passwordConfirm;