/**
 * The body of a fragment once it has been loaded
 */
'use strict';

class FragmentBody {
  constructor(body, contentType = 'text/html') {
    this._body = body;
    this._contentType = contentType;
  }

  get body() {
    return this._body;
  }

  get contentType() {
    return this._contentType;
  }
}

module.exports = FragmentBody;
