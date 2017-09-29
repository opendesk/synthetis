/**
 * The primary render method used to render a fragment
 *
 * @module render
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const Renderer = require('./Renderer');
const FragmentManager = require('./FragmentManager');
const FragmentBody = require('./FragmentBody');

/**
 * Renders a given {@linkcode Route} and fetches {@linkcode Fragment}s required
 * as appropriate using the `fragmentFetcher` method.
 *
 * The `fragmentFetcher` method takes 3 parameters:
 *
 * `fetch(fragment: Fragment, context: Context, options: {...}): Promise<FragmentBody>`
 *
 * The first paramters is a `Fragment` instances, and the `context` object
 * should at least provide a `logger` object providing the Log4j log methods.
 * The response is a Promise containing a future `FragmentBody`
 *
 * @param route {Route} a `Route` instance
 * @param fragmentFetcher {Function} a function which takes a fragment, rendering context and optional options.
 * @param context {object} The rendering context
 * @returns {Promise<FragmentBody>}
 */
async function render(route, fragmentFetcher, context = {}) {
  const manager = new FragmentManager(route, fragmentFetcher, context);
  const baseBody = await manager.baseBody();
  const contentType = await manager.baseContentType();
  const renderer = new Renderer(context.logger || route.logger || console, manager);
  const body = await renderer.renderRecursive(baseBody, 1);
  return new FragmentBody(body, contentType);
}

module.exports = render;
