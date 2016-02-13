require("requestanimationframe");
require("modulo");
var Clients = require("client").Clients;
var Worlds = require("world").Worlds;
var Synchronizer = require("synchronizer").Synchronizer;
var Entity = require("entity").Entity;


var server = require('http').createServer();

Clients.attachServer(server);




Synchronizer.setStartingWorldId("planets");



server.listen((process.env.PORT) ? process.env.PORT : 4433);
console.log("Server started");




/*var request = require("request");

request("http://lenovo-pc:8888/nodejs/ex/query/getWorldFiles.php?world=nova", function(error, response, body) {
    console.log(error);
    console.log(body);
});*/







/* From Ogar : CLI */

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
