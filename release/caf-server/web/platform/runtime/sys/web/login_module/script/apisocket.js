/*
*	北京天威诚信电子商务服务有限公司
*	2019/05/15
*
*	ApiSocket接口类似于WebSocket
*	new ApiSocket("itrus")
*	new ApiSocket("itrus_exeapi")
*	new ApiSocket("itrus5")
*
*	apisock.retry = 1; // 设置重试端口次数
*/


/*

应用程序引用apisocket.js示例如下：

<!-- ApiSocket begin -->
<script language="javascript">
var ukeyadminCodeBase="itrusukeyadmin.cab#version=3,1,19,823";
</script>
<script src="apisocket.js"></script>
<!-- ApiSocket end -->

*/

// IE 浏览器时，采用ActiveX插件
//if(!!window.ActiveXObject || "ActiveXObject" in window)
if(!window.WebSocket){"undefined"==typeof ukeyadminCodeBase&&(ukeyadminCodeBase="itrusukeyadmin.cab");var objstr='\x3cOBJECT id\x3d"ukeyadmin" style\x3d"height:0px;width:0px;" classid\x3d"clsid:05395F06-244C-4599-A359-5F442B857C28" codeBase\x3d"'+ukeyadminCodeBase+'"\x3e\x3c/OBJECT\x3e';document.write(objstr)}function ApiSocket(f){var e=f.split("_");1<e.length&&(f=e[0]);this.exeapi=0;1<e.length&&"exeapi"==e[1]&&(this.exeapi=1);this.ishttps="https:"==document.location.protocol;this.ishtml5=!!window.WebSocket;var c=document.getElementById("ukeyadmin");this.iscab=null!=c&&"undefined"!=typeof c&&"undefined"!=typeof c.object&&4==c.readyState;this.name="ApiSocket "+f;this.ixintype=""+f;this.sendcount=0;this.bindreq=function(a){return{cmd:"bind",keytype:a,exeapi:this.exeapi,location:window.location.href,userAgent:navigator.userAgent}};if(this.ishtml5){var g="localhost";-1<navigator.userAgent.indexOf("Edge")&&(g="localhost.itrus.com.cn");if(window.ActiveXObject||"ActiveXObject"in window)g="localhost.itrus.com.cn";this.ports=this.ishttps?[18132,18134,18136,18138]:[18131,18133,18135,18137];"itrus5"==f&&(this.ports=this.ishttps?[18162,18164,18166,18168]:[18161,18163,18165,18167]);var d="";if(e=window.crypto||window.msCrypto){var h=new Uint32Array(4);e.getRandomValues(h);d+=""+h[0];d+=""+h[1];d+=""+h[2];d+=""+h[3]}else d+=""+Math.random(),d+=""+Math.random(),d+=""+Math.random(),d+=""+Math.random(),d=d.replace(".","");this.retry=this.ports.length;var a=this;this.portidx=0;e="ws://";a.ishttps&&(e="wss://");e+=g+":"+a.ports[this.portidx]+"/ApiSocket";a.exeapi&&(e+="ExeApi");var k=!1;a.websocket=new window.WebSocket(e+("/"+d));a.close=function(b,c){a.websocket&&a.websocket.close(b,c);a.websocket=null};a.websocket.onopen=function(b){k=!0;if(a.onopen)a.onopen(b)};a.websocket.onclose=function(b){if(k&&a.onclose)a.onclose(b)};a.websocket.onmessage=function(b){if(a.onmessage)a.onmessage(b)};a.websocket.onerror=function(b){if("error"==b.type){if(a.websocket=null,a.onerror)a.onerror(b)}else this.portidx++,b="ws://",a.ishttps&&(b="wss://"),b+=g+":"+a.ports[this.portidx]+"/ApiSocket",a.exeapi&&(b+="ExeApi"),b+="/"+d,a.websocket=new WebSocket(b),a.websocket.onopen=this.onopen,a.websocket.onclose=this.onclose,a.websocket.onmessage=this.onmessage,a.websocket.onerror=this.onerror};a.send=function(b){if(a.websocket)a.websocket.send(b),a.sendcount++,1==a.sendcount&&setTimeout(function(){a.websocket.send(b)},100);else if(a.onerror)a.onerror({apiSockError:"No websocket!"})};a.call=function(b){if(a.websocket){a.sendcount++;var c="http://";a.ishttps&&(c="https://");c+=g+":"+a.ports[this.portidx]+"/ApiSocket";a.exeapi&&(c+="ExeApi");c+="/"+d;xmlhttp=new XMLHttpRequest;xmlhttp.open("POST",c,!1);xmlhttp.send(b);return{data:xmlhttp.responseText,isHttp:!0}}if(a.onerror)a.onerror({apiSockError:"No websocket!"})}}else this.iscab?(a=this,setTimeout(function(){a.socktype="itrusWebSocket";"itrus5"==f&&(a.socktype="iTrus5-TCP");var b=c.msgconnect(a.socktype);if(1E4>b){if(a.onerror)a.onerror({isItrus:!0,apiSockError:"msgconnect failure: "+b})}else{a.connectid=b;if(a.onopen)a.onopen({isItrus:!0,connectid:a.connectid});var d=setInterval(function(){if(a.connectid){var b=c.msgrecv(a.connectid),b=""+b;if(""!=b)if(0==b.indexOf("__ERROR:")){c.msgclose(a.connectid);a.connectid=0;if(a.onerror)a.onerror({isItrus:!0,apiSockError:"msgrecv error, ret \x3d "+b});if(a.onclose)a.onclose({isItrus:!0,apiSockError:"msgrecv error, ret \x3d "+b})}else a.onmessage({isItrus:!0,data:b})}else clearInterval(d),d=0},180)}},0),a.send=function(b){if(a.connectid)if(0==c.msgsend(a.connectid,b))a.sendcount++,1==a.sendcount&&setTimeout(function(){c.msgsend(a.connectid,b)},100);else{if(a.onerror)a.onerror({isItrus:!0,apiSockError:"sendError!"});if(a.onclose)a.onclose({isItrus:!0,apiSockError:"connClose!"});a.connectid=0}else if(a.onerror)a.onerror({isItrus:!0,apiSockError:"No connectid!"})},a.call=function(b){if(!a.connectid){if(a.onerror)a.onerror({isItrus:!0,apiSockError:"No connectid!"});return""}if(0!=c.msgsend(a.connectid,b)){if(a.onerror)a.onerror({isItrus:!0,apiSockError:"sendError!"});if(a.onclose)a.onclose({isItrus:!0,apiSockError:"connClose!"})}else{for(a.sendcount++;""==(b=c.msgrecv(a.connectid)););if(0==b.indexOf("__ERROR:")){c.msgclose(a.connectid);a.connectid=0;if(a.onerror)a.onerror({isItrus:!0,apiSockError:"msgrecv error, ret \x3d "+b});if(a.onclose)a.onclose({isItrus:!0,apiSockError:"msgrecv error, ret \x3d "+b});return""}return{isItrus:!0,data:b}}},a.close=function(b,d){a.connectid&&c.msgclose(a.connectid);a.connectid=0}):(a=this,setTimeout(function(){if(a.onerror)a.onerror({isItrus:!0,apiSockError:"connect failure! no websocket, no cab"})},0))};