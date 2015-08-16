(function() {

	var Matter;
	var Entity;

	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Matter = require("matter");
	    Entity = require("Entity");
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    Matter = window.Matter;
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
		Matter.Engine.clear(this.worlds[id].engine);
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
			var matterBodies = [];
			for (var idE in world.entities) {
				this.entities[idE] = Entity.importFromJSON(world.entities[idE]);
				matterBodies.push(this.entities[idE].matterBody);
			}
		}
		// Create empty world
		else {
			this.id = id;
			this.entities = {};
			this.entitiesCount = 0;
		}

		// Init Matter Physics, empty renderer
		var MyRenderer = {
		    create: function() {
		        return { controller: this };
		    },

		    world: function(engine) {
		    }
		};
		this.engine = Matter.Engine.create({
		    render: {
		        controller: MyRenderer
		    }
		});

		if (matterBodies) Matter.World.add(this.engine.world, matterBodies);

		Matter.Engine.run(this.engine);

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

		Matter.World.add(this.engine.world, entity.matterBody);
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
		var matterBodies = [];
		var entity;
		for (var id in entitiesData) {
			if (this.entities[entitiesData[id].id]) {
				Entity.updateFromJSON(this.entities[entitiesData[id].id], entitiesData[id]);
			}
			else {
				entity = Entity.importFromJSON(entitiesData[id]);
				this.entities[entity.id] = entity;
				matterBodies.push(entity.matterBody);
			}
		}
		Matter.World.add(this.engine.world, matterBodies);
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