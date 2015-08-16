(function() {


	// CommonJS module
	if (typeof exports !== 'undefined') {
	    Matter = require("matter");
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    Matter = window.Matter;
	}



	// Namespace Entity
	var Entity = {};




	// Option example : { isStatic : true }

	Entity.Rectangle = function(p) {
		this.init(p.texture, p.textureScale);

		var id = p.id,
			x = p.x,
			y = p.y,
			width = p.width,
			height = p.height,
			options = p.options;


		this.id = id;
		this.type = 'Rectangle';
		this.matterBody = Matter.Bodies.rectangle(x, y, width, height, options);

		this.width = width;
		this.height = height;
	};

	Entity.Circle = function(p) {
		this.init(p.texture, p.textureScale);

		var id = p.id,
			x = p.x,
			y = p.y,
			radius = p.radius,
			maxSides = p.maxSides,
			options = p.options;
		if (!maxSides) maxSides = radius/2 + 3;


		this.id = id;
		this.type = 'Circle';
		this.matterBody = Matter.Bodies.circle(x, y, radius, options, maxSides);

		this.radius = radius;
		this.maxSides = maxSides;
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
	Entity.Circle.prototype.init = Entity.init;






	// Called for each entity type
	Entity.exportForJSON = function() {
		var entityJSON = {};
		var b = this.matterBody;
		var options = {
			angle: b.angle,
			anglePrev: b.anglePrev,
			angularSpeed: b.angularSpeed,
			angularVelocity: b.angularVelocity,
			area: b.area,
			axes: b.axes,
			bounds: b.bounds,
			collisionFilter: b.collisionFilter,
			constraintImpulse: b.constraintImpulse,
			density: b.density,
			force: b.force,
			friction: b.friction,
			frictionAir: b.frictionAir,
			frictionStatic: b.frictionStatic,
			// id
			inertia: b.inertia,
			inverseInertia: b.inverseInertia,
			inverseMass: b.inverseMass,
			isSleeping: b.isSleeping,
			isStatic: b.isStatic,
			label: b.label,
			mass: b.mass,
			motion: b.motion,
			// parent
			// parts
			position: b.position,
			positionImpulse: b.positionImpulse,
			positionPrev: b.positionPrev,
			region: b.region,
			// render (not used)
			restitution: b.restitution,
			sleepCounter: b.sleepCounter,
			sleepThreshold: b.sleepThreshold,
			slop: b.slop,
			speed: b.speed,
			timeScale: b.timeScale,
			torque: b.torque,
			totalContacts: b.totalContacts,
			type: b.type,
			velocity: b.velocity,
			// vertices (circular)
		};
		entityJSON.options = options;
		for (var id in this) {
			if (id != 'matterBody' && id != 'smoothTeleport') entityJSON[id] = this[id];
		}
		entityJSON.x = b.position.x;
		entityJSON.y = b.position.y;
		return entityJSON;
	};

	Entity.Rectangle.prototype.exportForJSON =
	Entity.Circle.prototype.exportForJSON = Entity.exportForJSON;



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
			angleDelta: entity.matterBody.angle - entityJSON.options.angle,
			positionDelta: {
				x: entity.matterBody.position.x - entityJSON.options.position.x,
				y: entity.matterBody.position.y - entityJSON.options.position.y
			},
			progress: 0
		};
		for (var id in entityJSON) {
			if (id != 'options') {
				if (id != 'type' && id != 'smoothTeleport') entity[id] = entityJSON[id];
			}
			else {
				for (var idB in entityJSON[id]) {
					if (entityJSON.options[idB] != null) Matter.Body.set(entity.matterBody, idB, entityJSON.options[idB]);
				}
			}
		}
		
	}






	// CommonJS module
	if (typeof exports !== 'undefined') {
	    exports.Entity = Entity;
	}

	// browser
	if (typeof window === 'object' && typeof window.document === 'object') {
	    window.Entity = Entity;
	}

})();