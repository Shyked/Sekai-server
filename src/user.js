/*var Worlds = require("./world").Worlds;
var Clients = require("./client").Clients;
var Loader = require("./loader").Loader;
var ChatboxMessage = require("./chatboxMessage").ChatboxMessage;
var Gamemode = require("./gamemodes");*/

var Redis = require("./redis").Redis;
var sha1 = require("sha1");




var USERS_KEY = "user:";



var Users = function() {
  this.isReady = false;
  this.events = {};
  var users = this;
  Redis.ready(function() {
    users.triggerEvent('ready');
  });

  this.users = {};
};


Users.prototype.ready = function(callback) {
  if (this.isReady) callback();
  else this.addEventListener('ready', callback);
};

Users.prototype.exists = function(nickname, callback) {
  var users = this;
  this.getReguser(this.toReguserName(nickname), function(res) {
    if (!res && res != 0) { // No registered user for this nickname
      callback(false);
    }
    else {
      callback(true);
    }
  });
};

Users.prototype.createGuest = function(currentToken, nickname, callback) {
  var users = this;
  this.getUserCount(function(count) {
    users.updateUser(count, {
      id: count,
      nickname: nickname
    }, function() {
      var token = currentToken || users.generateToken();
      users.updateToken(token, count, true, function() {
        var user = new User(count, nickname);
        callback(user, token);
      });
    });
  });
};

Users.prototype.getFromToken = function(token, callback) {
  var users = this;
  this.getToken(token, function(res) {
    if (!res) { // No user for this token
      callback(null);
    }
    else if (/^#/.test(res)) { // Token for a guest user
      users.getUser(res.substring(1), function(res) {
        callback(res, false);
      });
    }
    else { // Token for a registered user
      users.getReguser(res, function(res) {
        if (!res) callback(null);
        else users.getUser(res, function(res) {
          callback(res, true);
        });
      });
    }
  });
};

Users.prototype.signUp = function(nickname, email, hashed_password, token, callback) {
  var users = this;
  this.exists(this.toReguserName(nickname), function(res) {
    if (res) callback(null); // Reguser name already taken
    else {
      if (token) {
        users.getToken(token, function(res) {
          if (!res) { // No user for this token
            users.createGuest(token, nickname, function(user) {
              users.createReguser(user, email, hashed_password, token, callback);
            });
          }
          else if (/^#/.test(res)) { // Token for a guest user
            users.getUser(res.substring(1), function(user) {
              users.createReguser(user, email, hashed_password, token, callback);
            });
          }
          else { // Token for a registered user
            users.createGuest(token, nickname, function(user) {
              users.createReguser(user, email, hashed_password, token, callback);
            });
          }
        });
      }
      else {
        users.createGuest(token, nickname, function(user) {
          users.createReguser(user, email, hashed_password, token, callback);
        });
      }
    }
  });
};

Users.prototype.logIn = function(currentToken, nickname, hashedString, challenge, callback) {
  var users = this;
  var reguserName = users.toReguserName(nickname);
  users.getReguser(reguserName, function(reguser) {
    if (reguser)  {
      users.getUser(reguser, function(user) {
        var serverHashedString = sha1(challenge + reguserName + user.hashed_password);
        if (hashedString != serverHashedString) callback(null);
        else {
          var token = currentToken || users.generateToken();
          users.updateToken(token, reguserName, false, function() {
            callback(user, token);
          });
        }
      });
    }
  });
};

Users.prototype.createReguser = function(user, email, hashed_password, currentToken, callback) {
  users = this;
  user.email = email;
  user.hashed_password = hashed_password;
  user.save(function() {
    var reguserName = users.toReguserName(user.nickname);
    users.updateReguser(reguserName, user.id, function() {
      var token = currentToken || users.generateToken();
      users.updateToken(token, reguserName, false, function() {
        callback(user, token);
      });
    });
  });
};




Users.prototype.get = function(key, callback) {
  Redis.client.get(USERS_KEY + key, function(err, res) {
    if (err) console.log(err);
    else callback(res);
  });
};
Users.prototype.getUser = function(key, callback) {
  Redis.client.hgetall(USERS_KEY + 'user:' + key, function(err, res) {
    if (err) console.log(err);
    else {
      if (res.hashed_password) Redis.client.persist(USERS_KEY + 'user:' + key);
      else Redis.client.expire(USERS_KEY + 'user:' + key, 86400 * 8);
      callback(new User(res));
    }
  });
};
Users.prototype.getToken = function(key, callback) {
  this.get('token:' + key, function(res) {
    Redis.client.expire(USERS_KEY + "token:" + key, /^#/.test(res) ? 86400 * 7 : 86400 * 2);
    callback(res);
  });
};
Users.prototype.getReguser = function(key, callback) {
  this.get('reguser:' + key, callback);
};
Users.prototype.getUserCount = function(callback) {
  Redis.client.incr(USERS_KEY + 'user:count', function(err, res) {
    if (err) console.log(err);
    else callback(res);
  });
};

Users.prototype.update = function(key, val, callback) {
  Redis.client.set(USERS_KEY + key, val, function(err, res) {
    if (err) console.log(err);
    else if (callback) callback(res);
  });
};
Users.prototype.updateUser = function(key, values, callback) {
  var valuesArray = [];
  for (var id in values) {
    if (typeof values[id] != 'function') {
      valuesArray.push(id);
      valuesArray.push(values[id]);
    }
  }
  Redis.client.hmset(USERS_KEY + 'user:' + key, valuesArray, function(err, res) {
    if (err) console.log(err);
    else {
      if (values.hashed_password) Redis.client.persist(USERS_KEY + 'user:' + key);
      else Redis.client.expire(USERS_KEY + 'user:' + key, 86400 * 8);
      if (callback) callback(res);
    }
  });
};
Users.prototype.updateToken = function(key, val, guest, callback) {
  if (!callback) callback = function(){};
  this.update('token:' + key, ((guest) ? '#' : '') + val, function(res) {
    Redis.client.expire(USERS_KEY + "token:" + key, guest ? 86400 * 7 : 86400 * 2);
    callback(res);
  });
};
Users.prototype.updateReguser = function(key, val, callback) {
  if (!callback) callback = function(){};
  this.update('reguser:' + key, val, callback);
};

Users.prototype.generateToken = function() {
  var first = Math.random().toString(36).substr(2);
  var second = Math.random().toString(36).substr(2);
  return first + second;
};

Users.prototype.toReguserName = function(nickname) {
  return nickname.toLowerCase().replace(/[^a-z0-9]/g, "");
};



Users.prototype.triggerEvent = function(event, result) {
  for (var id in this.events[event]) {
    if (id != "count") this.events[event][id](result);
  }
};
Users.prototype.addEventListener = function(event, func) {
  if (!this.events[event]) {
    this.events[event] = {};
    this.events[event].count = 0;
  }
  this.events[event].count++;
  this.events[event][this.events[event].count] = func;
  return this.events[event].count;
};
Users.prototype.removeEventListener = function(event, id) {
  if (this.events[event][id]) delete this.events[event][id];
};
Users.prototype.resetEventListener = function(event) {
  this.events[event] = [];
};


var users = new Users();



var User = function(id, nickname, email, hashed_password) {
  p = {};
  if (typeof id == 'object') {
    p = id;
    id = p.id;
  }

  this.id = id;
  this.nickname = p.nickname || nickname || null;
  this.email = p.email || email || null;
  this.hashed_password = p.hashed_password || hashed_password || null;
};

User.prototype.save = function(callback) {
  users.updateUser(this.id, this, callback);
};





exports.Users = users;
