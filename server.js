require("requestanimationframe");
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





/*startingWorld.addEntity('Rectangle', {
	x: 1000,
	y: 500,
	width: 4000,
	height: 20,
	options: {
		treatment : 'static'
	}
}).physicsBody.state.angular.pos = -Math.PI/4;*/

var rectSize = 700;
for (var i = -10000 ; i < 10000 ; i += rectSize) {
	yVar = Math.floor(Math.random()*300);
	startingWorld.addEntity('Rectangle', {
		x: i,
		y: 200 + yVar/2,
		width: rectSize,
		height: 320 - yVar,
		options: {
			treatment : 'static'
		}
	});
}

startingWorld.addEntity('Polygon', {
	x: 0,
	y: 0,
	vertices: [
		{x: 0, y: 0},
		{x: 20, y: 0},
		{x: 300, y: 40},
		{x: 5, y: 35},
	],
	options: {
		treatment : 'static'
	}
});




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
