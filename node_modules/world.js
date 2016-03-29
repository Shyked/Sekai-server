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
		Physics.util.ticker.off(this.worlds[id].onTick);
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
		this.planets = null;
		this.origin = null;
		this.gamemode = null;
		this.background = {
			"image": null,
			"color": null,
			"depth": null,
			"divisionSize": null
		};

		this.clientsId = [];

		this.initEvents([
			"removeEntity",
			"afterStep",
			"collision"
		]);


		this.physicsWorld = Physics();

		var world = this;

		// ensure objects bounce when edge collision is detected
		var collision = Physics.behavior('body-collision-detection');
		this.physicsWorld.on(collision.options.channel, function(data, e) {
			world.collision(data);
		});
		this.physicsWorld.add(collision);
		this.physicsWorld.add(Physics.behavior('body-impulse-response'));
		this.physicsWorld.add(Physics.behavior('sweep-prune'));


		var physicsWorld = this.physicsWorld;
		this.onTick = function(time, dt) {
			physicsWorld.step(time);
			world.afterStep(time);
		}
		Physics.util.ticker.on(this.onTick);
		Physics.util.ticker.start();
	};


	World.prototype.initEvents = function(events) {
		this.events = {};
		for (var id in events) {
			this.events[events[id]] = {};
			this.events[events[id]].count = 0;
		}
	};




	World.prototype.afterStep = function(time) {
		for (var idE in this.entities) {
			if (this.type == "circular") {
				var minDist = null;
				var minDistId = null;
				for (var idP in this.planets) {
					var pos = this.entities[idE].getPos();
					var dist = 	Math.sqrt(
									(this.planets[idP].pos.x - pos.x) * (this.planets[idP].pos.x - pos.x)
									+ (this.planets[idP].pos.y - pos.y) * (this.planets[idP].pos.y - pos.y))
								- this.planets[idP].radius;
					if (minDist === null || dist < minDist) {
						minDist = dist;
						minDistId = idP;
					}
				}
				var origin = this.planets[minDistId].pos;
				this.entities[idE].origin = origin;
			}
			this.entities[idE].applyDisplacements(this.type, this.gamemode.params.player.maxSpeedLimiter, this.limits, this.gamemode.params.player.deceleration);
		}
		this.triggerEvent("afterStep", null);
		this.entitiesCheckpoint();
	};


	World.prototype.entitiesCheckpoint = function() {
		for (var id in this.entities) {
			this.entities[id].checkpoint();
		}
	};



	World.prototype.collision = function(data) {
		for (var id in data.collisions) {
			this.triggerEvent("collision", {
				"entityA": data.collisions[id].bodyA.entity,
				"entityB": data.collisions[id].bodyB.entity,
				"data": data.collisions[id]
			})
		}
	};




	/**
	 * addEntity()
	 * Create a new entity in the World
	 *
	 * @param properties array Other properties that helps to construct the entity.
	 */
	World.prototype.addEntity = function(properties, addToWorld) {
		if (properties instanceof Array) {
			var entities = [];
			for (var idP in properties) {
				entities.push(this.addEntity(properties[idP]));
			}
			return entities;
		}
		else {
			if (addToWorld === undefined) addToWorld = true;
			var entity;
			var id = this.entitiesCount++;

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
		}
	};


	World.prototype.removeEntity = function(entityId) {
		this.triggerEvent('removeEntity', entityId);
		if (this.entities[entityId].physicsBody) this.physicsWorld.remove(this.entities[entityId].physicsBody);
		delete this.entities[entityId];
	};










	World.prototype.generateGround = function(ground) {

		var world = this;

		var createPart = function(pos, prevPos) {
			if (world.type == "circular") {
				var underPos = toAngleDist(pos);
				underPos.dist -= depth;
				underPos = toXY(underPos);
				var underPrevPos = toAngleDist(prevPos);
				underPrevPos.dist -= depth;
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
						"restitution": 1
					}
				};
			}
			else if (world.type == "flat") {
				return {
					"type": "Polygon",
					"vertices": [
						{x: prevPos.x, y: prevPos.y},
						{x: pos.x, y: pos.y},
						{x: pos.x, y: pos.y + depth},
						{x: prevPos.x, y: prevPos.y + depth}
					],
					"options": {
						"treatment": "static",
						"cof": 0.8,
						"restitution": 1
					}
				}
			}
		};

		var createCompound = function(children, texture, textureOffset, positions, offset) {
			var entity = world.addEntity({
				"type": "Compound",
				"hiddenChildren": ((texture)?true:false),
				"options": {
					"treatment": "static",
					"cof": 0.8,
					"restitution": 1
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
			
			entity.physicsBody.state.pos.x = entity.physicsBody.state.pos.x + entity.com.x + offset.x;
			entity.physicsBody.state.pos.y = entity.physicsBody.state.pos.y + entity.com.y + offset.y;

			for (var idC in entity.physicsBody.children) {
				var child = entity.physicsBody.children[idC];
				if (child.geometry.vertices) {
					child.state.pos.x = child.state.pos.x - entity.com.x;
					child.state.pos.y = child.state.pos.y - entity.com.y;
				}
			}

			entity.refreshCom();
		};



		if (this.type == "circular") this.planets = [];


		for (var idG in ground) {

			var g = ground[idG];

			var offset = {
				x: g.x,
				y: g.y
			};
			if (this.type == "circular") {
				var radius = (this.type == "circular") ? g.radius : null;
				var attractor = (this.type == "circular") ? g.attractor : null;
				this.planets.push({
					"pos": offset,
					"radius": radius
				});
			}
			var depth = g.depth || GROUND_DEPTH;
			var parts = g.parts;

			if (attractor) {
				attractor.pos = {
					x: offset.x,
					y: offset.y
				};
				this.physicsWorld.add(Physics.behavior('attractor', attractor));
				if (!this.behaviors) this.behaviors = [];
				if (!this.behaviors.attractors) this.behaviors.attractors = [];
				this.behaviors.attractors.push(attractor);
			}

			var prevPos = null;
			var firstPos = null;
			var children = [];
			var texture = "";
			var textureOffset = {};
			var positions = [];

			for (var idP in parts) {

				if (children.length > 0) createCompound(children, texture, textureOffset, positions, offset);

				var elevation = parts[idP].elevation;

				children = [];
				positions = [];
				prevPos = null;

				for (var idE in elevation) {

					var e = elevation[idE];

					if (this.type == "circular") {
						var pos = rotatePoint(
							radius + e[1],
							0,
							(e[0] / 100) * Math.PI * 2,
							0,
							0
						);
					}
					else if (this.type == "flat") {
						var pos = {
							x: e[0],
							y: e[1]
						};
					}
					positions.push(pos);

					if (prevPos) {
						var child = createPart(pos, prevPos, depth);
						children.push(child);
					}
					prevPos = pos;

				}

				texture = parts[idP].texture;
				textureOffset = parts[idP].textureOffset;

			}

			createCompound(children, texture, textureOffset, positions, offset);

		}

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
			planets: this.planets,
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
				this.generateGround(worldJSON.ground);
			} catch (e) {
				console.error(e);
				throw e;
			}
		}


		if (worldJSON.limits) {
			if (worldJSON.limits[0] < worldJSON.limits[1]) this.limits = worldJSON.limits;
		}

		if (worldJSON.planets) {
			this.planets = worldJSON.planets;
		}


		if (worldJSON.background) {
			this.background = worldJSON.background;
		}

		this.updateEntities(worldJSON.entities);
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
				if (entitiesJSON[id].id == undefined) {
					this.addEntity(entitiesJSON[id]);
				}
				else {
					entity = Entity.import(entitiesJSON[id]);
					this.entities[entity.id] = entity;
					if (entity.physicsBody) physicsBodies.push(entity.physicsBody);
				}
			}
		}
		this.physicsWorld.add(physicsBodies);
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
		this.gamemode.keyDown(key);
	};

	World.prototype.keyUp = function(key, player) {
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