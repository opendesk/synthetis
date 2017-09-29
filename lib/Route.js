/**
 * Instances of Routes are used to configure route specific behaviour, either
 * creation of composed pages, or redirects.
 *
 * Example below creates a route on `/this/is/a/:route` and sets `greeting` on the `context` for
 * the request at the start of the request. It also sets a pair of custom headers on
 * every response, one of which is a method which is passed the context. The
 * Route is configured with 2 fragments (see {@link module:fragments~Fragment Fragments}
 * for more details on those).
 *
 * @example
 * dsl.route({
 *   path: '/this/is/a/:route',
 *   responseHeaders: {
 *     'X-New-Greet-Header': function (context) { return context.greeting; },
 *     'X-Static-Info': 'this is the same for everyone'
 *   },
 *   baseTemplate: baseFragment,
 *   fragments: {
 *     part1: fragment1,
 *     part2: fragment2
 *   },
 *   onRequest: function (context) {
 *     context.greeting = 'Hello ' + context.request.params['route'];
 *   }
 * })
 *
 * @module routes
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

/**
 * Routes are used to configure endpoints on the proxy, and collect together
 * the related fragments etc. See the {@link module:routes routes module}
 * documentation for an example.
 */
class Route {
  /**
   * Build a new instance of the Route.
   *
   * @param {object} options the Route configuration
   * @param {string} options.path The path of the endpoint on the proxy. eg a koa-router format route
   * @param {string} [options.method=GET] The HTTP method for this route (`path`)
   * @param {object} [options.responseHeaders] Headers to add to the response
   * @param {Fragment} [options.baseTemplate] The base Fragment, the first fragment to be fetched and processed. Either specify this or `redirect`
   * @param {string} [options.redirect] A URL to redirect to. Either specify this or `baseTemplate`
   * @param {object} [options.fragments] a map of Fragment string names to Fragment instances
   * @param {Function} [options.onCreate] a callback (`function (logger): Promise`) which is executing when the Fragment is instatiated.
   * @param {Function} [options.onError] a callback (`function (Error, context): Promise`) which is called when an Error is throw during processing of a request
   * @param {Function} [options.onRequest] a callback (`function (context): Promise`) which is called at the start of processing a new request for this Route
   * @param {string} [options.cacheMaxAge] the value to set for the `max-age` directive in the `Cache-Control` header. If not configured Cache-Control header is determined by router or value set in `headers` option
   * @param {Logger} appLogger the application level logger
   */
  constructor(options, appLogger) {
    this._path = options.path;
    this._baseTemplate = options.baseTemplate;
    this._method = options.method && options.method.toLowerCase();
    this._headers = options.responseHeaders;
    this._fragments = options.fragments;
    this._onCreate = options.onCreate;

    this._logger = appLogger;

    // Return 'false' from onRequest to cancel processing of this request with
    // this Route
    this._onRequest = options.onRequest;
    this._cacheMaxAge = options.cacheMaxAge;
    this._onError = options.onError;
    this._redirectDestination = options.redirect;

    this._prepare();
  }

  /**
   * The fragment configured as the base.
   * @returns {Fragment|*}
   */
  get baseTemplate() {
    return this._baseTemplate;
  }

  /**
   * Source fragments the route was configured with
   * @returns {Object|*}
   */
  get fragments() {
    return this._fragments;
  }

  /**
   * Call the `onRequest` callback with the given context. If non is set will
   * return `true`
   * @param context
   * @returns {boolean}
   */
  onRequest(context) {
    return this._onRequest ? this._onRequest(context) : true;
  }

  /**
   * The max age if configured
   * @returns {number|string}
   */
  get maxAge() {
    return this._cacheMaxAge;
  }

  /**
   * The response headers if configured
   * @returns {Object}
   */
  get responseHeaders() {
    return this._headers;
  }

  /**
   * The HTTP method this endpoint responds on, by default GET
   * @returns {string} The HTTP method name (lowercase)
   */
  get method() {
    return this._method || 'get';
  }

  /**
   * The destination redirect URL if configured
   * @returns {string}
   */
  get redirect() {
    return this._redirectDestination;
  }

  /**
   * Gets the configured path of this route
   * @returns {string} the route path (see koa-router)
   */
  get path() {
    return this._path;
  }

  get logger() {
    return this._logger;
  }

  /**
   * Convert the Route instance into a human readable form
   * @returns {string}
   */
  toString() {
    const f = this._fragments ?
      Object.keys(this._fragments).map(k => [k, JSON.stringify(this._fragments[k].configuration)]) :
      '-';
    return `Route(path: ${this.method} ${this.path}, ` +
      `template: ${JSON.stringify(this._baseTemplate && this._baseTemplate.configuration)}, fragments: ${f})`;
  }

  // 'private' methods

  _prepare() {
    this._onCreate && this._onCreate(this._logger);
  }
}

module.exports = {
  Route,
  route(options) {
    return (logger) => new Route(options, logger);
  }
};