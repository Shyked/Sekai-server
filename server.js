require("./src/requestanimationframe");
require("./src/modulo");
var Clients = require("./src/client").Clients;
var Worlds = require("./src/world").Worlds;
var Synchronizer = require("./src/synchronizer").Synchronizer;
var Entity = require("./src/entity").Entity;


var server = require('http').createServer();
var initialized = false;

Clients.attachServer(server);


// Error.stackTraceLimit = Infinity;



Synchronizer.setStartingWorldId("planets");


Synchronizer.ready(function() {
    if (initialized) return;
    initialized = true;

    server.listen((process.env.PORT) ? process.env.PORT : 4433);
    console.log("Server started");




    /* From Ogar : CLI */

    var readline = require('readline');
    var in_ = readline.createInterface({ input: process.stdin, output: process.stdout });
    setTimeout(prompt, 100);


    // Console functions

    function prompt() {
        in_.question("> ", function(str) {
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
            else if (first == "debugger") {
                debugger;
            }
    	}
    	catch (e) {
    		console.log(e);
    	}
    };

});
