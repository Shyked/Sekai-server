require("requestanimationframe");
require("modulo");
var Clients = require("client").Clients;
var Worlds = require("world").Worlds;
var Synchronizer = require("synchronizer").Synchronizer;
var Entity = require("entity").Entity;


var server = require('http').createServer();

Clients.attachServer(server);




Synchronizer.setStartingWorldId("flat");



server.listen((process.env.PORT) ? process.env.PORT : 4433);
console.log("Server started");







/* From Ogar */

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
        else if (first == "log") {
            console.log(Worlds.get("newton").entities);
        }
	}
	catch (e) {
		console.log(e);
	}
};
