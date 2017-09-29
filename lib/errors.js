/**
 * Error type classes
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

/**
 * Base error class, extends Error
 *
 * @extends Error
 */
class BaseError extends Error {
  /**
   * Ensure we have a string `message` property so that bluebird is happy that
   * this is an {@link https://github.com/petkaantonov/bluebird/blob/40ed56c31922e558ea2f129996ab15d5cf507b84/src/util.js#L236 error object}
   * @param error {error} an instance of a source Error
   */
  constructor(error) {
    const message = error.message || '';
    super(message);
    this.message = message;
    this.name = this.constructor.name;
    this._originalError = error;
  }

  /**
   * Get original error used to create this instance
   * @returns {Error} original Error
   */
  get original() {
    return this._originalError;
  }
}

/**
 * Error type class for when fragments fail to render.
 *
 * @extends module:errors~BaseError
 */
class FragmentRenderError extends BaseError {}

module.exports = {
  BaseError,
  FragmentRenderError
};
