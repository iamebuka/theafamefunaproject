function httpError(type, message) {
  this.type = type;
  this.message = message;
}

module.exports = httpError;
