(function() {

	var Matter;
	var Entity;

	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Physics = require("physicsjs-full");
	    Entity = require("Entity").Entity;
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    Physics = window.Physics;
	    Entity = window.Entity;
	}



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
	 * @param id mixed A variable that identify the world (int, string...)
	 */
	Worlds.prototype.get = function(id) {
		return this.worlds[id];
	};



	/**
	 * World
	 * A World that contains entities
	 *
	 * @param id mixed A variable that identify the world (int, string...)
	 */
	var World = function(id) {

		// Import existing world
		if (typeof id == 'object') {
			var world = id;
			this.id = world.id;
			this.entitiesCount = world.entitiesCount;
			this.entities = {};
			var physicsBodies = [];
			for (var idE in world.entities) {
				this.entities[idE] = Entity.importFromJSON(world.entities[idE]);
				physicsBodies.push(this.entities[idE].physicsBody);
			}
		}
		// Create empty world
		else {
			this.id = id;
			this.entities = {};
			this.entitiesCount = 0;
		}


		this.physicsWorld = Physics();

		// ensure objects bounce when edge collision is detected
		this.physicsWorld.add(Physics.behavior('body-impulse-response'));

		// add some gravity
		this.physicsWorld.add(Physics.behavior('constant-acceleration', { acc: {x: 0, y: 0.0007} }));

		// collision between the bodies
		this.physicsWorld.add(Physics.behavior('body-collision-detection'));
		this.physicsWorld.add(Physics.behavior('sweep-prune'));

		if (physicsBodies) this.physicsWorld.add(physicsBodies);


		var physicsWorld = this.physicsWorld;
		Physics.util.ticker.on(function(time, dt) {
			physicsWorld.step(time);
		});
		Physics.util.ticker.start();
	};



	/**
	 * addEntity()
	 * Create a new entity in the World
	 *
	 * @param shape string The shape of the entity ("Rectangle")
	 * @param properties array Other properties that helps to construct the entity.
	 */
	World.prototype.addEntity = function(shape, properties) {
		var entity;
		var id = this.entitiesCount++;
		if (!properties.options) properties.options = {};

		properties.id = id;
		entity = new Entity[shape](properties);

		this.physicsWorld.add(entity.physicsBody);
		this.entities[id] = entity;
		return entity;
	};



	/**
	 * exportForJSON()
	 * Returns a simple associative array that would be send on the network
	 */
	World.prototype.exportForJSON = function() {
		var forJSONEntities = {};
		for (var id in this.entities) {
			forJSONEntities[id] = this.entities[id].exportForJSON();
		}
		return {
			id: this.id,
			entities: forJSONEntities,
			entitiesCount: this.entitiesCount,
		};
	};

	/**
	 * importEntitiesFromJSON()
	 * Import entities from a simple associative array
	 *
	 * @param entitiesData array The simple associative array obtained by exporting an entity, in a array
	 */
	World.prototype.importEntitiesFromJSON = function(entitiesData) {
		var physicsBodies = [];
		var entity;
		for (var id in entitiesData) {
			if (this.entities[entitiesData[id].id]) {
				Entity.updateFromJSON(this.entities[entitiesData[id].id], entitiesData[id]);
			}
			else {
				entity = Entity.importFromJSON(entitiesData[id]);
				this.entities[entity.id] = entity;
				physicsBodies.push(entity.physicsBody);
			}
		}
		this.physicsWorld.add(physicsBodies);
	};






	// CommonJS module
	if (typeof exports !== 'undefined') {
	    exports.Worlds = new Worlds();
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    window.Worlds = new Worlds();
	}


})();