(function() {

	var Physics;
	var Entity;
	var Loader;

	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Physics = require("physicsjs-full");
	    Entity = require("entity").Entity;
	    Loader = require("loader").Loader;
	    Gamemodes = require("./gamemodes");
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    Physics = window.Physics;
	    Entity = window.Entity;
	    Gamemodes = window.Gamemodes;
	}



	if (!Math.sign) {
		Math.sign = function(n) {
			return Math.abs(n) / n;
		};
	}






	var GROUND_DEPTH = 200;





	/* WORLDS */

	/**
	 * Worlds
	 * World manager, used to store many worlds
	 */
	var Worlds = function() {

		this.worlds = {};
		this.count = 0;

	};

	/**
	 * new()
	 * Creates a new World
	 *
	 * @param id mixed A variable that identifies the World (int, string...)
	 */
	Worlds.prototype.new = function(id) {
		var newWorld = new World(id);
		this.worlds[newWorld.id] = newWorld;
		this.count++;
		return newWorld;
	};

	/**
	 * delete()
	 * Deletes an existing World
	 *
	 * @param id mixed The variable that identifies the World
	 */
	Worlds.prototype.delete = function(id) {
		if (id instanceof World) id = id.id;
		this.worlds[id].physicsWorld.destroy();
		this.worlds[id] = null;
		delete this.worlds[id];
		this.count--;
	};

	/**
	 * get()
	 * Retrieve a World with its id
	 *
	 * @param id string A string that identify the world
	 */
	Worlds.prototype.get = function(id) {
		var world = this.worlds[id];
		if (!world && Loader && id !== null && id != undefined) {
			worldJSON = Loader.loadWorldSync(id);
			world = this.new(id);
			world.update(worldJSON);
			if (!world) console.log("The world " + id + " does not exist.");
		}
		return world;
	};








	/* WORLD */

	/**
	 * World
	 * A World that contains entities
	 *
	 * @param id mixed A variable that identify the world (int, string...)
	 */
	var World = function(id) {

		this.id = id;
		this.entities = {};
		this.entitiesCount = 0;
		this.spawn = null;
		this.type = null;
		this.limits = null;
		this.gamemode = null;
		this.background = {
			"image": null,
			"color": null,
			"depth": null,
			"divisionSize": null
		};

		this.clientsId = [];

		this.events = {
			removeEntity: {
				"count": 0
			}
		};


		this.physicsWorld = Physics();

		// ensure objects bounce when edge collision is detected
		this.physicsWorld.add(Physics.behavior('body-impulse-response'));
		this.physicsWorld.add(Physics.behavior('body-collision-detection'));
		this.physicsWorld.add(Physics.behavior('sweep-prune'));


		var physicsWorld = this.physicsWorld;
		var world = this;
		Physics.util.ticker.on(function(time, dt) {
			physicsWorld.step(time);
			world.afterStep(time);
		});
		Physics.util.ticker.start();
	};




	World.prototype.afterStep = function(time) {
		var e;
		var displPos;
		var displAngleDist;
		var angleDistVel;
		var angleDistPos;
		var vel;
		var previousSpeed;
		var coeff;
		var newSpeed;
		var dec = this.gamemode.params.player.deceleration;
		for (var idE in this.entities) {
			e = this.entities[idE];
			if (e.physicsBody) {
				// Deceleration
				e.physicsBody.state.vel.x = e.physicsBody.state.vel.x / (1 + dec);
				e.physicsBody.state.vel.y = e.physicsBody.state.vel.y / (1 + dec);
				e.physicsBody.state.angular.vel = e.physicsBody.state.angular.vel / (1 + dec);

				// If the entity is moving
				if (e.move.speed) {
					e.physicsBody.sleep(false);

					displPos = {
						x: 0,
						y: 0
					};
					if (e.move.direction["up"]) displPos.y--;
					if (e.move.direction["left"]) displPos.x--;
					if (e.move.direction["down"]) displPos.y++;
					if (e.move.direction["right"]) displPos.x++;
					displAngleDist = toAngleDist(displPos);

					if (displAngleDist.dist > 0) {
						displAngleDist.dist = e.move.speed * e.move.acc;
						vel = {
							x: e.physicsBody.state.vel.x,
							y: e.physicsBody.state.vel.y
						};
						previousSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
						displPos = toXY(displAngleDist);
						if (this.type == "circular") {
							angleDistPos = toAngleDist({ // Get pos relative to the world
								x: e.physicsBody.state.pos.x,
								y: e.physicsBody.state.pos.y
							});
							vel = rotatePoint( // Velocity relative to the player
								vel.x, vel.y,
								- (angleDistPos.angle + Math.PI/2),
								0, 0
							);
						}

						if (this.gamemode.params.player.maxSpeedLimiter != "strict" || vel.x * Math.abs(displPos.x) < e.move.speed) {
							vel.x += displPos.x;
						}
						if (this.gamemode.params.player.maxSpeedLimiter != "strict" || vel.y * Math.sign(displPos.y) < e.move.speed) {
							vel.y += displPos.y;
						}

						if (this.type == "circular") {
							vel = rotatePoint( // Velocity relative to the world
								vel.x, vel.y,
								(angleDistPos.angle + Math.PI/2),
								0, 0
							);
						}
						newSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
						if (this.gamemode.params.player.maxSpeedLimiter == "normal" && newSpeed > e.move.speed && newSpeed > previousSpeed) {
							vel.x *= previousSpeed / newSpeed;
							vel.y *= previousSpeed / newSpeed;
						}
						e.physicsBody.state.vel.x = vel.x;
						e.physicsBody.state.vel.y = vel.y;
					}
				}

				// If the entity must jump
				if (e.jump) {

					if (this.type == "circular") {
						var angleDistPos = toAngleDist({
							x: e.physicsBody.state.pos.x,
							y: e.physicsBody.state.pos.y
						});
						vel = rotatePoint(
							e.physicsBody.state.vel.x, e.physicsBody.state.vel.y,
							- (angleDistPos.angle + Math.PI/2),
							0, 0
						);
						if (vel.y > -e.jump) vel.y = -e.jump;
						vel = rotatePoint(
							vel.x, vel.y,
							(angleDistPos.angle + Math.PI/2),
							0, 0
						);
					}
					else if (this.type == "flat") {
						vel = {
							x: e.physicsBody.state.vel.x,
							y: e.physicsBody.state.vel.y
						};
						if (vel.y > -e.jump) vel.y = -e.jump;
					}
					e.physicsBody.state.vel.x = vel.x;
					e.physicsBody.state.vel.y = vel.y;

					e.physicsBody.sleep(false);

					e.jump = false;
				}

				// If the entity is a player and the world has limits
				if (e.player && this.limits) {
					if (e.physicsBody.state.pos.x < this.limits[0]
						|| e.physicsBody.state.pos.x > this.limits[1]) {
						e.physicsBody.state.pos.x = Math.min(Math.max(e.physicsBody.state.pos.x, this.limits[0]), this.limits[1]);
						e.physicsBody.state.vel.x = 0;
					}
				}

				// Disabling entity rotation
				if (!e.rotation) {
					if (this.type == "circular") {
						var targetAngle = Math.mod(toAngleDist({
							x: e.physicsBody.state.pos.x,
							y: e.physicsBody.state.pos.y,
						})["angle"] + Math.PI / 2, Math.PI * 2);
						var currentAngle = Math.mod(e.physicsBody.state.angular.pos, 2 * Math.PI);
						var toTarget = targetAngle - currentAngle;
						e.physicsBody.state.angular.pos = e.physicsBody.state.angular.pos + toTarget;
						e.physicsBody.state.angular.vel = 0;
					}
					else if (this.type == "flat") {
						e.physicsBody.state.angular.pos = 0;
						e.physicsBody.state.angular.vel = 0;
					}
				}
			}
		}
	};




	/**
	 * addEntity()
	 * Create a new entity in the World
	 *
	 * @param properties array Other properties that helps to construct the entity.
	 */
	World.prototype.addEntity = function(properties, addToWorld) {
		if (addToWorld === undefined) addToWorld = true;
		var entity;
		var id = this.entitiesCount++;
		if (!properties.options) properties.options = {};

		properties.id = id;
		entity = new Entity[properties.type](properties);

		if (addToWorld) {
			try {
				this.physicsWorld.add(entity.physicsBody);
			}
			catch(e) {
				console.log(e);
			}
		}
		this.entities[id] = entity;
		return entity;
	};







	/* EXPORT */

	/**
	 * export()
	 * Returns a simple associative array that would be send on the network
	 */
	World.prototype.export = function() {
		var forJSONEntities = {};
		var count = 0;
		for (var id in this.entities) {
			forJSONEntities[id] = this.entities[id].export();
		}
		return {
			id: this.id,
			entities: forJSONEntities,
			entitiesCount: this.entitiesCount,
			behaviors: this.behaviors,
			type: this.type,
			limits: this.limits,
			background: this.background,
			gamemode: {
				params: this.gamemode.params
			}
		};
	};





	/* UPDATE */

	World.prototype.update = function(worldJSON) {
		if (!this.behaviors) {
			for (var idB in worldJSON.behaviors) {
				if (idB == "newtonian") {
					this.physicsWorld.add(Physics.behavior('newtonian', worldJSON.behaviors[idB]));
				}
				if (idB == "attractors") {
					for (var idA in worldJSON.behaviors["attractors"]) {
						this.physicsWorld.add(Physics.behavior('attractor', worldJSON.behaviors["attractors"][idA]));
					}
				}
				if (idB == "gravity") {
					this.physicsWorld.add(Physics.behavior('constant-acceleration', worldJSON.behaviors[idB]));
				}
			}
			this.behaviors = worldJSON.behaviors;
		}
		if (worldJSON.spawn) this.spawn = worldJSON.spawn;
		if (worldJSON.type) this.type = worldJSON.type;
		if (!this.gamemode) this.gamemode = Gamemodes.get(worldJSON.gamemode, this);


		this.entitiesCount = worldJSON.entitiesCount || this.entitiesCount;

		if (worldJSON.ground) {
			try {
				this.generateGround(worldJSON.ground, worldJSON.ground_textures, worldJSON.ground_textureOffsets, worldJSON.type, worldJSON.ground_depth); 
			}
			catch (e) {
				console.error(e);
			}
		}


		if (worldJSON.limits) {
			if (worldJSON.limits[0] < worldJSON.limits[1]) this.limits = worldJSON.limits;
		}


		if (worldJSON.background) {
			this.background = worldJSON.background;
		}

		this.updateEntities(worldJSON.entities);
	};




	World.prototype.generateGround = function(ground, textures, textureOffsets, type, groundDepth) {
		textures = (textures)?textures:[];
		textureOffsets = (textureOffsets)?textureOffsets:[];
		ground = (ground)?ground:[];
		groundDepth = (groundDepth)?groundDepth:GROUND_DEPTH;

		var world = this;

		var createPart = function(pos, prevPos) {
			if (type == "circular") {
				var underPos = toAngleDist(pos);
				underPos.dist -= GROUND_DEPTH;
				underPos = toXY(underPos);
				var underPrevPos = toAngleDist(prevPos);
				underPrevPos.dist -= GROUND_DEPTH;
				underPrevPos = toXY(underPrevPos);
				return {
					"type": "Polygon",
					"vertices": [
						{x: prevPos.x, y: prevPos.y},
						{x: pos.x, y: pos.y},
						{x: underPos.x, y: underPos.y},
						{x: underPrevPos.x, y: underPrevPos.y}
					],
					"options": {
						"treatment": "static",
						"cof": 0.8,
						"restitution": 0.5
					}
				};
			}
			else if (type == "flat") {
				return {
					"type": "Polygon",
					"vertices": [
						{x: prevPos.x, y: prevPos.y},
						{x: pos.x, y: pos.y},
						{x: pos.x, y: pos.y + groundDepth},
						{x: prevPos.x, y: prevPos.y + groundDepth}
					],
					"options": {
						"treatment": "static",
						"cof": 0.8,
						"restitution": 0.5
					}
				}
			}
		};

		var createCompound = function(children, texture, textureOffset, positions) {

			var entity = world.addEntity({
				"type": "Compound",
				"hiddenChildren": ((texture)?true:false),
				"options": {
					"treatment": "static",
					"cof": 0.8,
					"restitution": 0.5
				}
			}, false);
			if (texture) entity.texture = texture;
			if (textureOffset) entity.textureOffset = textureOffset;

			for (var idC in children) {
				var child = Entity.new(children[idC]);
				entity.addChild(child);
				var b = entity.children[idC].physicsBody;
				b.state.pos.x = b.state.pos.x - (b.geometry.vertices[0].x - positions[idC].x);
				b.state.pos.y = b.state.pos.y - (b.geometry.vertices[0].y - positions[idC].y);
			}
			world.physicsWorld.add(entity.physicsBody);

			entity.refreshCom();
			
			entity.physicsBody.state.pos.x = entity.physicsBody.state.pos.x + entity.com.x;
			entity.physicsBody.state.pos.y = entity.physicsBody.state.pos.y + entity.com.y;

			for (var idC in entity.physicsBody.children) {
				var child = entity.physicsBody.children[idC];
				if (child.geometry.vertices) {
					child.state.pos.x = child.state.pos.x - entity.com.x;
					child.state.pos.y = child.state.pos.y - entity.com.y;
				}
			}

			entity.refreshCom();
		};


		var prevPos = null;
		var firstPos = null;
		var children = [];
		var texture = "";
		var textureOffset = {};
		var positions = [];
		for (var idG in ground) {
			if (children.length > 0) createCompound(children, texture, textureOffset, positions);
			var part = ground[idG];
			children = [];
			positions = [];
			prevPos = null;
			for (var idP in part) {
				if (type == "circular") {
					var pos = rotatePoint(
						part[idP][1],
						0,
						(part[idP][0] / 100) * Math.PI * 2,
						0,
						0
					);
				}
				else if (type == "flat") {
					var pos = {
						x: part[idP][0],
						y: part[idP][1]
					};
				}
				positions.push(pos);
				if (prevPos) {
					var child = createPart(pos, prevPos);
					children.push(child);
				}

				prevPos = pos;
			}
			texture = textures[idG];
			textureOffset = textureOffsets[idG];
		}

		createCompound(children, texture, textureOffset, positions);

	};

	/**
	 * updateEntities()
	 * Imports or updates entities from a simple associative array
	 *
	 * @param entitiesData array The simple associative array obtained by exporting an entity, in a array
	 */
	World.prototype.updateEntities = function(entitiesJSON) {
		var physicsBodies = [];
		var entity;
		for (var id in entitiesJSON) {
			if (this.entities[entitiesJSON[id].id]) { // Entity already exists
				this.entities[entitiesJSON[id].id].update(entitiesJSON[id]);
			}
			else { // new Entity
				entity = Entity.import(entitiesJSON[id]);
				this.entities[entity.id] = entity;
				if (entity.physicsBody) physicsBodies.push(entity.physicsBody);
			}
		}
		this.physicsWorld.add(physicsBodies);
	};


	World.prototype.removeEntity = function(entityId) {
		this.triggerEvent('removeEntity', entityId);
		if (this.entities[entityId].physicsBody) this.physicsWorld.remove(this.entities[entityId].physicsBody);
		delete this.entities[entityId];
	};








	World.prototype.triggerEvent = function(event, result) {
		for (var id in this.events[event]) {
			if (id != "count") this.events[event][id](result);
		}
	};

	World.prototype.addEventListener = function(event, func) {
		this.events[event].count++;
		this.events[event][this.events[event].count] = func;
		return this.events[event].count;
	};

	World.prototype.removeEventListener = function(event, id) {
		if (this.events[event][id]) delete this.events[event][id];
	};

	World.prototype.resetEventListener = function(event) {
		this.events[event] = [];
	};







	World.prototype.playerActionStart = function(action, player) {
		this.gamemode.playerActionStart(action, player);
	};

	World.prototype.playerActionStop = function(action, player) {
		this.gamemode.playerActionStop(action, player);
	};


	World.prototype.keyDown = function(key, player) {
		// body...
		this.gamemode.keyDown(key);
	};

	World.prototype.keyUp = function(key, player) {
		// body...
		this.gamemode.keyUp(key);
	};








	// CommonJS module
	if (typeof exports !== 'undefined') {
	    exports.Worlds = new Worlds();
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    window.Worlds = new Worlds();
	}






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



})();