(function() {


	var Worlds = require("./world").Worlds;
	var Clients = require("./client").Clients;
	var Player = require("./player").Player;
	var Users = require('./user').Users;
	var ChatboxMessage = require("./chatboxMessage").ChatboxMessage;

	var Synchronizer = function() {
		this.readyStates = {
			users: false
		};
		this.events = {};

		this.startingWorldId = null;

		var that = this;
		Clients.addEventListener('new', function(client) {
			that.initPlayer(client);
		});
		Clients.addEventListener('delete', function(client) {
			client.data.player.clear();
		});

		var sync = this;
		var checkReady = function() {
			var ready = true;
			for (var id in sync.readyStates) {
				if (!sync.readyStates) ready = false;
			}
			if (ready) sync.triggerEvent('ready');
		};

		Users.ready(function() {
			if (!sync.readyStates['users']) {
				sync.readyStates['users'] = true;
				if (sync.isReady()) sync.triggerEvent('ready');
			}
		});

	};

	Synchronizer.prototype.isReady = function() {
		var ready = true;
		for (var id in this.readyStates) {
			if (!this.readyStates) ready = false;
		}
		if (ready) this.triggerEvent('ready');
	};

	Synchronizer.prototype.ready = function(callback) {
		if (this.isReady()) callback();
		else this.addEventListener('ready', callback);
	};

	Synchronizer.prototype.setStartingWorldId = function(startingWorldId) {
		this.startingWorldId = startingWorldId;
	};

	Synchronizer.prototype.initPlayer = function(client) {
		client.data.player = new Player(client, this);
		var synchronizer = this;
	};




	Synchronizer.prototype.triggerEvent = function(event, result) {
	  for (var id in this.events[event]) {
	    if (id != "count") this.events[event][id](result);
	  }
	};
	Synchronizer.prototype.addEventListener = function(event, func) {
	  if (!this.events[event]) {
	    this.events[event] = {};
	    this.events[event].count = 0;
	  }
	  this.events[event].count++;
	  this.events[event][this.events[event].count] = func;
	  return this.events[event].count;
	};
	Synchronizer.prototype.removeEventListener = function(event, id) {
	  if (this.events[event][id]) delete this.events[event][id];
	};
	Synchronizer.prototype.resetEventListener = function(event) {
	  this.events[event] = [];
	};



	var singleSynchronizer = new Synchronizer();
	exports.Synchronizer = singleSynchronizer;


})();
