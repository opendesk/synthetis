
module.exports = {
  render: require('./lib/render'),
  DSL: {
    Route: require('./lib/Route'),
    Fragment: require('./lib/Fragment'),
    Url: require('./lib/Url')
  },
  Errors: require('./lib/errors')
};
