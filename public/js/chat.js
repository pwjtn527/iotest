//0:未入室,1:入室
var mode = 0;
//未読
var mc = -1;
//var socket = io.connect('localhost:3000',{'forceNew':true});
var socket = io.connect('https://iotest.glitch.me/',{'forceNew':true});
var ua = navigator.userAgent;
var uan = 0;
var type = false;

$(function() {
if (ua.indexOf('iPhone') > 0 && ua.indexOf('iPad') == -1 || ua.indexOf('iPod') > 0 || ua.indexOf('Android') > 0) {
	$('body').css('padding','50 15 140 15');
	uan = 1;
}

$("#message").blur(function() {
	socket.emit('stoptpi');
	type = false;
});

$("#message").keyup(function() {
	if (type == false) {
		socket.emit('typing');
		type = true;
	}
});
});

function login() {
	var name = document.getElementById("name").value;
	
	if (mode == 0) {
		if (name != "") {
			//サーバに接続する
			socket.connect();
			
			//切断による退出の検出を速くする
			socket.heartbeatTimeout = 5000;
			
			//HTMLの操作
			$(function() {
				$('#send').removeAttr('disabled');
				$('#login').attr('value','退室');
				$('#message').removeAttr('disabled');
				$('#name').attr('disabled','disabled');
				$('a#upload').attr('style','display:inline');
				$('#error').html('');
			});
			
			//モード切り替え
			mode = 1;
			
			//サーバーに入室したことを伝える
			socket.emit('login',name);
		}
	} else if (mode == 1) {
			//HTMLの操作
			$(function() {
				$('#send').attr('disabled','disabled');
				$('#login').attr('value','入室');
				$('#message').attr('disabled','disabled');
				$('#message').attr('value','');
				$('a#upload').attr('style','display:none');
				$('#name').removeAttr('disabled');
				$("#message").val('');
			});
			
			//モード切り替え
			mode = 0;
			mc = -1;
			
			notice(p = false);
			
			//サーバーに退室したことを伝える
			socket.emit('logout');
	}
}

//メッセージを送信
function sendMsg() {
	if (mode == 1) {
		var name = document.getElementById("name").value;
		var msg = document.getElementById("message").value;
		
		if (msg != "") {
			//連投防止
			document.getElementById("message").value = "";
			mc = 0;

			//メッセージを送信する
			socket.emit('sendMsg',name,msg);
		}
		
		if (uan == 0) {
			//テキストエリアにフォーカスを移す
			document.getElementById("message").focus();
		}

		scrool();

		notice(p = false);
	}
}

//メッセージを受信
socket.on('msgPush',function(msglog) {
	if (mode == 1) {
		console.log(msglog);
		$(function() {
			var msgs = '';
			//PC
			if (uan == 0) {
				var i = msglog.length - 1;
				while(i >= 0) {
					msgs += msglog[i];				
					i--;
				}
			} else {
				var i = 0;
				while(i < msglog.length) {
					msgs += msglog[i];				
					i++;
				}
			}
			$('#msgs').html(msgs);
		});
		
		scrool();

		notice(p = true);
	}
});

//切断
socket.on('disconnect',function() {
	if (mode == 1) {
		login();
		$(function() {
			$('#error').html('エラーが発生しました。もう一度やり直してください。');
			$('#error').css('color','red');
		});
	};
});

//入室人数
socket.on('members',function(cu) {
	//PC版でのみ表示
	if (uan == 0) {
		$('span#members').html('入室：' + cu + '人');
	}
});

//タイピング中の通知
socket.on('typuser',function(typing,stop) {
	var typmsg = '';
	var i = 0;
	while(i < typing.length) {
		if (i == 0) {
			if (typing.length == 1) {
				typmsg = typing[i] + ' is typing...';
			} else {
				typmsg = typing[i];
			}
		} else {
			typmsg += ' & ' + typing[i] + ' are typing...';
		}

		i++;
	}

	$("#typing").html(typmsg);

	if (type == false && stop == false) {
		scrool();
	}
});

//通知
function notice(p) {
	if (p) {
		mc++;
	} else {
		mc--;
	}
	
	if (mc <= 0) {
		document.title = 'Socket.IO テスト';
		$(function() {
			$('#favicon').remove();
			$('meta:last').after($(document.createElement('link')).attr('rel','shortcut icon').attr('id','favicon').attr('href','./imgs/favicon.ico'));
		});
	} else {
		document.title = '(' + mc + ')' + 'Socket.IO テスト';
		$(function() {
			$('#favicon').remove();
			$('meta:last').after($(document.createElement('link')).attr('rel','shortcut icon').attr('id','favicon').attr('href','./imgs/favicon2.ico'));
		});
	}
};

//入室エラー
socket.on('nameexist',function() {
	login();
	$("#error").css('color','red');
	$("#error").html('入室できませんでした。<br>その名前は使えません。');
});

//スマホ版でのオートスクロール
function scrool() {
	if (uan == 1) {
		$('html,body').animate({scrollTop:($("#msgs").height() + $("#typing").height())},'fast');
	}
}
