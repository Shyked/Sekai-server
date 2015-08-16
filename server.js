var Clients = require("client").Clients;
var Worlds = require("world").Worlds;
var Synchronizer = require("synchronizer").Synchronizer;
var Entity = require("entity").Entity;


var server = require('http').createServer();
var io = require('socket.io')(server);
io.on('connection', function(socket){

	Clients.new(socket.id, socket);

	socket.on('disconnect', function(){
		Clients.delete(socket.id);
	});

});




var startingWorldId = 1;

var startingWorld = Worlds.new(startingWorldId);
Synchronizer.init(startingWorldId);

startingWorld.addEntity('Rectangle', {
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	options: {
		isStatic: true
	}
});
startingWorld.addEntity('Rectangle', {
	x: 400,
	y: 700,
	width: 800,
	height: 20,
	options: {
		isStatic: true
	}
});
startingWorld.addEntity('Rectangle', {
	x: -200,
	y: 500,
	width: 600,
	height: 20,
	options: {
		angle: Math.PI/4,
		isStatic: true
	}
});
startingWorld.addEntity('Rectangle', {
	x: 1000,
	y: 500,
	width: 600,
	height: 20,
	options: {
		angle: -Math.PI/4,
		isStatic: true
	}
});

/*setTimeout(function() {
	Synchronizer.addEntity(startingWorld, 'Rectangle', {
		x: 420,
		y: 200,
		width: 70,
		height: 70
	});
},5000)*/

setTimeout(function() {
	Synchronizer.addEntity(startingWorld, 'Circle', {
		x: 100,
		y: 300,
		radius: 40,
		options: {
			frictionStatic: 0.1,
			restitution: 0.8
		}
	});
},4000)




server.listen(4433);
console.log("Server started");





var readline = require('readline');	
var in_ = readline.createInterface({ input: process.stdin, output: process.stdout });
setTimeout(prompt, 100);


// Console functions

function prompt() {
    in_.question(">", function(str) {
    	parseCommands(str);
        return prompt(); // Too lazy to learn async
    });	
};

function parseCommands(str) {
    // Splits the string
    var split = str.split(" ");

    // Process the first string value
    var first = split[0].toLowerCase();

    try {
	    // add [WorldId] [Shape] [Properties]
	    if (first == "add") {
	    	Synchronizer.addEntity(Worlds.get(JSON.parse(split[1])), split[2], JSON.parse(split[3]));
	    }
	}
	catch (e) {
		console.log(e);
	}
};
