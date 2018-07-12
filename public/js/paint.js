//var socket = io.connect('localhost',{'forceNew':true});
var socket = io.connect('https://iotest-chat-iotest-chat.a3c1.starter-us-west-1.openshiftapps.com/',{'forceNew':true});
var px = [];
var py = [];
var pc = [];
var ps = [];
var pt = [];
var pn = [];

var mc = {};

var btn = false;
var cnt = 0;
var mn = 0;
var smp = false;
var rm = 0;

window.onload = function() {
	login();
	setInterval('main()',10);
	
	var ua = navigator.userAgent;
	if (ua.indexOf('iPhone') > 0 && ua.indexOf('iPad') == -1 || ua.indexOf('iPod') > 0 || ua.indexOf('Android') > 0) {
		smp = true;
	}
}

function login() {
	if (mc.a === undefined) {
		//色を決める
		var r = Math.floor(Math.random() * 255) + '';
		var g = Math.floor(Math.random() * 255) + '';
		var b = Math.floor(Math.random() * 255) + '';
		
		mc = {r:r,g:g,b:b};
	}
	
	$(function() {
		$('span#error').html('');
	});
	
	//サーバーにログインする
	socket.connect();
	//サーバーにログインしたことを伝える
	socket.emit('plogin');
}

//サーバーからのログインの通知
socket.on('pnum',function(n) {
	mn = n;
});

socket.on('pinum',function(rn) {
	rm = rn;
});

//サーバーからのログアウトの通知
socket.on('ponum',function(rn) {
	rm = rn;
});

//メインループ
function main() {
	paint();
	draw();
}

//描画
function paint() {
	canvas.onmousedown = function(e) {
		if (e.button == 0) {
			btn = true;
		}
	};
	
	canvas.onmousemove = function(e) {
		if (btn) {
			var x = e.layerX - 5;
			var y = e.layerY - 5;
			var s = false;
			
			if (cnt == 0) {
				s = true;
			}
			
			var c = mc;
			
			if (cnt % 3 == 0) {
				addPoint(x,y,s,c,mn);
			}
			
			if (cnt % 3 == 0) {
				dataSend(x,y,s,c,mn);
			}
			cnt++;
		}
	};
	
	canvas.onmouseup = function(e) {
		btn = false;
		cnt = 0;
	};
	
	//スマホ
	$(function() {
		$('canvas').bind('touchstart',function() {
			event.preventDefault();
		});
		
		$('canvas').bind('touchmove',function() {
			event.preventDefault();
				var x = event.changedTouches[0].pageX;
				var y = event.changedTouches[0].pageY;
				var s = false;
				
				if (cnt == 0) {
					s = true;
				}
				
				var c = mc;
				
				if (cnt % 50 == 0) {
					addPoint(x,y,s,c,mn);
				}
				
				if (cnt % 50 == 0) {
					dataSend(x,y,s,c,mn);
				}
				
				cnt++;
		});
	
		$('canvas').bind('touchend',function() {
			event.preventDefault();
			cnt = 0;
			$('canvas').unbind();
		});
	});
}

//描画データの送信
function dataSend(x,y,s,c,n) {
	socket.emit('psend',x,y,s,c,n);
}

//描画データの受信
socket.on('pdata',function(x,y,s,c,n) {
	if (n != mn) {
		addPoint(x,y,s,c,n);
	}
});

function addPoint(x,y,s,c,n) {
	px.push(x);
	py.push(y);
	ps.push(s);
	pc.push(c);
	pn.push(n);
	pt.push(1300);
}

//描画
function draw() {
	var canvas = document.getElementById('canvas');
	var ctx = canvas.getContext('2d');
	
	ctx.clearRect(0,0,canvas.width,canvas.height);
	var n = [];
	
	for (var i = 0;i < px.length;i++) {
		var un = pn[i];
		
		if (n[un] === undefined) n[un] = i;
		
		if (i == 0) {
			var r = pc[i].r;
			var g = pc[i].g;
			var b = pc[i].b;
			ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
			ctx.fillRect(px[i],py[i],0.5,0.5);
			n[un] = i;
		} else {
			if (ps[i] == true) {
				var r = pc[i].r;
				var g = pc[i].g;
				var b = pc[i].b;
				ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
				ctx.fillRect(px[i],py[i],0.5,0.5);
				n[un] = i;
			} else {
				ctx.beginPath();
				var r = pc[i].r;
				var g = pc[i].g;
				var b = pc[i].b;
				ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
				ctx.moveTo(px[n[un]],py[n[un]]);
				ctx.lineTo(px[i],py[i]);
				ctx.closePath();
				ctx.stroke();
				n[un] = i;
			}
		}		
		pt[i]--;
		
		if (pt[i] <= 0) {
			px.splice(i,1);
			py.splice(i,1);
			ps.splice(i,1);
			pc.splice(i,1);
			pt.splice(i,1);
			pn.splice(i,1);
		}
		
		if (px.length == 0) {
			px = [];
			py = [];
			ps = [];
			pc = [];
			pt = [];
			pn = [];
		}
	}

	//参加人数の描画
	ctx.font = '12px';
	ctx.fillStyle = '#000000';
	ctx.fillText('参加人数：' + rm + '人',12,12);

	canvas = null;
	ctx = null;
}

socket.on('disconnect',function() {
	$(function() {
		$('span#error').append('エラーが発生しました。<br>\n');
		$('span#error').append('<input type="button" id="reconnect" onclick="login()" value="再接続">');
	});
});
