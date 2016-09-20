(function() {

	var functionsToCall = {
		0: [],
		1: []
	};
	var current = 0;
	var window = global;

	var lastTime = (new Date()).getTime();
	var currentTime = (new Date()).getTime();
	var diffTime = 0;
	var count = 0;
	var offsetTime = 0;

	global.requestAnimationFrame = function(fct) {
		functionsToCall[current].push(fct);
	}

	var interval = function() {
		var cftc = functionsToCall[current] // Current functions to call
		current = -current+1;
		for (var id in cftc) {
			cftc[id]();
		}
		functionsToCall[-current+1] = [];

		count++;
		currentTime = (new Date()).getTime();
		diff = currentTime - lastTime;
		lastTime = currentTime;
		if (diff > 16) offsetTime--;
		else if (diff < 15) offsetTime++;
		setTimeout(interval,16 + offsetTime)
	}
	interval();


    //exports.Worlds = new Worlds();


})();