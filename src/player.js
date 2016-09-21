var Worlds = require("./world").Worlds;
var Clients = require("./client").Clients;
var Loader = require("./loader").Loader;
var ChatboxMessage = require("./chatboxMessage").ChatboxMessage;
var Gamemode = require("./gamemodes");

var Database = require("./database").Database;



var UPDATE_INTERVAL = 100;

var PLAYER_SPRITES = [
	"neko_eiji"
	/*"neko",
	"neko_big",
	"neko_eiji"
	"car_test",
	"little",
	"bloc",
	"player",
	"wisp",
	"onclick",
	"mini_cube"*/
];



var Player = function(client, synchronizer) {

	this.world = null;
	this.entity = null;

	this.client = client;
	this.synchronizer = synchronizer;

	this.keys = {
		"Z": "UP",
		"Q": "LEFT",
		"S": "DOWN",
		"D": "RIGHT",
		"E": "ACTION1",
		"A": "ACTION2"
	};

	var player = this;
	this.client.addEventListener('delete', function() {
		player.clear();
	});

	this.eventsIds = {
		"world": {
			"removeEntity": null
		}
	};

	this.initMessagesHandler();



	this.jumpPower = 0.5;
	this.speed = 0.9;


	this.clientWorldOk = false;


	this.onNicknameOk = null;
	this.client.emit('askNickname',"");

};



/****************************
  PLAYER
****************************/

Player.prototype.clear = function() {
	if (this.entity && this.world) {
		this.broadcastToWorld('leave', JSON.stringify({
			"id": this.client.id
		}));
		var msgLeave = new ChatboxMessage();
		msgLeave.setType(ChatboxMessage.type.SERVER);
		msgLeave.setMsg(":world: :right: " + this.nickname + " left this world");
		msgLeave.setStyle(ChatboxMessage.style.LEAVE);
		this.broadcastToWorld('chatboxMessage', JSON.stringify(msgLeave));
	}
	if (this.entity) {
		if (this.world && this.entity === this.world.entities[this.entity.id]) this.removeEntity(this.world, this.entity.id);
		this.entity = null;
	}
	if (this.world) {
		this.world.removeEventListener("removeEntity", this.eventsIds["world"]["removeEntity"]);
		this.eventsIds["world"]["removeEntity"] = null;
		this.world.clientsId.splice(this.world.clientsId.indexOf(this.client.id),1);
		this.world.gamemode.onPlayerLeave(this);
	}
	this.world = null;
};





/****************************
  WORLD
****************************/

Player.prototype.goToWorld = function(worldId) {
	if (this.world !== null) this.clear();
	
	this.world = Worlds.get(worldId);

	if (this.world) {

		this.world.clientsId.push(this.client.id);

		this.initIntervals();

		this.clientWorldOk = false;

		var player = this;
		this.eventsIds["world"]["removeEntity"] = this.world.addEventListener("removeEntity", function(entityId) {
			player.clearEntityDistance(entityId);
		});

		var entityJSON = Loader.loadEntitySync(this.world.gamemode.getPlayerEntity(this), this.world.id);
		if (entityJSON instanceof Array) throw "Can't bind multiple entities to a player";
		entityJSON.x = this.world.spawn.x + Math.random() - 0.5;
		entityJSON.y = this.world.spawn.y + Math.random() - 0.5;
		if (!entityJSON.state) entityJSON.state = {};
		if (!entityJSON.state.angular) entityJSON.state.angular = {};
		entityJSON.state.angular.pos = (this.world.spawn.angle) ? this.world.spawn.angle : 0;
		this.entity = this.addEntity(this.world, entityJSON);
		this.entity.player = true;

		this.world.gamemode.onPlayerJoin(this);

		var players = {};
		var client;
		for (var id in this.world.clientsId) {
			client = Clients.get(this.world.clientsId[id]);
			players[client.id] = {
				"id": client.id,
				"nickname": client.data.player.nickname,
				"entityId": client.data.player.entity.id
			};
		}

		this.client.emit('defineWorld', JSON.stringify({
			"players": players,
			"world": this.world.export()
		}));

		this.broadcastToWorld('join', JSON.stringify({
			"id": this.client.id,
			"nickname": this.nickname,
			"entityId": this.entity.id
		}));

		var msgJoin = new ChatboxMessage();
		msgJoin.setType(ChatboxMessage.type.SERVER);
		msgJoin.setMsg(":world: :left: " + this.nickname + " joined this world");
		msgJoin.setStyle(ChatboxMessage.style.JOIN);
		this.broadcastToWorld('chatboxMessage', JSON.stringify(msgJoin));
	}
	else this.world = null;
};

Player.prototype.broadcastToWorld = function(type, content, self) {
	if (this.world) {
		var client;
		for (var id in this.world.clientsId) {
			client = Clients.get(this.world.clientsId[id]);
			if (client != this.client || self) client.emit(type, content);
		}
	}
};






/****************************
  ENTITY
****************************/

Player.prototype.addEntity = function(world, properties) {
	var entity = world.addEntity(properties);
	//Clients.broadcast('entity', JSON.stringify(entity.export()));
	this.broadcastToWorld('world', JSON.stringify(world.export()));
	return entity;
};

Player.prototype.removeEntity = function(world, entityId) {
	this.world.removeEntity(entityId);
	this.broadcastToWorld('removeEntity', JSON.stringify(entityId));
};




/****************************
  MESSAGES HANDLER
****************************/

Player.prototype.initMessagesHandler = function() {
	var player = this;
	this.client.addSocketEvent('nickname', function(client, content) {player.setNickname(content);});
	this.client.addSocketEvent('mousedown', function(client, content) {player.mouseDown(content);});
	this.client.addSocketEvent('keydown', function(client, content) {player.keyDown(content);});
	this.client.addSocketEvent('keyup', function(client, content) {player.keyUp(content);});
	this.client.addSocketEvent('restartWorld', function(client, content) {player.restartWorld(content);});
	this.client.addSocketEvent('request', function(client, content) {player.requests(content);});
	this.client.addSocketEvent('player', function(client, content) {player.player(content);});
	this.client.addSocketEvent('chatboxMessage', function(client, content) {player.chatboxMessage(content);});
	this.client.addSocketEvent('changeKeys', function(client, content) {player.changeKeys(content);});
}

Player.prototype.setNickname = function(content) {
	var parse = JSON.parse(content);
	var nickname = parse.nickname;
	var askedWorld = ((parse.world) ? parse.world.toLowerCase() : null);
	if (typeof nickname !== "string") {
		this.client.emit('askNickname',"NOT_A_STRING");
	}
	else if (nickname.length === 0) this.client.emit('askNickname',"TOO_SHORT");
	else {
		if (nickname.length > 25) nickname = nickname.substr(0,25);
		this.nickname = nickname;
		if (this.onNicknameOk) this.onNicknameOk(askedWorld);
	}
};

Player.prototype.mouseDown = function(content) {
	if (this.world) {
		var mousePosition = JSON.parse(content);
		var entityJSON = Loader.loadEntitySync(/*"onclick"*/"car_test");
		entityJSON.x = mousePosition.x;
		entityJSON.y = mousePosition.y;
		//this.addEntity(world, entityJSON);
	}
};

Player.prototype.keyDown = function(content) {
	var data = JSON.parse(content);
	var key = data.key;
	var entity = data.entity;
	/*if (keys[key] == "UP") this.jump(entity);
	else if (keys[key] == "LEFT") this.roll("left", entity);
	else if (keys[key] == "RIGHT") this.roll("right", entity);*/
	if (this.world) {
		this.player(entity);
		if (this.keys[key]) {
			this.world.playerActionStart(this.keys[key], this);
			this.broadcastToWorld('entity', JSON.stringify(this.entity.export()));
		}
		else this.world.keyDown(key, this);

		/*else if (key == "O") {
			this.entity.physicsBody.state.pos.y = -2200;
			this.entity.physicsBody.state.old.pos.y = -2200;
			this.broadcastToWorld('entity', JSON.stringify(this.entity.export()));
		}*/
	}
};

Player.prototype.keyUp = function(content) {
	var data = JSON.parse(content);
	var key = data.key;
	var entity = data.entity;
	/*if (keys[key] == "UP") {}
	else if (keys[key] == "LEFT") this.stopRoll("left", entity);
	else if (keys[key] == "RIGHT") this.stopRoll("right", entity);*/
	if (this.world) {
		this.player(entity);
		if (this.keys[key]) {
			this.world.playerActionStop(this.keys[key], this);
			this.broadcastToWorld('entity', JSON.stringify(this.entity.export()));
		}
		else this.world.keyUp(key, this);
	}
};

Player.prototype.restartWorld = function(content) {
	if (this.world) {
		var worldId = this.world.id;
		var clientsId = this.world.clientsId.slice(0, this.world.clientsId.length);
		for (var id in clientsId) {
			Clients.get(clientsId[id]).data.player.clear();
		}
		Worlds.delete(worldId);
		for (var id in clientsId) {
			Clients.get(clientsId[id]).data.player.goToWorld(worldId);
		}
	}
};

Player.prototype.requests = function(content) {
	var request = JSON.parse(content);
	if (request == "definePlayer") {
		if (this.entity) {
			this.clientWorldOk = true;
			this.client.emit('definePlayer', JSON.stringify({
				"entity": this.entity.export(),
				"jumpPower": this.jumpPower,
				"speed": this.speed
			}));
		}
		else {
			this.client.emit("error", JSON.stringify("The player entity does not exist yet."));
		}
	}
};

Player.prototype.player = function(content) {
	if (this.entity != null && this.clientWorldOk) {
		try {
			var player;
			var worldId;
			if (typeof content == "string") {
				var parse = JSON.parse(content);
				player = parse.player;
				worldId = parse.worldId;
			}
			else player = content;
			if (worldId == undefined || worldId == this.world.id) this.entity.update({state: player.state});
		}
		catch(e) {
			console.log(e);
		}
	}
};

Player.prototype.chatboxMessage = function(content) {
	var message = JSON.parse(content);
	if (typeof message == "string") {
		if (message.substr(0,1) == "/") {
			var command = message.substr(1).split(" ");
			if (command[0] == "world") {
				try {
					if (!Worlds.get(command[1])) {
						throw "Can't find world " + command[1];
					}
					var msgWorldChange = new ChatboxMessage();
					msgWorldChange.setType(ChatboxMessage.type.OBJECT);
					msgWorldChange.setMsg("Going to world " + command[1]);
					msgWorldChange.setColor(ChatboxMessage.color.SUCCESS);
					msgWorldChange.setNickname("World");
					this.client.emit('chatboxMessage', JSON.stringify(msgWorldChange));
					this.goToWorld(command[1]);
				}
				catch (e) {
					console.log(e.message);
					var msgWorldChange = new ChatboxMessage();
					msgWorldChange.setType(ChatboxMessage.type.OBJECT);
					msgWorldChange.setMsg("Can't find world " + command[1]);
					msgWorldChange.setColor(ChatboxMessage.color.ERROR);
					msgWorldChange.setNickname("World");
					this.client.emit('chatboxMessage', JSON.stringify(msgWorldChange));
				}
			}
			else if (command[0] == "add") {
				if (this.world) {
					var pelottes = [
						"pelotte_blue",
						"pelotte_cyan",
						"pelotte_green",
						"pelotte_orange",
						"pelotte_pink",
						"pelotte_red"
					];
					var entityJSON = Loader.loadEntitySync(pelottes[Math.floor(Math.random()*pelottes.length)]);
					entityJSON.x = this.world.spawn.x + Math.random() - 0.5;
					entityJSON.y = this.world.spawn.y + Math.random() - 0.5;
					if (!entityJSON.options) entityJSON.options = {};
					entityJSON.options.angle = (this.world.spawn.angle) ? this.world.spawn.angle : 0;
					this.addEntity(this.world, entityJSON);
				}
			}
			else if (command[0] == "test") {
				var player = this;
				Database.getCount(function(count) {
					var msg = new ChatboxMessage();
					msg.setType(ChatboxMessage.type.SERVER);
					msg.setMsg("DEBUG " + count);
					msg.setColor({r: 200, g: 150, b: 240});
					player.broadcastToWorld("chatboxMessage", JSON.stringify(msg));
					player.client.emit("chatboxMessage", JSON.stringify(msg));
				});
			}
		}
		else {
			var msg = new ChatboxMessage();
			msg.setType(ChatboxMessage.type.USER);
			msg.setMsg(message);
			msg.setColor({r: 60, g: 150, b: 255});
			msg.setNickname(this.nickname);
			this.broadcastToWorld("chatboxMessage", JSON.stringify(msg));
			this.client.emit("chatboxMessage", JSON.stringify(msg));
		}
	}
};

Player.prototype.changeKeys = function(content) {
	this.keys = JSON.parse(content);
};




/****************************
  INTERVALS
****************************/

Player.prototype.initIntervals = function(client) {

	this.intVars = {
		"entitiesDistance": {
			"short": {
			},
			"medium": {
			},
			"semifar": {
			}
		},

		"thresholds": {
			"short": 1000,
			"medium": 2800,
			"semifar": 5000
		},

		"recalc": {
			"short": 24,
			"medium": 8,
			"semifar": 8,
			"far": 40
		},

		"update": {
			"short": 5,
			"medium": 5,
			"semifar": 0,
			"far": 0 // 0 for never
		},

		"count": 0
	};

	var player = this;

	this.client.clearInterval("worldUpdate");
	this.client.setInterval("worldUpdate", function(client) {
		player.recalcDistanceInterval();
	}, UPDATE_INTERVAL);

};

Player.prototype.recalcDistanceInterval = function() { // will recalc short and medium more often than far

	if (this.world && this.entity) {
		var dist;

		var entities = {};

		// Add to entities the entitites that need to be recalculated
		if (this.intVars.count % this.intVars.recalc.far == 0) {
			entities = this.world.entities;
		}
		else {
			if (this.intVars.count % this.intVars.recalc.semifar == 0) {
				for (var idE in this.intVars.entitiesDistance.semifar) {
					entities[idE] = this.intVars.entitiesDistance.semifar[idE];
					delete this.intVars.entitiesDistance.semifar[idE];
				}
			}
			if (this.intVars.count % this.intVars.recalc.medium == 0) {
				for (var idE in this.intVars.entitiesDistance.medium) {
					entities[idE] = this.intVars.entitiesDistance.medium[idE];
					delete this.intVars.entitiesDistance.medium[idE];
				}
			}
			if (this.intVars.count % this.intVars.recalc.short == 0) {
				for (var idE in this.intVars.entitiesDistance.short) {
					entities[idE] = this.intVars.entitiesDistance.short[idE];
					delete this.intVars.entitiesDistance.short[idE];
				}
			}
		}

		for (var idE in entities) {
			dist = this.distFromEntity(entities[idE]);
			if (dist < this.intVars.thresholds.short) {
				this.intVars.entitiesDistance.short[idE] = entities[idE];
			}
			else if (dist < this.intVars.thresholds.medium) {
				this.intVars.entitiesDistance.medium[idE] = entities[idE];
			}
			else if (dist < this.intVars.thresholds.semifar) {
				this.intVars.entitiesDistance.semifar[idE] = entities[idE];
			}
		}

		if (this.intVars.count % this.intVars.update.far == 0) this.worldUpdateInterval("far");
		else if (this.intVars.count % this.intVars.update.semifar == 0) this.worldUpdateInterval("semifar");
		else if (this.intVars.count % this.intVars.update.medium == 0) this.worldUpdateInterval("medium");
		else if (this.intVars.count % this.intVars.update.short == 0) this.worldUpdateInterval("short");

		this.intVars.count++;
	}
};
Player.prototype.distFromEntity = function(entity) { // possible optimization : if aabb < ? use only x & y
	var playerEntity = this.entity;

	if (entity == playerEntity) return 0;

	var pPos = playerEntity.getPos();
	var ePos = entity.getPos();

	var dx = ePos.x - pPos.x;
	var dy = ePos.y - pPos.y;

	if (entity.type == "Decoration") {
		return Math.sqrt(dx * dx + dy * dy);
	}
	else {
		var aabbPlayer = playerEntity.physicsBody.aabb();
		var aabbEntity = entity.physicsBody.aabb();

		var aabbdx = (aabbEntity.x - aabbEntity.hw * Math.sign(dx)) - (aabbPlayer.x + aabbPlayer.hw * Math.sign(dx));
		var aabbdy = (aabbEntity.y - aabbEntity.hh * Math.sign(dy)) - (aabbPlayer.y + aabbPlayer.hh * Math.sign(dy));

		if (aabbdx * Math.sign(dx) < 0 && aabbdy * Math.sign(dy) < 0) return 0;
		else if (aabbdx * Math.sign(dx) < 0) return Math.abs(aabbdy);
		else if (aabbdy * Math.sign(dy) < 0) return Math.abs(aabbdx);

		return Math.sqrt(aabbdx * aabbdx + aabbdy * aabbdy);
	}
};

Player.prototype.clearEntityDistance = function(entityId) {
	if (this.intVars.entitiesDistance.short[entityId]) delete this.intVars.entitiesDistance.short[entityId];
	if (this.intVars.entitiesDistance.medium[entityId]) delete this.intVars.entitiesDistance.medium[entityId];
	if (this.intVars.entitiesDistance.semifar[entityId]) delete this.intVars.entitiesDistance.semifar[entityId];
};

Player.prototype.worldUpdateInterval = function(range) {

	if (this.world) {

		var entities = {};

		if (range == "far") {
			entities = this.world.export().entities;
		}

		if (range == "semifar") {
			for (var id in this.intVars.entitiesDistance.semifar) {
				entities[id] = this.intVars.entitiesDistance.semifar[id].export();
			}
		}

		if (range == "medium" || range == "semifar") {
			for (var id in this.intVars.entitiesDistance.medium) {
				entities[id] = this.intVars.entitiesDistance.medium[id].export();
			}
		}

		if (range == "short" || range == "medium" || range == "semifar") {
			for (var id in this.intVars.entitiesDistance.short) {
				entities[id] = this.intVars.entitiesDistance.short[id].export();
			}
		}

		delete entities[this.entity.id];

		this.client.emit('world', JSON.stringify({
			"id": this.world.id,
			"entities": entities
		}));

	}

};







exports.Player = Player;




// Lib

function toAngleDist(pos) {
	if (pos.x != 0 || pos.y != 0) {
		var dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
		var angle = Math.acos(pos.x / dist);
		if (pos.y < 0) angle = -angle;
		return {
			angle: angle,
			dist: dist
		};
	}
	else {
		return {
			angle: 0,
			dist: 0
		};
	}
}

function toXY(angleDist) {
	var x = Math.cos(angleDist.angle) * angleDist.dist;
	var y = Math.sin(angleDist.angle) * angleDist.dist;
	return {
		x: x,
		y: y
	};
}

function rotatePoint(x, y, angle, centerX, centerY) { // http://stackoverflow.com/questions/11332188/javascript-rotation-translation-function
	x -= centerX;
	y -= centerY;
	var point = {};
	point.x = x * Math.cos(angle) - y * Math.sin(angle);
	point.y = x * Math.sin(angle) + y * Math.cos(angle);
	point.x += centerX;
	point.y += centerY;
	return point;
}

function inArray(needle, haystack) {
    for (var id in haystack) {
        if (haystack[id] == needle) return true;
    }
    return false;
}
