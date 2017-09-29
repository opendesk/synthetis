/**
 * Fragments are used to define the existance and handling of a fragment of data
 * from a {@linkcode RemoteUrl} or {@linkcode LocalFilePath}. Fragments can also not
 * have any external data source and simply expose a static or dynamically built
 * data body.
 *
 * @module fragments
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const Url = require('./Url');

/**
 * TODO:
 *
 */
class Fragment {
  /**
   *
   * Options:
   *
   * parseBody: A method called after fetching the fragment to allow preprocessing of the response body.
   *            @param body The body (text or object) from the request
   *            @param context The page context object
   *            @returns {Object} body
   */
  constructor(fragmentOptions) {
    this._url = fragmentOptions.url;
    this._method = fragmentOptions.method;
    this._query = fragmentOptions.query;
    this._headers = fragmentOptions.headers;
    this._data = fragmentOptions.data;
    this._body = fragmentOptions.body; // TODO: do we want to take body too?

    this._passQueryParams = fragmentOptions.passQueryParams;
    this._bodyType = fragmentOptions.bodyType;

    this._requiredData = fragmentOptions.requiredData;
    this._required = fragmentOptions.required;

    this._parseBody = fragmentOptions.parseResponseBody;

    this._onFetchError = fragmentOptions.onFetchError;
    this._contentMissingMessage = fragmentOptions.contentMissingMessage;
    this._contentRenderErrorMessage = fragmentOptions.contentRenderErrorMessage;
  }

  get parseResponseBody() {
    return this._parseBody;
  }

  get url() {
    return this._url;
  }

  get requiredData() {
    return this._requiredData || [];
  }

  get body() {
    return this._body;
  }

  get query() {
    return this._query;
  }

  get headers() {
    return this._headers;
  }

  get passQueryParams() {
    return this._passQueryParams;
  }
  /**
   * A string representing the type of the fragment body
   * @returns {string} the body type name
   */
  get bodyType() {
    return this._bodyType || 'html';
  }

  get isFile() {
    return this._url instanceof Url.LocalFilePath;
  }

  get isLocalData() {
    return !this._url;
  }

  get localData() {
    return this._data;
  }

  get isJSON() {
    return this._bodyType === 'json';
  }

  get onFetchError() {
    return this._onFetchError;
  }

  toString() {
    const type = this.isFile ? 'Url.LocalFilePath' : `${this.bodyType.toUpperCase()} Url.Remote`;
    const q = this._query ? JSON.stringify(this._query) : '-';
    const h = this._headers ? JSON.stringify(this._headers) : '-';
    return `${type} Fragment(url: ${this._url}, query params: ${q}, headers: ${h})`;
  }

  get isRequired() {
    return !!this._required;
  }

  get method() {
    return this._method || 'get';
  }

  contentMissingMessage(fetchError) {
    const callbackOrMessage = this._contentMissingMessage;
    const message = typeof callbackOrMessage === 'function' ? callbackOrMessage(fetchError) : callbackOrMessage;
    return {
      body: message || '<p>Sorry this content could not be fetched. Please try again.</p>',
      contentType: typeof message === 'string' ? 'text/html' : 'application/json'
    };
  }

  contentRenderErrorMessage(fetchError) {
    const callbackOrMessage = this._contentRenderErrorMessage;
    const message = typeof callbackOrMessage === 'function' ? callbackOrMessage(fetchError) : callbackOrMessage;
    return message || '<p>Sorry this content could not be rendered. Please try again.</p>';
  }
}

module.exports = {
  Fragment,
  base(options) {
    const builder = function BaseFragment() {
      return new Fragment(Object.assign({}, options, { required: true }));
    };
    builder.configuration = options;
    return builder;
  },
  html(options) {
    const builder = function HTMLFragment() {
      return new Fragment(Object.assign({}, options, { bodyType: 'html' }));
    };
    builder.configuration = options;
    return builder;
  },
  json(options) {
    const builder = function JSONFragment() {
      return new Fragment(Object.assign({}, options, { bodyType: 'json' }));
    };
    builder.configuration = options;
    return builder;
  }
};