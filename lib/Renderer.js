/**
 * The primary fragment compositor
 *
 * @licence `The Unlicense`, see LICENSE file included in this distribution.
 */
'use strict';

const Promise = require('bluebird');
const dotEngine = require('dot');
const getProperty = require('lodash.get');

const FragmentRenderError = require('./errors').FragmentRenderError;
const fragment = require('./Fragment');

dotEngine.templateSettings = {
  evaluate:    /\[\[([\s\S]+?)\]\]/g,
  interpolate: /\[\[=([\s\S]+?)\]\]/g,
  encode:      /\[\[!([\s\S]+?)\]\]/g,
  use:         /\[\[#([\s\S]+?)\]\]/g,
  define:      /\[\[##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\]\]/g,
  conditional: /\[\[\?(\?)?\s*([\s\S]*?)\s*\]\]/g,
  iterate:     /\[\[~\s*(?:\]\]|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\]\])/g,
  varname:     'model'
};

const MAX_DEPTH = 5;

/**
 * The primary Route renderer. Is initialised with a RouteFragmentManager and
 * exposes a recursive method to render fragments.
 *
 * The input is searched for injection tags using regular expressions.
 *
 * @private
 */
class Renderer {
  constructor(logger, fragmentManager) {
    this._logger = logger;
    this._manager = fragmentManager;
  }

  async renderRecursive(fragmentBody, currentDepth) {
    if (currentDepth > MAX_DEPTH) {
      this._logger.error('Max render depth has been reached, rendering will stop');
      return fragmentBody;
    }

    if (typeof fragmentBody === 'undefined') {
      throw new Error('A fragment body is undefined');
    }

    const fragmentTagRegexp = this._regExpFragmentInject();
    const fragmentAttribRegexp = this._regExpAttributes();

    let match, fragmentRenderPromises = [];

    while (match = fragmentTagRegexp.exec(fragmentBody)) { // eslint-disable-line
      const [, commandAttribs, embeddedTemplate] = match;

      const [
        containsTemplate,
        iterateOverDataName,
        templateNameToInject,
        specifiedRequired,
        requiredSources
      ] = this._testInjectAttributes(fragmentAttribRegexp, commandAttribs);

      let template;
      if (templateNameToInject) {
        if (!this._manager.hasFragment(templateNameToInject)) {
          return Promise.reject(new Error('A source fragment does not exist ' +
            `with name ${templateNameToInject}`));
        }
        template = this._manager.fragment(templateNameToInject);
      } else if (containsTemplate) {
        // build an actual fragment class for the embeddedTemplate
        template = fragment.html({
          required: specifiedRequired,
          data: embeddedTemplate
        })();
      } else {
        throw new Error('A fragment inject found with no name or embed');
      }
      fragmentRenderPromises.push(
        this._boundFragmentRender(
          currentDepth,
          template,
          specifiedRequired,
          requiredSources,
          iterateOverDataName,
          match.index,
          fragmentTagRegexp.lastIndex
        )
      );
    }

    const renderedContent = await Promise.all(fragmentRenderPromises);
    return this._injectReplacements(fragmentBody, renderedContent);
  }

  // 'private' methods

  // Combine resulting text sections
  _injectReplacements(sourceText, parts) {
    // Each content part comes with the start and end positions of where it should be injected
    const [endOfMatches, lead] = parts.reduce(([prevStart, acc], [start, end, part]) => {
      const prefix = sourceText.substring(prevStart, start);
      return [end, acc + prefix + part];
    }, [0, '']);
    return lead + sourceText.substring(endOfMatches);
  }

  // Each render creates new regex instances as each contain a current index pointer
  _regExpFragmentInject() {
    return /<fragment-inject ([^>]+)>([\s\S]*?)<\/fragment-inject>/igm;
  }

  // These search the attributes of the fragment-inject hence are not global
  _regExpAttributes() {
    return {
      name: /fragment-name=["']([^\s>]+)["']/im,
      template: /(?:^|\s)template(?:$|\s|>)/im,
      required: /(?:^|\s)required(?:$|\s|>)/im,
      repeat: /fragment-repeat=["']([^\s>]+)["']/im,
      models: /models=["']([^\s>]+)["']/im
    };
  }
  
  _testInjectAttributes(regex, commandAttribs) {
    // if true, embeddedTemplate should contain template
    const containsTemplate = regex.template.test(commandAttribs);
    // render the template as many times as the list specified in fragment repeat
    const iterateOver = regex.repeat.exec(commandAttribs);
    const iterateOverDataName = iterateOver && iterateOver[1];
    //the name of the fragment template to render into here
    const name = regex.name.exec(commandAttribs);
    const templateNameToInject = name && name[1];
    // This fragment is required, if it cant render whole Route fails
    const specifiedRequired = regex.required.test(commandAttribs);
    // The fragments of data required to render this
    const sourcesMatch = regex.models.exec(commandAttribs);
    const requiredSources = (sourcesMatch && sourcesMatch[1] &&
      sourcesMatch[1].split(',').map(s => s.trim())) || [];
    this._logger.debug(`> Rendering ${containsTemplate ? 'embedded ' : 'fetched '} ` +
      'template with required sources:', requiredSources);
    if (templateNameToInject) {
      this._logger.debug('> Name of template to inject: ', templateNameToInject);
    }
    if (iterateOverDataName) {
      this._logger.debug('> Iterate over data with name: ', iterateOverDataName);
    }
    return [
      containsTemplate,
      iterateOverDataName,
      templateNameToInject,
      specifiedRequired,
      requiredSources
    ];
  }

  // Close around the matched fragment information so its still accessible when
  // operation complete
  async _boundFragmentRender(
    currentDepth,
    toInject,
    isRequired,
    requiredSources,
    repeatedDataName,
    matchIndex,
    lastIndex
  ) {
    const content = await this._manager.fetchFragmentBody(toInject);
    const rendered = await this._renderFragment(
      currentDepth,
      toInject,
      content,
      toInject.isRequired || isRequired,
      requiredSources || toInject.requiredData,
      repeatedDataName
    );
    return [matchIndex, lastIndex, rendered];
  }

  // Any fragments that will be injected in must be processed before, the doT engine
  // is then used to render the resulting template
  async _renderFragmentPart(currentDepth, fragmentBody, dataForView) {
    try {
      const str = await this.renderRecursive(fragmentBody, currentDepth + 1);
      return dotEngine.template(str)(dataForView);
    } catch (error) {
      this._logger.error(`DoT.js Rendering failed with error ${error.message}`, error);
      throw new FragmentRenderError(error);
    }
  }

  // Perform the actual rendering of the injected or embedded fragment
  async _renderFragment(
    currentDepth,
    injectedFragment,
    fragmentContent,
    isRequired,
    requiredSources,
    repeatedDataName
  ) {
    try {
      const repeatedDataNameFragName = repeatedDataName && repeatedDataName.split('.')[0];
      const repeatedDataNameFragment = repeatedDataName && this._manager.hasFragment(repeatedDataNameFragName);
      if (repeatedDataName && (!repeatedDataNameFragment || !requiredSources.includes(repeatedDataNameFragName))) {
        const error = new FragmentRenderError(new Error('Attempting to render a list ' +
          'of data with source which doesnt exist or isnt specified as a ' +
          `dependency with accessor '${repeatedDataName}'`));
        this._logger.error('Renderer: ', error.message);
        throw error;
      }

      const dataObject = requiredSources.map((name) => {
        if (!this._manager.hasFragment(name)) {
          const error = new FragmentRenderError(new Error('Attempting to render with a ' +
            'data source fragment which doesnt exist in configuration ' +
            `(name ${name})`));
          this._logger.error('Renderer: ', error.message);
          throw error;
        }
        return [name, this._manager.fragmentBody(name, {
          neverHandleError: name === repeatedDataNameFragName
        })];
      }).reduce((acc, [key, promise]) => {
        acc[key] = promise;
        return acc;
      }, {});

      const sources = await Promise.props(dataObject);

      if (repeatedDataName) {
        // If source fails simply return generic content load message, else render the list fragment
        if (sources[repeatedDataNameFragName] instanceof Error) {
          return this._manager.fragment(repeatedDataNameFragName)
            .contentMissingMessage(sources[repeatedDataNameFragName]);
        }

        const dataBody = getProperty(sources, repeatedDataName);
        if (dataBody && dataBody.length) {
          return await Promise.all(dataBody.map((d) => this._renderFragmentPart(currentDepth, fragmentContent, Object.assign({
            current: d
          }, sources)))).then(data => data.join(''));
        } else {
          return '';
        }
      } else {
        // Render a simple embedded fragment
        return await this._renderFragmentPart(currentDepth, fragmentContent, sources);
      }
    } catch(error) {
      if (error instanceof FragmentRenderError && !isRequired) {
        this._logger.error('A non required fragment failed to render');
        return injectedFragment.contentRenderErrorMessage(error) || '';
      }
      throw error;
    }
  }
}

module.exports = Renderer;
