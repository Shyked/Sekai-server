(function() {

	var fs = require("fs");
	var decomp = require("poly-decomp");


	var Loader = function() {
		this.entitiesCache = {};
	};

	Loader.prototype.loadWorldSync = function(worldName) { // Split in multiple functions!
		var data = fs.readFileSync("worlds/" + worldName.toLowerCase() + ".json");
		if (!data) {
			console.log("Failed while loading world");
			return null;
		}
		else {
			var worldJSON = JSON.parse(data);
			var loadedEntity;
			if (!worldJSON.entitiesCount) {

				for (var idE in worldJSON.entities) {
					var entityProperties = worldJSON.entities[idE];
					if (entityProperties.LOAD) {
						loadedEntities = singleLoader.loadEntityFileSync(entityProperties.LOAD, worldName);
						for (var idLE in loadedEntities) {
							this.applyEntityProperties(entityProperties, loadedEntities[idLE]);
							loadedEntities[idLE].id = worldJSON.entities.lenght;
							worldJSON.entities.push(loadedEntities[idLE]);
						}
						delete worldJSON.entities[idE];
					}
					else entityProperties.id = idE;

				}

				worldJSON.entitiesCount = worldJSON.entities.length;

			}
			return worldJSON;
		}
	};

	Loader.prototype.loadEntityFileSync = function(entityName, worldId) {
		var loadedEntities = null;
		if (worldId) { // Try to load world-specific entity
			if (this.entitiesCache[worldId + "/" + entityName]) {
				loadedEntities = clone(this.entitiesCache[worldId + "/" + entityName]);
			}
			else {
				try {
					this.entitiesCache[worldId + "/" + entityName] = JSON.parse(fs.readFileSync("entities/" + worldId + "/" + entityName.toLowerCase() + ".json"));
					loadedEntities = clone(this.entitiesCache[worldId + "/" + entityName]);
				}
				catch (e) { } // Isn't world-specific
			}
		}
		if (!loadedEntities) {
			try {
				if (!this.entitiesCache["global/" + entityName]) {
					this.entitiesCache["global/" + entityName] = JSON.parse(fs.readFileSync("entities/global/" + entityName.toLowerCase() + ".json"));
				}
			}
			catch (e) {
				throw "Can't load entity " + entityName + " for the world " + worldId;
			}
			loadedEntities = clone(this.entitiesCache["global/" + entityName]);
		}
		if (!(loadedEntities instanceof Array)) loadedEntities = [loadedEntities];
		for (var id in loadedEntities) {
			if (loadedEntities[id].type == 'Concave') {
				this.convertConcaveToCompound(loadedEntities[id]);
			}
		}
		return loadedEntities;
	};

	Loader.prototype.applyEntityProperties = function(entityProperties, loadedEntityProperties) {
		if (entityProperties.angle) {
			var pos = rotatePoint(
				loadedEntityProperties.x || 0, loadedEntityProperties.y || 0,
				entityProperties.angle,
				0, 0
			);
			loadedEntityProperties.x = pos.x;
			loadedEntityProperties.y = pos.y;
		}
		for (var idP in entityProperties) { // For each properties
			if (idP == "x" || idP == "y") loadedEntityProperties[idP] = (loadedEntityProperties[idP] || 0) + (entityProperties[idP] || 0);
			else if (idP == "options") {
				if (!loadedEntityProperties[idP]) loadedEntityProperties[idP] = entityProperties;
				else {
					for (var idO in entityProperties[idP]) { // For each options
						loadedEntityProperties[idP][idO] = entityProperties[idP][idO];
					}
				}
			}
			else if (idP != "LOAD") loadedEntityProperties[idP] = entityProperties[idP];
		}
	};

	Loader.prototype.convertConcaveToCompound = function(entityProperties) {
		var decompVertices = this.decomp(entityProperties.vertices);
		entityProperties.children = [];
		decompVertices.forEach((polygonVertices) => {
			entityProperties.children.push({
				type: 'Polygon',
				x: 0, // TODO
				y: 0, // TODO
				vertices: polygonVertices
			});
		});
		entityProperties.type = 'Compound';
	};

	Loader.prototype.decomp = function(vertices) {
		var aVertices = [];
		for (var id in vertices) {
			aVertices.push([vertices[id].x, vertices[id].y]);
		}
		decomp.makeCCW(aVertices);
		var aDecompVertices = decomp.quickDecomp(aVertices);
		var decompVertices = [];
		aDecompVertices.forEach((aPolygonVertices) => {
			var polygonVertices = [];
			aPolygonVertices.forEach((aPolygonVerticesCoord) => {
				polygonVertices.push({
					x: aPolygonVerticesCoord[0],
					y: aPolygonVerticesCoord[1]
				});
			});
			decompVertices.push(polygonVertices);
		});
		return decompVertices;
	};


	var singleLoader = new Loader();
	exports.Loader = singleLoader;




	// Lib

	function clone(obj) { // http://stackoverflow.com/questions/10270711/copy-associative-array-in-javascript
	    if (null == obj || "object" != typeof obj) return obj;
	    var copy = obj.constructor();
	    for (var attr in obj) {
	        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
	    }
	    return copy;
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
