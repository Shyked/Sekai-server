var Clients = function() {

	this.clients = {};
	this.count = 0;

	this.events = {
		new: [],
		delete: []
	};

};

Clients.prototype.attachServer = function(server) {
	this.server = server;

	var io = require('socket.io')(server, {
		pingInterval: 5000,
		pingTimeout: 10000,
		cors: {
			origin: [
				"https://sekai.shyked.fr",
				"http://sekai.shyked.fr",
				"https://shyked.fr/sekai",
				"http://shyked.fr/sekai",
				"http://localhost"
			],
			methods: ['GET', 'POST', 'PUT']
		}
	});
	var Clients = this;
	io.on('connection', function(socket){

		Clients.new(socket.id, socket);

		socket.on('disconnect', function(){
			Clients.delete(socket.id);
		});

	});
};

Clients.prototype.new = function(id, socket) {
	var newClient = new Client(id, socket);
	this.clients[id] = newClient;
	this.count++;
	this.triggerEvent('new', newClient);
	return newClient;
};

Clients.prototype.delete = function(id) {
	if (id instanceof Client) id = id.id;
	this.clients[id].triggerEvent('delete', this.clients[id]);

	for (var idC in this.clients[id].intervals) {
		clearInterval(this.clients[id].intervals[idC]);
	}

	this.clients[id] = null;
	delete this.clients[id];
	this.count--;
};

Clients.prototype.get = function(id) {
	return this.clients[id];
};


/**
 * broadcast
 *
 * Broadcasts the "content" with the type "type" according to the "condition"
 *
 * @param type string The type of the message to send
 * @param content string The content of the message
 * @param condition function A function with the client.data parameter that will
 * 							 return a boolean
 *
 */
Clients.prototype.broadcast = function(type, content, condition) {
	for (var id in this.clients) {
		if (condition(this.clients[id].data)) {
			this.clients[id].emit(type, content);
		}
	}
};


Clients.prototype.triggerEvent = function(event, result) {
	for (var id in this.events[event]) {
		this.events[event][id](result);
	}
};

Clients.prototype.addEventListener = function(event, func) {
	this.events[event].push(func);
};




var Client = function(id, socket) {

	this.id = id;
	this.socket = socket;

	this.data = {};
	this.intervals = {};

	this.events = {
		delete: []
	};

};


Client.prototype.setInterval = function(name, func, time) {
	var client = this;
	this.intervals[name] = setInterval(function(){func(client);}, time);
};

Client.prototype.clearInterval = function(name) {
	if (this.intervals[name]) {
		clearInterval(this.intervals[name]);
		delete this.intervals[name];
		return true;
	}
	return false;
};


Client.prototype.emit = function(type, content) {
	this.socket.emit(type, content);
};

Client.prototype.addSocketEvent = function(on, exec) {
	var client = this;
	this.socket.on(on, function(content) { exec(client, content);});
};



Client.prototype.triggerEvent = function(event, result) {
	for (var id in this.events[event]) {
		this.events[event][id](result);
	}
};

Client.prototype.addEventListener = function(event, func) {
	this.events[event].push(func);
};





exports.Clients = new Clients();
