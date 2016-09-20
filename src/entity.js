(function() {


	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Physics = require("./physicsjs-full");
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

		// Bugy argument protetion
		if (p.options) delete p.options.angle;

		if (p.angle) {
			if (!p.state) p.state = {};
			if (!p.state.angular) p.state.angular = {};
			p.state.angular.pos = p.angle;
		}

		var id = p.id,
			texture = p.texture,
			textureScale = p.textureScale,
			textureOffset = p.textureOffset,
			zIndex = p.zIndex,
			style = p.style,
			rotation = p.rotation,
			gamemode = p.gamemode;

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

		this.rotation = (rotation != undefined) ? rotation : true;
		p.rotation = undefined;

		this.origin = {x: 0, y: 0};

		// Gamemode specifics params (associative array)
		this.gamemode = gamemode;

		this.player = false;
		this.move = {
			direction: {
				up: false,
				left: false,
				down: false,
				right: false
			},
			speed: 0,
			acc: 0
		};
		this.jump = false;

		this.prev = {};
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
		this.physicsBody.entity = this;

		if (state) Entity.copyState(state, this.physicsBody.state);

		this.width = width;
		this.height = height;
	};

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
		this.physicsBody.entity = this;

		if (state) Entity.copyState(state, this.physicsBody.state);

		this.radius = radius;
	}

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
		this.physicsBody.entity = this;

		var aabb = this.physicsBody.aabb();
		this.textureCenter = {
			x: aabb.x - this.physicsBody.state.pos.x,
			y: aabb.y - this.physicsBody.state.pos.y,
		};

		if (angle) this.physicsBody.state.angular.pos = angle;


		if (state) Entity.copyState(state, this.physicsBody.state);

		this.vertices = vertices;
	}

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
		this.physicsBody.entity = this;

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


	Entity.Decoration = function(p) {
		this.init(p);

		var id = p.id,
			x = p.x,
			y = p.y,
			angle = p.angle;


		this.type = 'Decoration';

		this.x = x;
		this.y = y;

		this.angle = angle || 0;
	};



	Entity.Rectangle.prototype = new Entity.Generic();
	Entity.Circle.prototype = new Entity.Generic();
	Entity.Polygon.prototype = new Entity.Generic();
	Entity.Compound.prototype = new Entity.Generic();
	Entity.Decoration.prototype = new Entity.Generic();






	/* GETTERS */

	Entity.Generic.prototype.getPos = function() {
		if (this.physicsBody) {
			return {
				"x": this.physicsBody.state.pos.x,
				"y": this.physicsBody.state.pos.y
			};			
		}
		else {
			if (this.type) {
				return {
					x: this.x,
					y: this.y
				};
			}
			else return {x: 0, y: 0};
		}
	};

	Entity.Generic.prototype.getAngle = function() {
		if (this.physicsBody) {
			return this.physicsBody.state.angular.pos;
		}
		else {
			if (this.type) return this.angle;
			else return 0;
		}
	};


	/* SETTERS */

	Entity.Generic.prototype.setPos = function(pos) {
		if (this.physicsBody) {
			var dx = pos.x - this.physicsBody.state.pos.x;
			var dy = pos.y - this.physicsBody.state.pos.y;
			this.physicsBody.state.pos.x += dx;
			this.physicsBody.state.pos.y += dy;
			this.physicsBody.state.old.pos.x += dx;
			this.physicsBody.state.old.pos.y += dy;
		}
		else {
			if (this.type) {
				this.x = pos.x;
				this.y = pos.y;
			}
		}
	};

	Entity.Generic.prototype.setAngle = function(angle) {
		if (this.physicsBody) {
			var dAngle = angle - this.physicsBody.state.angular.pos;
			this.physicsBody.state.angular.pos += dAngle;
			this.physicsBody.state.old.angular.pos += dAngle;
		}
		else {
			if (this.type) {
				this.angle = angle;
			}
		}
	};




	/* PERFORMANCE */

	// Stores the state inside the prev property
	Entity.Generic.prototype.checkpoint = function() {
		var pos = this.getPos();
		var angle = this.getAngle();
		this.prev = {
			x: pos.x,
			y: pos.y,
			angle: angle,
			zIndex: this.zIndex,
			texture: this.texture
		};
	};


	// Will check if the entity has changed since the last checkpoint
	Entity.Generic.prototype.hasChanged = function() {
		var pos = this.getPos();
		var angle = this.getAngle();
		return !(this.prev.x == pos.x
			&& this.prev.y == pos.y
			&& this.prev.angle == angle
			&& this.prev.zIndex == this.zIndex
			&& this.prev.texture == this.texture
			&& this.smoothTeleport.progress >= 1
		);
	};







	/* DISPLACEMENTS */

	Entity.Generic.prototype.applyDisplacements = function(worldType, maxSpeedLimiter, limits, dec) {
		this.deceleration(dec);
		if (this.move.speed) this.makeMove(worldType, maxSpeedLimiter);
		if (this.jump) this.makeJump(worldType);
		if (this.player && limits) this.checkLimits(limits);
		if (!this.rotation) this.preventRotation(worldType);
	};


	Entity.Generic.prototype.deceleration = function(dec) {
		if (this.physicsBody) {
			this.physicsBody.state.vel.x = this.physicsBody.state.vel.x / (1 + dec);
			this.physicsBody.state.vel.y = this.physicsBody.state.vel.y / (1 + dec);
			this.physicsBody.state.angular.vel = this.physicsBody.state.angular.vel / (1 + dec);
		}
	};


	Entity.Generic.prototype.makeMove = function(worldType, maxSpeedLimiter) {
		if (this.physicsBody) {
			this.physicsBody.sleep(false);

			var displPos = {
				x: 0,
				y: 0
			};
			if (this.move.direction["up"]) displPos.y--;
			if (this.move.direction["left"]) displPos.x--;
			if (this.move.direction["down"]) displPos.y++;
			if (this.move.direction["right"]) displPos.x++;
			var displAngleDist = toAngleDist(displPos);

			if (displAngleDist.dist > 0) {
				displAngleDist.dist = this.move.speed * this.move.acc;
				var vel = {
					x: this.physicsBody.state.vel.x,
					y: this.physicsBody.state.vel.y
				};
				var previousSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
				displPos = toXY(displAngleDist);
				var angleDistPos = {x: 0, y: 0};
				if (worldType == "circular") {
					angleDistPos = toAngleDist({ // Get pos relative to the world
						x: this.physicsBody.state.pos.x - this.origin.x,
						y: this.physicsBody.state.pos.y - this.origin.y
					});
					vel = rotatePoint( // Velocity relative to the player
						vel.x, vel.y,
						- (angleDistPos.angle + Math.PI/2),
						0, 0
					);
				}

				if (maxSpeedLimiter != "strict" || vel.x * Math.sign(displPos.x) < this.move.speed) {
					vel.x += displPos.x;
				}
				if (maxSpeedLimiter != "strict" || vel.y * Math.sign(displPos.y) < this.move.speed) {
					vel.y += displPos.y;
				}

				if (worldType == "circular") {
					vel = rotatePoint( // Velocity relative to the world
						vel.x, vel.y,
						(angleDistPos.angle + Math.PI/2),
						0, 0
					);
				}
				var newSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
				if (maxSpeedLimiter == "normal" && newSpeed > this.move.speed && newSpeed > previousSpeed) {
					vel.x *= previousSpeed / newSpeed;
					vel.y *= previousSpeed / newSpeed;
				}
				this.physicsBody.state.vel.x = vel.x;
				this.physicsBody.state.vel.y = vel.y;
			}
		}
	};

	Entity.Generic.prototype.makeJump = function(worldType) {
		if (this.physicsBody) {

			var vel = {x:0, y: 0};
			if (worldType == "circular") {
				var angleDistPos = toAngleDist({
					x: this.physicsBody.state.pos.x - this.origin.x,
					y: this.physicsBody.state.pos.y - this.origin.y
				});
				vel = rotatePoint(
					this.physicsBody.state.vel.x, this.physicsBody.state.vel.y,
					- (angleDistPos.angle + Math.PI/2),
					0, 0
				);
				if (vel.y > -this.jump) vel.y = -this.jump;
				vel = rotatePoint(
					vel.x, vel.y,
					(angleDistPos.angle + Math.PI/2),
					0, 0
				);
			}
			else if (worldType == "flat") {
				vel = {
					x: this.physicsBody.state.vel.x,
					y: this.physicsBody.state.vel.y
				};
				if (vel.y > -this.jump) vel.y = -this.jump;
			}
			this.physicsBody.state.vel.x = vel.x;
			this.physicsBody.state.vel.y = vel.y;

			this.physicsBody.sleep(false);

			this.jump = false;
		}
	};

	Entity.Generic.prototype.checkLimits = function(limits) {
		var pos = this.getPos();
		if (limits && pos.x < limits[0] || pos.x > limits[1]) {
			this.setPos({
				x: Math.min(Math.max(this.physicsBody.state.pos.x, limits[0]), limits[1]),
				y: pos.y
			});
			if (this.physicsBody) this.physicsBody.state.vel.x = 0;
		}
	};

	Entity.Generic.prototype.preventRotation = function(worldType, origin) {
		if (worldType == "circular") {
			var pos = this.getPos();
			var angle = this.getAngle();
			var targetAngle = Math.mod(toAngleDist({
				x: pos.x - this.origin.x,
				y: pos.y - this.origin.y
			})["angle"] + Math.PI / 2, Math.PI * 2);
			var currentAngle = Math.mod(angle, 2 * Math.PI);
			var toTarget = targetAngle - currentAngle;
			this.setAngle(angle + toTarget);
			if (this.physicsBody) this.physicsBody.state.angular.vel = 0;
		}
		else if (worldType == "flat") {
			this.setAngle(0);
			if (this.physicsBody) this.physicsBody.state.angular.vel = 0;
		}
	};






	/* IMPORT */

	Entity.import = function(entityJSON) {
		if (!Entity[entityJSON.type]) throw "The entity type " + entityJSON.type + " does not exist";
		return new Entity[entityJSON.type](entityJSON);
	};






	/* EXPORT */

	Entity.Generic.prototype.export = function() {
		var entityJSON = {};
		if (this.physicsBody) {
			entityJSON.state = {};
			Entity.copyState(this.physicsBody.state, entityJSON.state, true);
			entityJSON.options = {};
			Entity.copyOptions(this.physicsBody, entityJSON.options, true);
			entityJSON.sleep = this.physicsBody.sleep();
		}

		for (var id in this) {
			if (typeof id != 'function' && id != 'physicsBody' && id != 'smoothTeleport') entityJSON[id] = this[id];
		}
		var pos = this.getPos();
		var angle = this.getAngle();
		entityJSON.x = pos.x;
		entityJSON.y = pos.y;
		entityJSON.angle = angle;
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
		var pos = this.getPos();
		var angle = this.getAngle();
		entity.smoothTeleport = {
			angleDelta: angle - entityJSON.angle,
			positionDelta: {
				x: pos.x - entityJSON.x + deltaAdd.x,
				y: pos.y - entityJSON.y + deltaAdd.y
			},
			progress: 0,
			progressSinus: 1
		};
		this.x = entityJSON.x;
		this.y = entityJSON.y;
		this.angle = entityJSON.angle;

		for (var id in entityJSON) {
			if (id != 'type' && id != 'smoothTeleport' && id != 'state' && id != 'sleep') entity[id] = entityJSON[id];
		}

		if (typeof entityJSON.sleep == "boolean") this.physicsBody.sleep(entityJSON.sleep);

		if (entityJSON.state) Entity.copyState(entityJSON.state, entity.physicsBody.state);
		if (entityJSON.options) Entity.copyOptions(entityJSON.options, entity.physicsBody);
	}






	/* TYPE SPECIFIC */


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

	Entity.Compound.prototype.export = function() {
		var entityJSON = {};
		entityJSON.state = {};
		Entity.copyState(this.physicsBody.state, entityJSON.state, true);
		entityJSON.options = {};
		Entity.copyOptions(this.physicsBody, entityJSON.options, true);
		entityJSON.sleep = this.physicsBody.sleep();

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
			if (id != 'type' && id != 'smoothTeleport' && id != 'state' && id != 'sleep' && id != 'children') entity[id] = entityJSON[id];
		}

		if (typeof entityJSON.sleep == "boolean") this.physicsBody.sleep(entityJSON.sleep);

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
