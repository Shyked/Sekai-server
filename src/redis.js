var redis = require("redis");

var Redis = function() {

  this.isReady = false;
  this.events = {};

  var that = this;

  if (process.env.REDIS) {
    this.client = redis.createClient(process.env.REDIS);
  }
  else {
    this.client = redis.createClient("redis://127.0.0.1:6379/0", { retry_strategy: function(err) {
      if (err.error.code == "ECONNREFUSED") {
        that.client = redis.createClient({
          "host": "::1",
          "port": 6379,
          "db": 0
        });
        that.client.on('ready', function() { that.triggerEvent('ready'); });
      }
    }});
  }
  this.client.on('ready', function() { that.triggerEvent('ready'); });

};


Redis.prototype.ready = function(callback) {
  if (this.isReady) callback();
  else this.addEventListener('ready', callback);
};


Redis.prototype.getCount = function(callback) {

};

Redis.prototype.print = redis.print;




Redis.prototype.triggerEvent = function(event, result) {
  for (var id in this.events[event]) {
    if (id != "count") this.events[event][id](result);
  }
};
Redis.prototype.addEventListener = function(event, func) {
  if (!this.events[event]) {
    this.events[event] = {};
    this.events[event].count = 0;
  }
  this.events[event].count++;
  this.events[event][this.events[event].count] = func;
  return this.events[event].count;
};
Redis.prototype.removeEventListener = function(event, id) {
  if (this.events[event][id]) delete this.events[event][id];
};
Redis.prototype.resetEventListener = function(event) {
  this.events[event] = [];
};



exports.Redis = new Redis();
