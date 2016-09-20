var ChatboxMessage = function() {
	this.msg = "";
	this.nickname = "";
	this.color = {
		r: 255,
		g: 255,
		b: 255
	};
	this.type = 0;
	this.style = ChatboxMessage.style.NORMAL;
};

ChatboxMessage.type = {
	OBJECT: 0,
	USER: 1,
	SERVER: 2
};

ChatboxMessage.style = {
	NORMAL: "",
	JOIN: "messageJoin",
	LEAVE: "messageLeave",
	WELCOME: "messageWelcome"
};

ChatboxMessage.color = {
	SUCCESS: {r: 30, g: 200, b: 30},
	ERROR: {r: 220, g: 30, b: 30}
};



ChatboxMessage.prototype.setMsg = function(msg) {
	this.msg = msg;
};

ChatboxMessage.prototype.setNickname = function(nickname) {
	this.nickname = nickname;
};

ChatboxMessage.prototype.setColor = function(color) {
	this.color = color;
};

ChatboxMessage.prototype.setType = function(type) {
	this.type = type;
};

ChatboxMessage.prototype.setStyle = function(style) {
	this.style = style;
};



exports.ChatboxMessage = ChatboxMessage;