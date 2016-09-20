(function() {


	var Worlds = require("./world").Worlds;
	var Clients = require("./client").Clients;
	var Player = require("./player").Player;
	var ChatboxMessage = require("./chatboxMessage").ChatboxMessage;

	var Synchronizer = function() {
		this.startingWorldId = null;

		var that = this;
		Clients.addEventListener('new', function(client) {
			that.initPlayer(client);
		});
		Clients.addEventListener('delete', function(client) {
			client.data.player.clear();
		});
	};

	Synchronizer.prototype.setStartingWorldId = function(startingWorldId) {
		this.startingWorldId = startingWorldId;
	};

	Synchronizer.prototype.initPlayer = function(client) {
		client.data.player = new Player(client, this);
		var synchronizer = this;
		client.data.player.onNicknameOk = function(askedWorld) {
			this.goToWorld(askedWorld || synchronizer.startingWorldId);
			var msgWelcome = new ChatboxMessage();
			msgWelcome.setType(ChatboxMessage.type.SERVER);
			msgWelcome.setMsg("Welcome in Sekai, " + this.nickname + " !");
			msgWelcome.setStyle(ChatboxMessage.style.WELCOME);
			this.client.emit('chatboxMessage', JSON.stringify(msgWelcome));
		};
	};





	var singleSynchronizer = new Synchronizer();
	exports.Synchronizer = singleSynchronizer;


})();
