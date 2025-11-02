const clientError = require("./clientError");
class InvariantError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvariantError";
    this.statusCode = 400;
  }
}

module.exports = InvariantError;
