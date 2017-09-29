/**
 * Encapsulations of urls or file paths
 *
 * @module urls
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */

const url = require('url');
const path = require('path');

/**
 * Base Url class
 * @private
 */
class Url {

  // 'protected'

  // Split and parse logic to replace :params in url sections
  // should handle: 'a', '/:a', ':a', ':a/:b', ':a/foo', '/:a/foo:b'
  _applyParameters(params, templatePath) {
    function _templatePathSections(templatePath) {
      return templatePath.split('/').map(s => s.split(':'));
    }
    return this._insertPathInterpolations(_templatePathSections(templatePath), params);
  }

  _insertPathInterpolations(sections, params) {
    return sections.map((section) => {
      const [part, keyName] = section;
      const replacement = keyName ? params[keyName] : '';
      return part + replacement;
    }).join('/');
  }
}

/**
 * A remote url. Composed of a base part and a relative part
 */
class RemoteUrl extends Url {
  /**
   * Create a new remote url. The `basePath` can be either a string base path,
   * or it be an object `{url, authorization}`, where `url` is the string base
   * path and `authorization` is an authorisation value to associate to the base.
   * Normally the `authorization` value will be sent with requests for this Url
   * but thats up to the request machinery.
   *
   * The relative part can also be a `function(context, basePath): string`
   * which takes the context provided to the `resolve` method
   *
   * @param basePath {object/string} the base path of the url which can be an object as described above
   * @param relativePart {string/function} a string or function that returns a string representing the relative part of the url
   */
  constructor(basePath, relativePart) {
    super();
    this._base = typeof basePath === 'string' ? basePath : basePath.url;
    this._authorization = basePath.authorization;
    this._relative = relativePart;
  }

  /**
   * Returns the fully resolved url. Note that any parts of the url that start
   * with a : will be replaced by any matching params value on the request context.
   * if you wish to have the : character in the final url, simply add it in url encoded
   *
   * @param context {object} the current request context object
   * @returns {string} the fully resolved url
   */
  resolve(context = {}) {
    const base = this._base;
    const rel = this._relative;
    const template = (typeof rel === 'function') ? rel(context, base) : rel;
    if (!template) {
      return base;
    }
    return url.resolve(base, this._applyParameters(context.params, template));
  }

  /**
   * Expose the authorization value the Url had been configured with. Normally
   * used to set the Authorization header on requests for this Url
   * @returns {string} The authorization header value if set
   */
  get authorization() {
    return this._authorization;
  }

  /**
   * Return a human readable version of this class instance
   * @returns {string}
   */
  toString() {
    return `Url.Remote(${this._base}, ${this._relative}, ${this._authorization})`;
  }
}

/**
 * A local file path. Composed of fragments
 */
class LocalFilePath extends Url {
  /**
   * Creates a local file path. Arguments are joined. The arguments are string or
   * `function(context, args): string`
   * @param args {string/function} the path parts, strings or functions
   */
  constructor(...args) {
    super();
    this._args = args;
  }

  /**
   * Returns the fully resolved file path.
   * @param context {object} the current request context object
   * @param relative {boolean} defaults to true. If true adds current working directory path when resolving to create absolute
   * @returns {string} the fully resolved path
   */
  resolve(context = {}, relative = true) {
    const args = this._args;
    const parts = args.map((p) => {
      if (typeof p === 'function') {
        return p(context, args);
      }
      return p;
    });
    return this._applyParameters(context.params, path.join(
      relative ? process.cwd() : '',
      ...parts
    ));
  }

  /**
   * Return a human readable version of this class instance
   * @returns {string}
   */
  toString() {
    return `Url.LocalFile(${this._args})`;
  }
}

module.exports = {
  RemoteUrl,
  LocalFilePath,
  /**
   * Factory method to return a new remote url instance
   * @returns {RemoteUrl}
   */
  remote(base, path) {
    return new RemoteUrl(base, path);
  },
  /**
   * Factory method to return a new file path instance
   * @returns {LocalFilePath}
   */
  localFile(...args) {
    return new LocalFilePath(...args);
  }
};