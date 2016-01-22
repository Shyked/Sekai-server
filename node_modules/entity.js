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




	Entity.Generic = function() {};





	/* CONSTRUCTORS */

	Entity.new = function(p) {
		return new Entity[p.type](p);
	};

	Entity.Generic.prototype.init = function(p) {
		var id = p.id,
			texture = p.texture,
			textureScale = p.textureScale,
			textureOffset = p.textureOffset,
			zIndex = p.zIndex,
			style = p.style;

		this.id = id;

		this.smoothTeleport = {
			angleDelta: null,
			positionDelta: null,
			progress: 1,
			progressSinus: 0
		};

		this.texture = texture || null;
		this.textureScale = textureScale || {x: 1, y: 1};
		this.textureOffset = textureOffset || {x: 0, y: 0};
		this.textureCenter = {x: 0, y: 0};

		this.zIndex = zIndex || 0;

		this.style = style;

		this.rotation = (p.rotation != undefined) ? p.rotation : true;
		p.rotation = undefined;

		this.player = false;
		this.move = null;
	};

	// Option example : { treatment : 'static' }
	// restitution, mass, cof (friction), hidden (rendered or not)

	Entity.Rectangle = function(p) {
		this.init(p);

		var id = p.id,
			x = p.x,
			y = p.y,
			width = p.width,
			height = p.height,
			state = p.state,
			options = p.options || {};


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
	Entity.Rectangle.prototype = new Entity.Generic();

	Entity.Circle = function(p) {
		this.init(p);

		var id = p.id,
			x = p.x,
			y = p.y,
			radius = p.radius,
			state = p.state,
			options = p.options || {};


		this.type = 'Circle';

		options.x = x;
		options.y = y;
		options.radius = radius;

		this.physicsBody = Physics.body('circle', options);

		if (state) Entity.copyState(state, this.physicsBody.state);

		this.radius = radius;
	}
	Entity.Circle.prototype = new Entity.Generic();

	Entity.Polygon = function(p) {
		this.init(p);

		var id = p.id,
			x = p.x,
			y = p.y,
			vertices = p.vertices,
			state = p.state,
			options = p.options || {};


		this.type = 'Polygon';

		options.x = x;
		options.y = y;
		options.vertices = vertices;
		if (options.angle) {
			var angle = options.angle;
			options.angle = undefined;
		}

		this.physicsBody = Physics.body('convex-polygon', options);

		var aabb = this.physicsBody.aabb();
		this.textureCenter = {
			x: aabb.x - this.physicsBody.state.pos.x,
			y: aabb.y - this.physicsBody.state.pos.y,
		};

		if (angle) this.physicsBody.state.angular.pos = angle;


		if (state) Entity.copyState(state, this.physicsBody.state);

		this.vertices = vertices;
	}
	Entity.Polygon.prototype = new Entity.Generic();

	Entity.Compound = function(p) {
		this.init(p);

		var id = p.id,
			x = p.x,
			y = p.y,
			children = p.children || {},
			hiddenChildren = p.hiddenChildren,
			state = p.state,
			options = p.options || {};


		this.type = 'Compound';

		options.x = x;
		options.y = y;
		options.children = [];

		this.children = {};
		this.childrenCount = 0;
		var child;
		for (var i in children) {
			child = Entity.new(children[i]);

			child.id = this.childrenCount;
			this.children[this.childrenCount] = child;
			options.children.push(child.physicsBody);
			this.childrenCount++;
		}
		this.hiddenChildren = hiddenChildren;

		this.physicsBody = Physics.body('compound', options);

		var aabb = this.physicsBody.aabb();
		this.textureCenter = {
			x: aabb.x - this.physicsBody.state.pos.x,
			y: aabb.y - this.physicsBody.state.pos.y,
		};

		if (state) Entity.copyState(state, this.physicsBody.state);
		
		this.com = Physics.body.getCOM(this.physicsBody.children);
		this.com = {
			x: this.com.x,
			y: this.com.y
		};
	};
	Entity.Compound.prototype = new Entity.Generic();

	Entity.Compound.prototype.addChild = function(child) {
		child = Entity.new(child);

		child.id = this.childrenCount;
		this.children[this.childrenCount] = child;
		this.physicsBody.addChild(child.physicsBody);
		this.childrenCount++;
	};

	Entity.Compound.prototype.refreshCom = function() {
		this.physicsBody.refreshGeometry();
		this.com = Physics.body.getCOM(this.physicsBody.children);
		this.com = {
			x: this.com.x,
			y: this.com.y
		};
		var aabb = this.physicsBody.aabb();
		this.textureCenter = {
			x: aabb.x - this.physicsBody.state.pos.x,
			y: aabb.y - this.physicsBody.state.pos.y
		};
	};







	/* IMPORT */

	Entity.import = function(entityJSON) {
		/*if (entityJSON.type == "Compound") { // If the entity id Compound, convert the childs Arrays to Entities
			var children = [];
			for (var id in entityJSON.children) {
				children.push(Entity.import(entityJSON.children[id]));
			}
			entityJSON.children = children;
		}*/
		return new Entity[entityJSON.type](entityJSON);
	};






	/* EXPORT */

	Entity.Generic.prototype.export = function() {
		var entityJSON = {};
		entityJSON.state = {};
		Entity.copyState(this.physicsBody.state, entityJSON.state, true);
		entityJSON.options = {};
		Entity.copyOptions(this.physicsBody, entityJSON.options, true);

		for (var id in this) {
			if (typeof id != 'function' && id != 'physicsBody' && id != 'smoothTeleport') entityJSON[id] = this[id];
		}
		entityJSON.x = this.physicsBody.state.pos.x;
		entityJSON.y = this.physicsBody.state.pos.y;
		return entityJSON;
	};

	Entity.Compound.prototype.export = function() {
		var entityJSON = {};
		entityJSON.state = {};
		Entity.copyState(this.physicsBody.state, entityJSON.state, true);
		entityJSON.options = {};
		Entity.copyOptions(this.physicsBody, entityJSON.options, true);

		entityJSON.children = [];
		for (var id in this.children) {
			entityJSON.children.push(this.children[id].export());
		}

		for (var id in this) {
			if (typeof id != 'function' && id != 'physicsBody' && id != 'smoothTeleport' && id != 'children') entityJSON[id] = this[id];
		}
		entityJSON.x = this.physicsBody.state.pos.x;
		entityJSON.y = this.physicsBody.state.pos.y;
		return entityJSON;
	};






	/* UPDATE */

	Entity.Generic.prototype.update = function(entityJSON) {
		var entity = this;
		var deltaAdd = {
			x: 0,
			y: 0
		}
		if (entity.smoothTeleport.progress != 1) {
			deltaAdd.x = entity.smoothTeleport.positionDelta.x * entity.smoothTeleport.progressSinus;
			deltaAdd.y = entity.smoothTeleport.positionDelta.y * entity.smoothTeleport.progressSinus;
		}
		entity.smoothTeleport = {
			angleDelta: entity.physicsBody.state.angular.pos - entityJSON.state.angular.pos,
			positionDelta: {
				x: entity.physicsBody.state.pos.x - entityJSON.state.pos.x + deltaAdd.x,
				y: entity.physicsBody.state.pos.y - entityJSON.state.pos.y + deltaAdd.y
			},
			progress: 0,
			progressSinus: 1
		};

		for (var id in entityJSON) {
			if (id != 'type' && id != 'smoothTeleport' && id != 'state') entity[id] = entityJSON[id];
		}

		if (entityJSON.state) Entity.copyState(entityJSON.state, entity.physicsBody.state);
		if (entityJSON.options) Entity.copyOptions(entityJSON.options, entity.physicsBody);
	}

	Entity.Compound.prototype.update = function(entityJSON) {
		var entity = this;
		var deltaAdd = {
			x: 0,
			y: 0
		}
		if (entity.smoothTeleport.progress != 1) {
			deltaAdd.x = entity.smoothTeleport.positionDelta.x * entity.smoothTeleport.progressSinus;
			deltaAdd.y = entity.smoothTeleport.positionDelta.y * entity.smoothTeleport.progressSinus;
		}
		entity.smoothTeleport = {
			angleDelta: entity.physicsBody.state.angular.pos - entityJSON.state.angular.pos,
			positionDelta: {
				x: entity.physicsBody.state.pos.x - entityJSON.state.pos.x + deltaAdd.x,
				y: entity.physicsBody.state.pos.y - entityJSON.state.pos.y + deltaAdd.y
			},
			progress: 0,
			progressSinus: 1
		};

		//entityJSON.children = [];
		for (var id in entityJSON.children) {
			if (entity.children[id]) entity.children[id].update(entityJSON.children[id]);
			else {
				entity.children[id] = Entity.import(entityJSON.children[id]);
				entity.entitiesCount++;
			}
		}

		for (var id in entityJSON) {
			if (id != 'type' && id != 'smoothTeleport' && id != 'state' && id != 'children') entity[id] = entityJSON[id];
		}

		if (entityJSON.state) Entity.copyState(entityJSON.state, entity.physicsBody.state);
		if (entityJSON.options) Entity.copyOptions(entityJSON.options, entity.physicsBody);
	}





	/* UTIL */

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
		if (from.pos !== undefined) {
			if (from.pos.x !== undefined) to.pos.x = from.pos.x;
			if (from.pos.y !== undefined) to.pos.y = from.pos.y;
		}
		if (from.vel !== undefined) {
			if (from.vel.x !== undefined) to.vel.x = from.vel.x;
			if (from.vel.y !== undefined) to.vel.y = from.vel.y;
		}
		if (from.acc !== undefined) {
			if (from.acc.x !== undefined) to.acc.x = from.acc.x;
			if (from.acc.y !== undefined) to.acc.y = from.acc.y;
		}
		if (from.angular !== undefined) {
			if (from.angular.pos !== undefined) to.angular.pos = from.angular.pos;
			if (from.angular.vel !== undefined) to.angular.vel = from.angular.vel;
			if (from.angular.acc !== undefined) to.angular.acc = from.angular.acc;
		}
		if (from.old !== undefined) {
			to.old.pos.x = from.old.pos.x;
			to.old.pos.y = from.old.pos.y;
			to.old.vel.x = from.old.vel.x;
			to.old.vel.y = from.old.vel.y;
			to.old.acc.x = from.old.acc.x;
			to.old.acc.y = from.old.acc.y;
			to.old.angular.pos = from.old.angular.pos;
			to.old.angular.vel = from.old.angular.vel;
			to.old.angular.acc = from.old.angular.acc;
		}
	};

	Entity.copyOptions = function(from, to, init) {
		if (init) {
			
		}
		from.treatment && (to.treatment = from.treatment);
		from.restitution && (to.restitution = from.restitution);
		from.asleep && (to.asleep = from.asleep);
		from.sleepIdleTime && (to.sleepIdleTime = from.sleepIdleTime);
		from.cof && (to.cof = from.cof);
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