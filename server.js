//必要なライブラリの読み込み
var express = require('express');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var crypto = require('crypto');
var fs = require('fs-extra');
var multer = require('multer');

//ユーザーとセッションIDを紐付けるための配列
var users = [];
var ssid = [];
var chattype = [];
var typing = [];

//メッセージログ
var msglog = [];
var cu = 0;

//お絵かきチャット
var pln = 0;
var rn = 0;

//バージョン
var ver = '2.3.1';

var app = express();

app.engine('ejs',ejs.renderFile);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
//httpsへのリダイレクト
app.use(function(req,res,next) {
	console.log(req.headers['x-forwarded-proto'].substring(0,4);
	if (req.headers.host == 'localhost:8080') {
		next();
	} else {
		var proto = req.headers['x-forwarded-proto'][0];
		if (proto !== undefined) {
			proto = proto.toLowerCase();
		}

		if (proto === 'https') {
			next();
		} else {
			res.redirect('https://' + req.headers.host + req.url);
		}
	}
});

var storage = multer.diskStorage({
	destination:function(req,file,cb) {
		cb(null,__dirname + '/public/uploads');
	},
	filename:function(req,file,cb) {
		var ext = file.mimetype.substr(6);
		if (ext == 'jpeg') ext = 'jpg';
		cb(null,(new Date()).getTime() + '.' + ext);
	}
});

var upload = multer({storage:storage});

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
//var ip = 'localhost';
var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

//require('socket.io')(app.listen(port,ip))としないとエラーが出る
var io = require('socket.io')(app.listen(port,ip));

app.get('/',function(req,res) {
	var ua = req.headers['user-agent'];
	if (ua.indexOf('iPhone') > 0 && ua.indexOf('iPad') == -1 || ua.indexOf('iPod') > 0 || ua.indexOf('Android') > 0) {
		res.render('schat.ejs',{});
	} else {
		res.render('chat.ejs',{});
	}
	res.end();
});

app.get('/paint',function(req,res) {
	res.render('paint.ejs',{});
	res.end();
});

var hbms = 10000;
io.set('heartbeat timeout',hbms);
io.set('heartbeat interval',hbms);

io.on('connection',function(socket) {
	socket.emit('members',cu);

	//ログインした時
	socket.on('login',function(name) {
		var sid = socket.id + '';
		var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
			ip = ip + '';
			var id = cid(ip);
				
			name = htmldisable(name);
			
			var nex = users.indexOf(name);
			
			if (nex == -1) {
				var date = dateGen();
				
				var loginmsg = '<div class="msg"><span class="dated">' + date + ' #</span>' + '<br>' + '<span style="color:#ff7f27;">' + name + '(' + id + ')' + 'さんが入室しました' + '</span></div>';
			
				//過去ログに記録
				msglog.push(loginmsg);
				
				//記録
				users.push(name);
				ssid.push(sid);
				chattype.push('chat');
				cu++;
			
				//入室
				socket.join('chat');
			
				io.to('chat').emit('msgPush',msglog);
				socket.emit('members',cu);
				socket.broadcast.emit('members',cu);
				
				//ログ
				console.log(date + ' logined ' + name + '(' + ip + ') ' + 'sid="' + sid + '"');
			} else {
				socket.emit('nameexist');
			}
		});
	
	//タイピング中
	socket.on('typing',function() {
		//セッションIDからユーザーを特定する
		var sid = socket.id + '';
		var n = ssid.indexOf(sid);

		var name = users[n];
		var dn = typing.indexOf(name);

		if (dn == -1) {
			typing.push(name);
		}

		io.to('chat').emit('typuser',typing,false);
	});

	//タイピングをやめた
	socket.on('stoptpi',function() {
		//セッションIDからユーザーを特定する
		var sid = socket.id + '';
		var n = ssid.indexOf(sid);

		var name = users[n];

		var dn = typing.indexOf(name);
		typing.splice(dn,1);
		
		io.to('chat').emit('typuser',typing,true);
	});

	//クライアントからのメッセージを受信した時
	socket.on('sendMsg',function(name,msg) {
		var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
		ip = ip + '';
		var id = cid(ip);
		
		name = htmldisable(name);
		
		//メッセージを処理する（日付を加える）
		var date = dateGen();
		
		//ログ
		console.log(date + ' msgPush msg = ' + msg + ' by ' + name + '(' + ip + ')');
		
		//改行を反映させる
		msg = msg.replace(/\r\n/g,'\n');
		msg = msg.replace(/\r/g,'\n');
		msg = msg.replace(/\n/g,'<br>');
		
		msg = '<div class="msg"><span class="dated">' + date + ' ' + name + '(' + id + ')' + '</span>' + '<br>' + msg + '</div>';
		
		//メッセージログに残す
		msglog.push(msg);
		
		//メッセージを配信する
		io.to('chat').emit('msgPush',msglog);
	});
	
	//退室
	socket.on('logout',function() {
		logout();
	});
	
	//クライアントが切断した時
	socket.on('disconnect',function() {
		//セッションIDを元にユーザーを特定する
		var sid = socket.id + '';
		var n = ssid.indexOf(sid);
		
		if (chattype[n] == 'paint') {
			plogout();
			socket.emit('disconnected');
		} else {
			logout();
		}
	});

	//退室、切断時の処理
	function logout() {
		//セッションIDを元にユーザーを特定する
		var sid = socket.id + '';
		var num = ssid.indexOf(sid);
		
		var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
		if (ip != null) {
			ip = ip + '';
			var id = cid(ip);
			
			var name = users[num];

			//入室しているユーザーが切断した時のみ表示させる
			if (num != -1) {
				name = htmldisable(name);
				
				var date = dateGen();
				
				var dismsg = '<div class="msg"><span class="dated">' + date + ' #</span>' + '<br>' + '<span style="color:#ff7f27;">' + name + '(' + id + ')' + 'さんが退室しました' + '</span></div>';
				msglog.push(dismsg);
				
				io.to('chat').emit('msgPush',msglog);
				socket.leave('chat');
				
				users.splice(num,1);
				ssid.splice(num,1);
				chattype.splice(num,1);
				cu--;
				socket.emit('members',cu);
				socket.broadcast.emit('members',cu);
			}
			
			//ユーザーが誰もいなくなったら、ログを削除する
			if (chattype.indexOf('chat') == -1) {
				msglog = [];
				cu = 0;
			}

			//画像フォルダ削除
			del_updir();

			console.log(date + ' ' + name + '(' + ip + ')' + 'disconnected sid="' + sid + '"');
			}
		}

	//お絵かきチャット
	socket.on('plogin',function() {
		socket.join('paint');
		var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
		console.log(dateGen() + ' ' + ip + ' paint login');
		
		var sid = socket.id + '';

		users.push('painter');
		ssid.push(sid);
		chattype.push('paint');

		pln++;
		rn++;
		

		//クライアントにログインしたことを伝える
		socket.emit('pnum',pln);
		//他のクライアントにも伝える
		io.to('paint').emit('pinum',rn);
	});
	
	function plogout() {
		var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
		console.log(dateGen() + ' ' + ip + ' paint logout');

		//セッションIDを元にユーザーを特定する
		var sid = socket.id + '';
		var num = ssid.indexOf(sid);
		
		users.splice(num,1);
		ssid.splice(num,1);
		chattype.splice(num,1);

		rn--;
		
		//他のクライアントにログアウトしたことを伝える
		io.to('paint').emit('ponum',rn);

		socket.leave('paint');
	}
	
	socket.on('psend',function(x,y,s,c,n) {
		io.to('paint').emit('pdata',x,y,s,c,n);
	});
	
	//エラー
	socket.on('error',function(reason) {
		console.error(reason,'Error!');
	});

});

app.get('/upload_files',function(req,res) {
	res.writeHead(200,{'Content-Type' : 'text/html'});
	res.end('ようこそ(´∀｀)b<br>ここには(・∀・)、<br>特に何もなし！(・_・)<br>があります(´・ω・`)');
});

//画像のアップロード
app.post('/upload_files',upload.single('imgfile'),function(req,res,next) {
	res.writeHead(200,{'Content-Type' : 'text/html; charset=utf-8'});
	console.log(req.file);
	if (req.file.mimetype.substr(0,5) != 'image') {
		fs.unlink(__dirname + '/public/uploads/' + req.file.filename,function(err) {
			if (err) throw err;
			console.log('Only Image File.');
		});
		res.end('<span style="color:#ff0000">画像ファイルのみアップロードできます。</span>');
	} else {
		var htx = '<img src=&quot;uploads/' + req.file.filename + '&quot;></img>';
		res.end('画像は<br>"uploads/' + req.file.filename + '"にアップロードされました。<br>' + 
			'<br><textarea>' + htx + '</textarea><br>' +
			'<br><a href="javascript.void(0)" onclick="window.close();return false;">閉じる</a>');
	}
});

//
app.get('/upload_page',function(req,res) {
	res.render('upload.ejs',{});
	res.end();
});

function htmldisable(str) {
	str = str.replace('<','&lt');
	str = str.replace('>','&gt');
	return str;
}

//日付を求める
function dateGen() {
	//時差を考慮する
	var serverTime = (new Date()).getTime();
	//グリニッジ標準時を求める
	var gmt = serverTime + (new Date()).getTimezoneOffset() * 60 * 1000;
	//日本時間を求める
	var nowDate = new Date(gmt + 9 * 60 * 60 * 1000);
	
	var year = nowDate.getFullYear();
	var month = nowDate.getMonth() + 1;
	var day = nowDate.getDate();
	var hour = nowDate.getHours();
	var min = nowDate.getMinutes();
	var sec = nowDate.getSeconds();
	
	if (min < 10) min = '0' + min;
	if (sec < 10) sec = '0' + sec;
	
	var ndateStr = year + '/' + month + '/' + day + ' ' + hour + ':' + min + ':' + sec;
	
	return ndateStr;
}

//IDを生成する
function cid(str) {
	//SHA-1の計算
	var sha1 = crypto.createHash('sha1');
	sha1.update(str,'utf8');
	str = sha1.digest('hex');
	str = str.substr(0,10);
	return str;
}

//メッセージの処理
function msgSyori(msgarray) {
	var msgs = "";
	
	for (var i = msgarray.length - 1;i >= 0; i--) {
		msgs += msgarray[i];
	}
	
	return msgs;
}

//アップロードフォルダの作成
function upload_dir() {	
	//作成
	fs.mkdir(__dirname + '/public/uploads',function(err) {
		if (err) {
			del_updir(); 
		} else {
			console.log('Make Directory');
		}
	});

}

//アップロードフォルダの削除
function del_updir() {
	fs.remove(__dirname + '/public/uploads',function(err) {
		if (err) throw err;
		console.log('Remove Directory');
		//再作成
		upload_dir();
	});
}

console.log('---Socket.IO Chat Ver.' + ver + '---' + '\n' + 'Server Running!');
console.log('Listenning IP/PORT: ' + ip + ' / ' + port);
upload_dir();
