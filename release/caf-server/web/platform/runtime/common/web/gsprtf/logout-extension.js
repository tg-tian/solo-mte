/**
 * 注销扩展，注销前、注销后两个扩展点。
 * beforeLogout，务必用同步方法实现，不能带异步操作。beforeLogout return返回会默认执行框架的注销服务
 * arg 为事件参数，最基础的参数为 {sessionValid： true} or {sessionValid： false}，用于判断当前会话是否失效
 * 
 */

window.gsprtf = window.gsprtf || {};
gsprtf.logoutExt = gsprtf.logoutExt || {};

gsprtf.logoutExt = (function (logoutExt, win, $) {

    logoutExt.beforeLogout = function (arg) {

    }

    logoutExt.afterLogout = function (arg) {

    }

    return logoutExt;
})(gsprtf.logoutExt || {}, window, jQuery);