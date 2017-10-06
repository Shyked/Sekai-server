var Worlds = require("./world").Worlds;
var Clients = require("./client").Clients;
var Loader = require("./loader").Loader;
var ChatboxMessage = require("./chatboxMessage").ChatboxMessage;
var Gamemode = require("./gamemodes");

var Redis = require("./redis").Redis;
var Users = require("./user").Users;



var UPDATE_INTERVAL = 100;



var Player = function(client, synchronizer) {

	this.world = null;
	this.entity = null;

	this.user = null;

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

	this.client.data.player = this;

	var player = this;
	this.client.addEventListener('delete', function() {
		player.clear();
	});

	this.eventsIds = {
		"world": {
			"removeEntity": [],
			"addEntity": []
		}
	};

	this.initMessagesHandler();



	this.jumpPower = 0.5;
	this.speed = 0.9;


	this.clientWorldOk = false;


	this.client.emit('askNickname',"");

};



/****************************
  PLAYER
****************************/

Player.prototype.init = function(askedWorld) {
	this.goToWorld(askedWorld || this.synchronizer.startingWorldId);
	var msgWelcome = new ChatboxMessage();
	msgWelcome.setType(ChatboxMessage.type.SERVER);
	msgWelcome.setMsg("Welcome in Sekai, " + this.getNickname() + "!");
	msgWelcome.setStyle(ChatboxMessage.style.WELCOME);
	this.client.emit('chatboxMessage', msgWelcome);
};


Player.prototype.clear = function() {
	if (this.entity && this.world) {
		this.broadcastToWorld('leave', {
			"id": this.client.id
		});
		var msgLeave = new ChatboxMessage();
		msgLeave.setType(ChatboxMessage.type.SERVER);
		msgLeave.setMsg(":world: :right: " + this.getNickname() + " left this world");
		msgLeave.setStyle(ChatboxMessage.style.LEAVE);
		this.broadcastToWorld('chatboxMessage', msgLeave);
	}
	if (this.entity) {
		if (this.world && this.entity === this.world.entities[this.entity.id]) this.removeEntity(this.world, this.entity.id);
		this.entity = null;
	}
	if (this.world) {
		for (var idE in this.eventsIds["world"]) {
			while (this.eventsIds["world"][idE][0]) {
				this.world.removeEventListener(idE, this.eventsIds["world"][idE][0]);
				this.eventsIds["world"][idE].splice(0, 1);
			}
		}
		this.world.clientsId.splice(this.world.clientsId.indexOf(this.client.id),1);
		this.world.gamemode.onPlayerLeave(this);
	}
	this.client.clearInterval("worldUpdate");
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
		this.eventsIds["world"]["removeEntity"].push(this.world.addEventListener("removeEntity", function(entityId) {
			player.clearEntityDistance(entityId);
		}));

		var entityHash = Loader.loadEntityFileSync(this.world.gamemode.getPlayerEntity(this), this.world.id)[0];
		if (entityHash instanceof Array) throw "Can't bind multiple entities to a player";
		entityHash.x = this.world.spawn.x + Math.random() - 0.5;
		entityHash.y = this.world.spawn.y + Math.random() - 0.5;
		if (!entityHash.state) entityHash.state = {};
		if (!entityHash.state.angular) entityHash.state.angular = {};
		entityHash.state.angular.pos = (this.world.spawn.angle) ? this.world.spawn.angle : 0;
		this.entity = this.addEntity(this.world, entityHash);
		this.entity.player = true;

		this.world.gamemode.onPlayerJoin(this);

		var players = {};
		var client;
		for (var id in this.world.clientsId) {
			client = Clients.get(this.world.clientsId[id]);
			players[client.id] = {
				"id": client.id,
				"nickname": client.data.player.getNickname(),
				"entityId": client.data.player.entity.id
			};
		}

		this.client.emit('defineWorld', {
			"players": players,
			"world": this.world.export()
		});

		this.broadcastToWorld('join', {
			"id": this.client.id,
			"nickname": this.getNickname(),
			"entityId": this.entity.id
		});

		var msgJoin = new ChatboxMessage();
		msgJoin.setType(ChatboxMessage.type.SERVER);
		msgJoin.setMsg(":world: :left: " + this.getNickname() + " joined this world");
		msgJoin.setStyle(ChatboxMessage.style.JOIN);
		this.broadcastToWorld('chatboxMessage', msgJoin);
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

Player.prototype.broadcastEntity = function(entity, self) {
	if (this.world) {
		var client;
		for (var id in this.world.clientsId) {
			client = Clients.get(this.world.clientsId[id]);
			if ((client != this.client || self) && client.data.player && client.data.player.entity) {
				if (client.data.player.distFromEntity(entity) < client.data.player.intVars.thresholds.medium) {
					client.emit('entity', entity.export());
				}
			}
		}
	}
};






/****************************
  ENTITY
****************************/

Player.prototype.addEntity = function(world, properties) {
	var entity = world.addEntity(properties);
	//Clients.broadcast('entity', entity.export());
	this.broadcastToWorld('world', world.export());
	return entity;
};

Player.prototype.removeEntity = function(world, entityId) {
	this.world.removeEntity(entityId);
	this.broadcastToWorld('removeEntity', entityId);
};




/****************************
  MESSAGES HANDLER
****************************/

Player.prototype.initMessagesHandler = function() {
	var player = this;
	this.client.addSocketEvent('nickname', function(client, content) {player.defineNickname(content);});
	this.client.addSocketEvent('signup', function(client, content) {player.signUp(content);});
	this.client.addSocketEvent('login', function(client, content) {player.logIn(content);});
	this.client.addSocketEvent('token', function(client, content) {player.fromToken(content);});
	this.client.addSocketEvent('start', function(client, content) {player.start(content);});
	this.client.addSocketEvent('mousedown', function(client, content) {player.mouseDown(content);});
	this.client.addSocketEvent('keydown', function(client, content) {player.keyDown(content);});
	this.client.addSocketEvent('keyup', function(client, content) {player.keyUp(content);});
	this.client.addSocketEvent('restartWorld', function(client, content) {player.restartWorld(content);});
	this.client.addSocketEvent('request', function(client, content) {player.requests(content);});
	this.client.addSocketEvent('player', function(client, content) {player.player(content);});
	this.client.addSocketEvent('chatboxMessage', function(client, content) {player.chatboxMessage(content);});
	this.client.addSocketEvent('changeKeys', function(client, content) {player.changeKeys(content);});
}

Player.prototype.defineNickname = function(content) {
	var nickname = content.nickname;
	var player = this;
	if (!this.setNickname(nickname)) {
		this.client.emit('askNickname',{
			error: "REGEX_TEST_FAIL"
		});
	}
	else {
		Users.exists(this.getNickname(), function(exists) {
			player.user = null;
			if (exists) player.client.emit('askLogIn', {
				nickname: player.getNickname()
			});
			else player.client.emit('askSignUp', {
				nickname: player.getNickname()
			});
		});
	}
};

Player.prototype.signUp = function(content) {
	var token = content.token;
	var nickname = content.nickname;
	var email = content.email;
	var hashed_password = content.hashed_password;
	var askedWorld = content.askedWorld;
	var player = this;
	if (!this.setNickname(nickname)) {
		this.client.emit('askSignUp',{
			error: "REGEX_TEST_FAIL"
		});
	}
	else {
		Users.exists(this.getNickname(), function(exists) {
			if (exists) player.client.emit('askSignUp', {
				error: "ALREADY_EXISTS"
			});
			else Users.signUp(player.getNickname(), email, hashed_password, token, function(user, token) {
				if (user) {
					player.user = user;
					player.client.emit('token', {
						token: token
					});
					player.start({
						askedWorld: askedWorld
					});
				}
				else {
					player.client.emit('askSignUp', {
						error: "ALREADY_EXISTS"
					});
				}
			});
		});
	}
};

Player.prototype.logIn = function(content) {
	var token = content.token;
	var nickname = content.nickname;
	var hashedString = content.hashedString;
	var askedWorld = content.askedWorld;
	var player = this;
	Users.logIn(token, nickname, hashedString, this.client.socket.id, function(user, token) {
		if (user) {
			player.user = user;
			player.client.emit('token', {
				token: token
			});
			player.start({
				"askedWorld": askedWorld
			});
		}
		else {
			player.client.emit('askLogIn', {
				error: "WRONG_PASSWORD"
			});
		}
	})
};

Player.prototype.fromToken = function(content, callback) {
	var askedWorld = content.askedWorld;
	var player = this;
	Users.getFromToken(content.token, function(user, connected) {
		if (user) {
			player.user = user;
			player.client.emit('askBack', {
				nickname: player.getNickname(),
				connected: connected
			});
		}
		else player.client.emit('askNickname', {
			error: "UNKNOWN_TOKEN"
		});
	});
};

Player.prototype.start = function(content) {
	var askedWorld = ((content.askedWorld) ? content.askedWorld.toLowerCase() : null);
	var token = content.token;
	var player = this;
	if (!this.user) {
		if (this.getNickname()) {
			Users.createGuest(token, this.getNickname(), function(user, token) {
				player.user = user;
				player.client.emit('token', {
					token: token
				});
				player.init(askedWorld);
			});
		}
	}
	else this.init(askedWorld);
};

Player.prototype.mouseDown = function(content) {
	if (this.world) {
		var mousePosition = content;
		var entityHash = Loader.loadEntityFileSync(/*"onclick"*/"car_test");
		entityHash.x = mousePosition.x;
		entityHash.y = mousePosition.y;
		//this.addEntity(world, entityHash);
	}
};

Player.prototype.keyDown = function(content) {
	var data = content;
	var key = data.key;
	var entity = data.entity;
	/*if (keys[key] == "UP") this.jump(entity);
	else if (keys[key] == "LEFT") this.roll("left", entity);
	else if (keys[key] == "RIGHT") this.roll("right", entity);*/
	if (this.world) {
		this.player(entity);
		if (this.keys[key]) {
			this.world.playerActionStart(this.keys[key], this);
			this.broadcastEntity(this.entity);
		}
		else this.world.keyDown(key, this);

		/*else if (key == "O") {
			this.entity.physicsBody.state.pos.y = -2200;
			this.entity.physicsBody.state.old.pos.y = -2200;
			this.broadcastToWorld('entity', this.entity.export());
		}*/
	}
};

Player.prototype.keyUp = function(content) {
	var data = content;
	var key = data.key;
	var entity = data.entity;
	/*if (keys[key] == "UP") {}
	else if (keys[key] == "LEFT") this.stopRoll("left", entity);
	else if (keys[key] == "RIGHT") this.stopRoll("right", entity);*/
	if (this.world) {
		this.player(entity);
		if (this.keys[key]) {
			this.world.playerActionStop(this.keys[key], this);
			this.broadcastEntity(this.entity);
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
	var request = content;
	if (request == "definePlayer") {
		if (this.entity) {
			this.clientWorldOk = true;
			this.client.emit('definePlayer', {
				"entity": this.entity.export(),
				"jumpPower": this.jumpPower,
				"speed": this.speed
			});
		}
		else {
			this.client.emit("serverError", "The player entity does not exist yet.");
		}
	}
};

Player.prototype.player = function(content) {
	if (this.entity != null && this.clientWorldOk) {
		try {
			var player;
			var worldId;
			if (typeof content == "string") {
				var parse = content;
				player = parse.player;
				worldId = parse.worldId;
			}
			else player = content;
			if (worldId == undefined || worldId == this.world.id) {
				this.entity.update({state: player.state});
			}
		}
		catch(e) {
			console.log(e);
		}
	}
};

Player.prototype.chatboxMessage = function(content) {
	var message = content;
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
					this.client.emit('chatboxMessage', msgWorldChange);
					this.goToWorld(command[1]);
				}
				catch (e) {
					console.log(e.message);
					// console.log(e.stack);
					var msgWorldChange = new ChatboxMessage();
					msgWorldChange.setType(ChatboxMessage.type.OBJECT);
					msgWorldChange.setMsg("Can't find world " + command[1]);
					msgWorldChange.setColor(ChatboxMessage.color.ERROR);
					msgWorldChange.setNickname("World");
					this.client.emit('chatboxMessage', msgWorldChange);
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
					var entityHash = Loader.loadEntityFileSync(pelottes[Math.floor(Math.random()*pelottes.length)]);
					entityHash.x = this.world.spawn.x + Math.random() - 0.5;
					entityHash.y = this.world.spawn.y + Math.random() - 0.5;
					if (!entityHash.options) entityHash.options = {};
					entityHash.options.angle = (this.world.spawn.angle) ? this.world.spawn.angle : 0;
					this.addEntity(this.world, entityHash);
				}
			}
			else if (command[0] == "test") {
				var player = this;
				if (command[1] && command[1].toLowerCase() == "set") Redis.client.set("string key", command[2], function() {});
				else {
					Redis.client.get("string key", function(err, val) {
						console.log(err);
						console.log(val);
						var msg = new ChatboxMessage();
						msg.setType(ChatboxMessage.type.SERVER);
						msg.setMsg("DEBUG " + val);
						msg.setColor({r: 200, g: 150, b: 240});
						player.broadcastToWorld("chatboxMessage", msg);
						player.client.emit("chatboxMessage", msg);
					});
				}
			}
		}
		else {
			var msg = new ChatboxMessage();
			msg.setType(ChatboxMessage.type.USER);
			msg.setMsg(message);
			msg.setColor({r: 60, g: 150, b: 255});
			msg.setNickname(this.getNickname());
			this.broadcastToWorld("chatboxMessage", msg);
			this.client.emit("chatboxMessage", msg);
		}
	}
};

Player.prototype.changeKeys = function(content) {
	this.keys = content;
};




/****************************
  INTERVALS
****************************/

Player.prototype.initIntervals = function(client) {

	this.intVars = {
		"entitiesDistance": {
			"short": { },
			"medium": { },
			"semifar": { }
		},

		"displayedEntitiesId": [],

		"thresholds": {
			"short": 1000,
			"medium": 2800,
			"semifar": 5000
		},

		"recalc": {
			"short": 24,
			"medium": 6,
			"semifar": 10,
			"far": 40
		},

		"update": {
			"short": 5,
			"medium": 2, // times the previous
			"semifar": 0,
			"far": 0, // 0 for never
			"sleep": 300, // Update sleeping entities
			"hide": 10 // Hide far entities for view
		},

		"count": 0
	};

	var player = this;

	this.client.clearInterval("worldUpdate");
	this.client.setInterval("worldUpdate", function(client) {
		player.recalcDistanceInterval();
	}, UPDATE_INTERVAL);

	this.eventsIds["world"]["addEntity"].push(
		this.world.addEventListener('addEntity', function(entities) {
			var exportedEntities = {};
			for (var idE in entities) {
				player.placeEntityInDistanceGroup(entities[idE]);
				exportedEntities[idE] = entities[idE].export();
			}
			player.client.emit('world', {
				"id": player.world.id,
				"entities": exportedEntities
			});
		})
	);

};

Player.prototype.recalcDistanceInterval = function() { // will recalc short and medium more often than far

	if (this.world && this.entity) {

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
			this.placeEntityInDistanceGroup(entities[idE]);
		}


		if (this.intVars.count % (this.intVars.update.short * this.intVars.update.medium * this.intVars.update.semifar * this.intVars.update.far) == 0) this.worldUpdateInterval("far", this.intVars.count % this.intVars.update.sleep == 0);
		else if (this.intVars.count % (this.intVars.update.short * this.intVars.update.medium * this.intVars.update.semifar) == 0) this.worldUpdateInterval("semifar", this.intVars.count % this.intVars.update.sleep == 0);
		else if (this.intVars.count % (this.intVars.update.short * this.intVars.update.medium) == 0) this.worldUpdateInterval("medium", this.intVars.count % this.intVars.update.sleep == 0);
		else if (this.intVars.count % (this.intVars.update.short) == 0) this.worldUpdateInterval("short", this.intVars.count % this.intVars.update.sleep == 0);

		if (this.intVars.count % this.intVars.update.hide == 0) this.hideDistantEntities();

		this.intVars.count++;
	}
};
Player.prototype.distFromEntity = function(entity) { // possible optimization : if aabb < ? use only x & y
	var playerEntity = this.entity;

	if (!playerEntity || entity == playerEntity) return 0;

	var pPos = playerEntity.getPos();
	var ePos = entity.getPos();

	// Add velocity
	var pVel = playerEntity.getVel();
	var pPosVel = {
		x: pPos.x + pVel.x * 1000,
		y: pPos.y + pVel.y * 1000
	};

	var dx = ePos.x - pPos.x;
	var dy = ePos.y - pPos.y;

	if (entity.type == "Decoration") {
		return Math.sqrt(dx * dx + dy * dy);
	}
	else {
		var aabbPlayer = playerEntity.physicsBody.aabb();
		var aabbEntity = entity.physicsBody.aabb();

		var playerRadius = Math.sqrt(aabbPlayer.hw * aabbPlayer.hw + aabbPlayer.hh * aabbPlayer.hh);
		var entityRadius = Math.sqrt(aabbEntity.hw * aabbEntity.hw + aabbEntity.hh * aabbEntity.hh);

		var dist = distToSegment(ePos, pPos, pPosVel);

		return Math.max(0, dist - playerRadius - entityRadius);



		/* var aabbdx = (aabbEntity.x - aabbEntity.hw * Math.sign(dx)) - (aabbPlayer.x + aabbPlayer.hw * Math.sign(dx));
		var aabbdy = (aabbEntity.y - aabbEntity.hh * Math.sign(dy)) - (aabbPlayer.y + aabbPlayer.hh * Math.sign(dy));

		if (aabbdx * Math.sign(dx) < 0 && aabbdy * Math.sign(dy) < 0) return 0;
		else if (aabbdx * Math.sign(dx) < 0) return Math.abs(aabbdy);
		else if (aabbdy * Math.sign(dy) < 0) return Math.abs(aabbdx);

		return Math.sqrt(aabbdx * aabbdx + aabbdy * aabbdy);*/
	}
};
Player.prototype.placeEntityInDistanceGroup = function(entity) {
	var dist = this.distFromEntity(entity);
	if (dist < this.intVars.thresholds.short) {
		this.intVars.entitiesDistance.short[entity.id] = entity;
	}
	else if (dist < this.intVars.thresholds.medium) {
		this.intVars.entitiesDistance.medium[entity.id] = entity;
	}
	else if (dist < this.intVars.thresholds.semifar * (this.world.gamemode.params.player.speedLimit * this.world.gamemode.params.player.speedLimit)) {
		this.intVars.entitiesDistance.semifar[entity.id] = entity;
	}
};

Player.prototype.clearEntityDistance = function(entityId) {
	if (this.intVars.entitiesDistance.short[entityId]) delete this.intVars.entitiesDistance.short[entityId];
	if (this.intVars.entitiesDistance.medium[entityId]) delete this.intVars.entitiesDistance.medium[entityId];
	if (this.intVars.entitiesDistance.semifar[entityId]) delete this.intVars.entitiesDistance.semifar[entityId];
};

Player.prototype.worldUpdateInterval = function(range, sendSleepingEntities) {

	if (this.world) {

		var entities = {};
		var sleep = null;

		var shouldSendEntity = (entity) => {
			var isSleeping = entity.sleep();
			if (typeof isSleeping === 'undefined') isSleeping = true;
			return !isSleeping || sendSleepingEntities || this.intVars.displayedEntitiesId.indexOf(entity.id) == -1;
		};

		if (range == "far") {
			for (var id in this.world) {
				entities[id] = this.wolrd.entities[id].export();
			}
		}

		if (range == "semifar") {
			for (var id in this.intVars.entitiesDistance.semifar) {
				if (shouldSendEntity(this.intVars.entitiesDistance.semifar[id])) {
					entities[id] = this.intVars.entitiesDistance.semifar[id].export();
				}
			}
		}

		if (range == "medium" || range == "semifar") {
			for (var id in this.intVars.entitiesDistance.medium) {
				if (shouldSendEntity(this.intVars.entitiesDistance.medium[id])) {
					entities[id] = this.intVars.entitiesDistance.medium[id].export();
				}
			}
		}

		if (range == "short" || range == "medium" || range == "semifar") {
			for (var id in this.intVars.entitiesDistance.short) {
				if (shouldSendEntity(this.intVars.entitiesDistance.short[id])) {
					entities[id] = this.intVars.entitiesDistance.short[id].export();
				}
			}
		}

		delete entities[this.entity.id];

		var count = 0;
		var index;
		for (var id in entities) {
			index = this.intVars.displayedEntitiesId.indexOf(entities[id].id);
			if (index == -1) this.intVars.displayedEntitiesId.push(entities[id].id);
			count++;
		}

		if (count > 0) {
			this.client.emit('world', {
				"id": this.world.id,
				"entities": entities
			});
		}

	}

};

Player.prototype.hideDistantEntities = function() {
	if (this.world) {
		var entitiesId = [];
		for (var idE in this.intVars.entitiesDistance.semifar) {
			entitiesId.push(this.intVars.entitiesDistance.semifar[idE].id);
		}
		for (var idE in this.intVars.entitiesDistance.far) {
			entitiesId.push(this.intVars.entitiesDistance.far[idE].id);
		}
		var index;
		var sendHide = [];
		for (var i in entitiesId) {
			index = this.intVars.displayedEntitiesId.indexOf(entitiesId[i]);
			if (index != -1) {
				this.intVars.displayedEntitiesId.splice(index, 1);
				sendHide.push(entitiesId[i]);
			}
		}
		if (sendHide.length > 0) this.client.emit('hideEntities', { entities: sendHide });
	}
};




Player.prototype.setNickname = function(nickname) {
	if (/^[\w \-']+$/.test(nickname)) {
		nickname = nickname.substr(0, 25);
		if (this.user) this.user.nickname = nickname;
		this.nickname = nickname;
		return this.nickname;
	}
	else return false;
};

Player.prototype.getNickname = function() {
	return (this.user) ? this.user.nickname : this.nickname;
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


function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x),
                    y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }
