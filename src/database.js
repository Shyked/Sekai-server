var Database = function() {

  var sqlite3 = require('sqlite3');
  this.db = new sqlite3.Database('./db/main.sqlite');

  // Check if table exists
  // db.run();
  /*db.each("SELECT * FROM users", function(err, row) {
    console.log("a");
  });
  */

  var db = this;
  this.db.run("CREATE TABLE `users` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `name` VARCHAR2);", function(err) {
    db.db.run("INSERT INTO users (name) VALUES ('Someone')");
  });

  // this.checkForMigrations();

};



Database.prototype.getCount = function(callback) {
  this.db.each("SELECT COUNT(id)as \"count\" FROM users", function(err, row) {
    callback(row["count"]);
  });
};



Database.prototype.checkForMigrations = function() {
  // Load migration.json, 0 if doesn't exist
  // Load every ./db/migrations/nbr_name with nbr > migration.json
  // for (var id in migrations) {
    // Run migration
  // }
  // Update migration.json (create if doesn't exist)
};



exports.Database = new Database();
