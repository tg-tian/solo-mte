var url_xp = "";
var url_wiw32 = "";
var url_win64 = "";
window.onload = function () {
    var OSType = checkOS();
    doBrowser(OSType);
}


function doBrowser(osType) {
    if (osType == "A_1") {
        document.getElementById("browser_info").innerHTML = "如果您已安装了火狐浏览器52.9版本，请使用并体验最佳效果。";
        document.getElementById("winXP_col").style.display = "flex";
    }

    else if (osType == "A_2") {
        document.getElementById("browser_info").innerHTML = "如果您已安装了谷歌浏览器80以上版本，请使用并体验最佳效果。";
        var cpu = getCPU();
        switch (cpu) {
            case "x_A2":
                document.getElementById("win_col_32").style.display = "inline";
                break;
            case "x_A1":
            default:
                document.getElementById("win_col_64").style.display = "inline";
                break;
        }
        document.getElementById("win_col").style.display = "flex";
    }
}

// 判断操作系统 
function checkOS() {
    var os = navigator.platform;
    var userAgent = navigator.userAgent;

    if (os.indexOf("Win") > -1) {
        if (userAgent.indexOf("Windows NT 5.1") > -1) {
            // XP系统返回type=A_1，用火狐浏览器
            return "A_1";
        }
        else {
            // 除XP系统返回type=A_2，用谷歌浏览器
            return "A_2";
        }
    }
    else if (os.indexOf("Mac") > -1) {
        return "A_2";
    } else if (os.indexOf("X11") > -1) {
        return "B_1";
    } else if (os.indexOf("Linux") > -1) {
        return "B_2";
    } else {
        return "C_1";
    }
}

// 检查×86、×64
function getCPU() {
    var agent = navigator.userAgent.toLowerCase();
    if (agent.indexOf("win64") >= 0 || agent.indexOf("wow64") >= 0)
        return "x_A1";
    else
        return "x_A2"
}

function download_xp() {
    document.getElementById("download_name").src = "./platform/runtime/sys/web/assets/img/download_firefox.jpg"
    document.getElementById("model-pan").style.display = "block";
    window.open(url_xp, '_self');
}

function download_win32() {
    document.getElementById("download_name").src = "./platform/runtime/sys/web/assets/img/download_chrome.jpg"
    document.getElementById("model-pan").style.display = "block";
    window.open(url_win32, '_self');
}

function download_win64() {
    document.getElementById("download_name").src = "./platform/runtime/sys/web/assets/img/download_chrome.jpg"
    document.getElementById("model-pan").style.display = "block";
    window.open(url_win64, '_self');
}

function callBack(event) {
    if (event.target.id == "model-pan")
        document.getElementById("model-pan").style.display = "none";
}