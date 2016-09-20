var Database = function() {

  // var sqlite3 = require('sqlite3');
  // var db = new sqlite3.Database('./db/main.sqlite');

  // Check if table exists
  // db.run();
  /*db.each("SELECT * FROM users", function(err, row) {
    console.log("a");
  });

  db.run("CREATE TABLE users (id INTEGER, name VARCHAR2)", function(err) {
    console.log("b");
  });*/

  // this.checkForMigrations();

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
