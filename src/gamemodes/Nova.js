var Default = require('./Default');

var Entity = require('../entity');
var Loader = require("../loader").Loader;

var Nova = function(world) {
	Default.apply(this, Array.prototype.slice.call(arguments));

	this.params = {
		"player": {
			"speed": 0.7,
			"acc": 0.1,
			"jumpPower": 0.5,
			"deceleration": 0.007,
			"maxSpeedLimiter": "normal",
			"actions": {
				"UP": "move",
				"LEFT":"move",
				"DOWN": "move",
				"RIGHT": "move",
				"ACTION1": "scream",
				"ACTION2": "littleScream"
			}
		}
	};

	this.scream = {
		"distance": {
			"min": 0,
			"max": 800
		},
		"power": {
			"min": 0,
			"max": 7
		}
	};
	this.littleScream = {
		"distance": {
			"min": 0,
			"max": 600
		},
		"power": {
			"min": 0,
			"max": 2.5
		}
	};

	this.fruits = [
		"pomme",
		"banane",
		"cerise",
		"fraise"
	];

	this.players = {};

	this.cooldowns = {};

	this.world = world;

	this.initialized = false;
};
Nova.prototype = new Default();




Nova.prototype.onPlayerJoin = function(player) {
	if (!this.initialized) this.initEntities(player);
	this.players[player.client.id] = player;
};

Nova.prototype.onPlayerLeave = function(player) {
	delete this.players[player.client.id];
};



Nova.prototype.initEntities = function(player) {
	for (var idF in this.fruits) {
		for (var i = 0 ; i < 2 ; i++) {
			var entityJSON = Loader.loadEntitySync(this.fruits[idF], this.world.id);
			entityJSON.x = Math.floor(Math.random() * 1200 - 600);
			entityJSON.y = Math.floor(Math.random() * 1200 - 600);
			if (!entityJSON.state) entityJSON.state = {};
			if (!entityJSON.state.angular) entityJSON.state.angular = {};
			entityJSON.state.angular.pos = Math.random() * Math.PI * 2;
			this.world.addEntity(entityJSON);
		}
	}
	this.initialized = true;
	player.broadcastToWorld('world', JSON.stringify(this.world.export()), true);
};




Nova.prototype.getPlayerEntity = function(player) {
	if (player.nickname.toLowerCase() == "nova") return "nova";
	else return "cerise";
};

Nova.prototype.playerActionStart = function(action, player) {
	switch (this.params.player.actions[action]) {
		case "move":
			this.moveEntity(action, player.entity, true);
			break;
		case "jump":
			this.jumpEntity(player.entity);
			break;
		case "scream":
			this.screamEntity(player);
			break;
		case "littleScream":
			this.screamEntity(player, true);
			break;
	}
};


Nova.prototype.screamEntity = function(player, little) {
	if (player.nickname.toLowerCase() == "nova") {

		var gm = this;
		var entity = player.entity;

		if ((entity && this.cooldowns[player.client.id] < (new Date()).getTime()) || !this.cooldowns[player.client.id]) {

			function computeScream(scream) {
				var e;
				var delta;
				for (var idE in gm.world.entities) {
					e = gm.world.entities[idE];
					if (e != entity && e.physicsBody) {
						delta = {
							x: e.physicsBody.state.pos.x - entity.physicsBody.state.pos.x,
							y: e.physicsBody.state.pos.y - entity.physicsBody.state.pos.y
						};
						delta = toAngleDist(delta);
						delta.dist = Math.max(scream.power.min,
							Math.min(scream.power.max,
								((-delta.dist + scream.distance.min) / (scream.distance.max - scream.distance.min) + 1) * (scream.power.max - scream.power.min) + scream.power.min
							)
						);

						if (delta.dist > 0) {
							delta = toXY(delta);

							e.physicsBody.sleep(false);

							e.physicsBody.state.vel.x = e.physicsBody.state.vel.x + delta.x;
							e.physicsBody.state.vel.y = e.physicsBody.state.vel.y + delta.y;
							
							player.broadcastToWorld("entity", JSON.stringify(e.export()), true);
						}
					}
				}
			}


			if (little) {
				player.broadcastToWorld("audio", JSON.stringify("littleScream" + Math.floor(Math.random()*5+1)), true);
			}
			else player.broadcastToWorld("audio", JSON.stringify("scream"), true);
			if (little) {
				setTimeout(function() { computeScream(gm.littleScream); }, 50);
			}
			else {
				setTimeout(function() { computeScream(gm.scream); }, 500);
				setTimeout(function() { computeScream(gm.littleScream); }, 800);
				setTimeout(function() { computeScream(gm.littleScream); }, 1400);
				setTimeout(function() { computeScream(gm.littleScream); }, 2000);
				setTimeout(function() { computeScream(gm.littleScream); }, 2600);
			}
			this.cooldowns[player.client.id] = (new Date()).getTime() + ((little) ? 500 : 3400);
		}
	}
};






module.exports = Nova;






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
