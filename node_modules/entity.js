(function() {


	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Physics = require("physicsjs-full");
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    Physics = window.Physics;
	}



	// Namespace Entity
	var Entity = {};




	// Option example : { treatment : 'static' }
	// restitution, mass, cof (friction), hidden (rendered or not)

	Entity.Rectangle = function(p) {
		this.init(p.texture, p.textureScale);

		var id = p.id,
			x = p.x,
			y = p.y,
			width = p.width,
			height = p.height,
			state = p.state,
			options = p.options;


		this.id = id;
		this.type = 'Rectangle';

		options.x = x;
		options.y = y;
		options.width = width;
		options.height = height;

		this.physicsBody = Physics.body('rectangle', options);

		if (state) Entity.copyState(state, this.physicsBody.state);

		this.width = width;
		this.height = height;
	};

	Entity.Circle = function(p) {
		this.init(p.texture, p.textureScale);

		var id = p.id,
			x = p.x,
			y = p.y,
			radius = p.radius,
			state = p.state,
			options = p.options;


		this.id = id;
		this.type = 'Circle';

		options.x = x;
		options.y = y;
		options.radius = radius;

		this.physicsBody = Physics.body('circle', options);

		if (state) Entity.copyState(state, this.physicsBody.state);

		this.radius = radius;
	}

	Entity.Polygon = function(p) {
		this.init(p.texture, p.textureScale);

		var id = p.id,
			x = p.x,
			y = p.y,
			vertices = p.vertices,
			state = p.state,
			options = p.options;


		this.id = id;
		this.type = 'Polygon';

		options.x = x;
		options.y = y;
		options.vertices = vertices;

		this.physicsBody = Physics.body('convex-polygon', options);

		if (state) Entity.copyState(state, this.physicsBody.state);

		this.vertices = vertices;
	}


	Entity.init = function(texture, textureScale) {
		this.smoothTeleport = {
			anglePrev: null,
			positionPrev: null,
			progress: 1
		};

		this.texture = (texture) ? texture : null;
		this.textureScale = (textureScale) ? textureScale : {x: 1, y: 1};
	};

	Entity.Rectangle.prototype.init =
	Entity.Circle.prototype.init = 
	Entity.Polygon.prototype.init = Entity.init;






	// Called for each entity type
	Entity.exportForJSON = function() {
		var entityJSON = {};
		entityJSON.state = {};
		Entity.copyState(this.physicsBody.state, entityJSON.state, true);
		entityJSON.options = {};
		Entity.copyOptions(this.physicsBody, entityJSON.options, true);

		for (var id in this) {
			if (id != 'physicsBody' && id != 'smoothTeleport') entityJSON[id] = this[id];
		}
		entityJSON.x = this.physicsBody.state.pos.x;
		entityJSON.y = this.physicsBody.state.pos.y;
		return entityJSON;
	};

	Entity.Rectangle.prototype.exportForJSON =
	Entity.Circle.prototype.exportForJSON = 
	Entity.Polygon.prototype.exportForJSON = Entity.exportForJSON;



	Entity.importFromJSON = function(entity) {
		try {
			return new Entity[entity.type](entity);
		}
		catch (e) {
			console.log(e);
			console.log(entity);
		}
	};



	Entity.updateFromJSON = function(entity, entityJSON) {
		entity.smoothTeleport = {
			angleDelta: entity.physicsBody.state.angular.pos - entityJSON.state.angular.pos,
			positionDelta: {
				x: entity.physicsBody.state.pos.x - entityJSON.state.pos.x,
				y: entity.physicsBody.state.pos.y - entityJSON.state.pos.y
			},
			progress: 0
		};
		for (var id in entityJSON) {
			if (id != 'state') {
				if (id != 'type' && id != 'smoothTeleport') entity[id] = entityJSON[id];
			}
			else {
				var s = entityJSON.state;
				Entity.copyState(entityJSON.state, entity.physicsBody.state);
				Entity.copyOptions(entityJSON.options, entity.physicsBody);
			}
		}
		
	}



	Entity.copyState = function(from, to, init) {
		if (init) {
			to.pos = {};
			to.vel = {};
			to.acc = {};
			to.angular = {};
			to.old = {
				pos: {},
				vel: {},
				acc: {},
				angular: {}
			};
		}
		to.pos.x = from.pos.x;
		to.pos.y = from.pos.y;
		to.vel.x = from.vel.x;
		to.vel.y = from.vel.y;
		to.acc.x = from.acc.x;
		to.acc.y = from.acc.y;
		to.angular.pos = from.angular.pos;
		to.angular.vel = from.angular.vel;
		to.angular.acc = from.angular.acc;
		to.old.pos.x = from.old.pos.x;
		to.old.pos.y = from.old.pos.y;
		to.old.vel.x = from.old.vel.x;
		to.old.vel.y = from.old.vel.y;
		to.old.acc.x = from.old.acc.x;
		to.old.acc.y = from.old.acc.y;
		to.old.angular.pos = from.old.angular.pos;
		to.old.angular.vel = from.old.angular.vel;
		to.old.angular.acc = from.old.angular.acc;
	};

	Entity.copyOptions = function(from, to, init) {
		if (init) {
			
		}
		to.treatment = from.treatment;
		to.restitution = from.restitution;
	};






	// CommonJS module
	if (typeof exports !== 'undefined') {
	    exports.Entity = Entity;
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    window.Entity = Entity;
	}

})();