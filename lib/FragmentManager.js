/**
 * Manages the set of {@linkcode Fragment} entities for a given {@linkcode Route}.
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

/**
 * This is used by the Renderer to abstract the fetching of fragments for a route
 *
 * @private
 */
class FragmentManager {
  /**
   * Instantiate the Manager, this prepares the logic to fetch the fragments for
   * the route but does not fetch them unless requested.
   *
   * The `fragmentFetcher` method is documented in the docs for the `render`
   * method.
   *
   * @param {Route} route The Route instance
   * @param fragmentFetcher {Function} a function which takes a fragment, rendering context and optional options.
   * @param {object} context The rendering context
   */
  constructor(route, fragmentFetcher, context) {
    this._context = context;
    this._fetch = fragmentFetcher;
    this._route = route;
    this._sourceFragments = {};
    this._mapSources(route.fragments || {}, (s, k) => {
      this._sourceFragments[k] = s();
    });
  }

  baseBody(options = {}) {
    return this._fetchBase(options).then(f => f.body);
  }

  baseContentType(options = {}) {
    return this._fetchBase(options).then(f => f.contentType);
  }

  fetchFragmentBody(template, options = {}) {
    return this._fetch(template, this._context, options).then(f => f.body);
  }

  fragmentBody(name, options = {}) {
    return this._fetch(this._sourceFragments[name], this._context, options).then(f => f.body);
  }

  fragment(name) {
    return this._sourceFragments[name];
  }

  hasFragment(name) {
    return !!this._sourceFragments[name];
  }

  _fetchBase(options) {
    return this._fetch(this._route.baseTemplate(), this._context, options);
  }

  _mapSources(s, p) {
    return Object.keys(s).map(k => p(s[k], k));
  }
}

module.exports = FragmentManager;