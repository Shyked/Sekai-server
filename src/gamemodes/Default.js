var Clients = require("../client").Clients;




var PLAYER_SPRITES = [
	"lue"
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

var Default = function(world) {
	this.params = {
		"player": {
			"speed": 0.9,
			"acc": 0.07,
			"jumpPower": 0.7,
			"maxSpeedLimiter": "strict",
			"deceleration": 0.001,
			"actions": {
				"UP": "jump",
				"LEFT":"move",
				"DOWN": "",
				"RIGHT": "move",
				"ACTION1": "jump",
				"ACTION2": "jump"
			}
		}
		/*
		maxSpeedLimiter
			Changes the way the velocity is limited when the speed has reach its maximum

			strict : Don't modify the velocity if the maximum speed is already reached (used when there's a gravity)
			normal : The angle is modified but the overall speed is not increased (may cause the player to plan instead of falling hen there's a gravity)
		*/
	};

	if (world) {
		this.world = world;

		var gm = this;
		this.world.addEventListener("collision", function(res) {
			gm.collision(res.entityA, res.entityB, res.data);
		});
	}

	this.successiveCollisions = {};
};




Default.prototype.onPlayerJoin = function(player) {
	// body...
};

Default.prototype.onPlayerLeave = function(player) {
	// body...
};




Default.prototype.getPlayerEntity = function(player) {
	return PLAYER_SPRITES[Math.floor(Math.random()*PLAYER_SPRITES.length)];
};




Default.prototype.playerActionStart = function(action, player) {
	switch (this.params.player.actions[action]) {
		case "move":
			this.moveEntity(action, player.entity, true);
			break;
		case "jump":
			this.jumpEntity(player.entity);
			break;
	}
};

Default.prototype.playerActionStop = function(action, player) {
	switch (this.params.player.actions[action]) {
		case "move":
			this.moveEntity(action, player.entity, false);
			break;
	}
};


Default.prototype.keyDown = function(key, player) {
	// body...
};

Default.prototype.keyUp = function(key, player) {
	// body...
};




Default.prototype.moveEntity = function(direction, entity, enable) {
	enable = Boolean(enable);
	direction = direction.toLowerCase();

	entity.move.direction[direction] = enable;

	var moving = false;
	for (var id in entity.move.direction) {
		if (entity.move.direction[id]) {
			moving = true;
			break;
		}
	}
	if (moving) {
		entity.move.speed = this.params.player.speed;
		entity.move.acc = this.params.player.acc;
	}
	else {
		entity.move.speed = 0;
		entity.move.acc = 0;
	}
};

Default.prototype.jumpEntity = function(entity) {
	entity.jump = this.params.player.jumpPower;
};


Default.prototype.collision = function(entityA, entityB, data) {
	var tramp = null;
	var entity = null;
	if (isset(entityA, ["gamemode", "default", "trampoline", "power"])) {
		tramp = entityA;
		entity = entityB;
	}
	if (isset(entityB, ["gamemode", "default", "trampoline", "power"])) {
		tramp = entityB;
		entity = entityA;
	}

	if (tramp && entity) {
		if (data.collidedPreviously) {
			this.successiveCollisions[tramp.id + "." + entity.id]++;
		}
		else {
			this.successiveCollisions[tramp.id + "." + entity.id] = 1;
		}
		if (this.successiveCollisions[tramp.id + "." + entity.id] > (tramp.gamemode.default.trampoline.stayTime || 100)) {
			var vel = toXY({
				"angle": tramp.getAngle(),
				"dist": tramp.gamemode.default.trampoline.power
			});
			entity.physicsBody.sleep(false);
			entity.physicsBody.state.vel.x = vel.x;
			entity.physicsBody.state.vel.y = vel.y;
			this.broadcastToWorld("entity", JSON.stringify(entity.export()));
		}
	}
};


Default.prototype.broadcastToWorld = function(type, content) {
	if (this.world) {
		var client;
		for (var id in this.world.clientsId) {
			client = Clients.get(this.world.clientsId[id]);
			client.emit(type, content);
		}
	}
};






module.exports = Default;





// Lib

function isset(obj, ids) {
	try {
		var testing = obj;
		for (var id in ids) {
			testing = testing[ids[id]];
		}
		return testing;
	} catch (e) {
		return false;
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
