(function() {

	var Matter;
	var Entity;
	var Loader;

	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Physics = require("physicsjs-full");
	    Entity = require("entity").Entity;
	    Loader = require("loader").Loader;
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    Physics = window.Physics;
	    Entity = window.Entity;
	}





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
		var vx;
		var vy;
		var angleDistVel;
		var angleDistPos;
		var vel;
		for (var idE in this.entities) {
			if (this.entities[idE].player) {
				if (this.entities[idE].move) {
					angleDistPos = toAngleDist({
						x: this.entities[idE].physicsBody.state.pos.x,
						y: this.entities[idE].physicsBody.state.pos.y
					});
					vel = rotatePoint(
						this.entities[idE].physicsBody.state.vel.x, this.entities[idE].physicsBody.state.vel.y,
						- (angleDistPos.angle + Math.PI/2),
						0, 0
					);
					if (vel.x * this.entities[idE].move.side < this.entities[idE].move.speed) vel.x += this.entities[idE].move.speed * this.entities[idE].move.side / 15;
					vel = rotatePoint(
						vel.x, vel.y,
						(angleDistPos.angle + Math.PI/2),
						0, 0
					);
					this.entities[idE].physicsBody.state.vel.x = vel.x;
					this.entities[idE].physicsBody.state.vel.y = vel.y;
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
	World.prototype.addEntity = function(properties) {
		var entity;
		var id = this.entitiesCount++;
		if (!properties.options) properties.options = {};

		properties.id = id;
		entity = new Entity[properties.type](properties);

		this.physicsWorld.add(entity.physicsBody);
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
		for (var id in this.entities) {
			forJSONEntities[id] = this.entities[id].export();
		}
		return {
			id: this.id,
			entities: forJSONEntities,
			entitiesCount: this.entitiesCount,
			behaviors: this.behaviors
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
		if (!this.spawn) {
			this.spawn = worldJSON.spawn;
		}

		this.entitiesCount = worldJSON.entitiesCount || this.entitiesCount;
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
				entity = Entity.import(entitiesJSON[id]);
				this.entities[entity.id] = entity;
				physicsBodies.push(entity.physicsBody);
			}
		}
		this.physicsWorld.add(physicsBodies);
	};


	World.prototype.removeEntity = function(entityId) {
		this.triggerEvent('removeEntity', entityId);
		this.physicsWorld.remove(this.entities[entityId].physicsBody);
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