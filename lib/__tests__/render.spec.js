const readFileSync = require('fs').readFileSync;
const render = require('../render');
const routeFactory = require('../Route').route;
const Fragment = require('../Fragment');
const FragmentBody = require('../FragmentBody');
const Url = require('../Url');

const localBasePath = __dirname + '/fixtures';
const logger = console;
logger.debug = logger.info;

// fetchers

const localDataFetcher = (fragment) => Promise.resolve(new FragmentBody(fragment.localData));

// Note: the fetcher currently has responsibility to handle errors in a non-exception
// manner and obey `required` prop of fragments. This may change in future.
const localFileFetcher = (fragment) => {
  try {
    return Promise.resolve(
      new FragmentBody(readFileSync(fragment.url.resolve({}, false)).toString())
    );
  } catch (e) {
    if (fragment.isRequired) {
      throw e;
    }
    return Promise.resolve(fragment.contentMissingMessage(e));
  }
};

const localFileOrDataFetcher = (fragment) => Promise.resolve(
  fragment.isFile ? localFileFetcher(fragment) : localDataFetcher(fragment)
);

describe('render', () => {
  describe('successful fetch', () => {
    let b, r;

    beforeEach(() => {
      b = Fragment.base({
        data: 'test'
      });
      r = routeFactory({
        baseTemplate: b
      })(console);
    });

    test('should render a basic fragment', async () => {
      const body = await render(r, localDataFetcher);
      expect(body).toMatchSnapshot();
    });
  });

  describe('failed fetch', () => {
    let b, r;

    const e = new Error('Failed to fetch');
    const localDataFetcher = () => Promise.reject(e);

    beforeEach(() => {
      b = Fragment.base({
        data: 'test'
      });
      r = routeFactory({
        baseTemplate: b
      })(console);
    });

    test('should throw', async () => {
      await expect(render(r, localDataFetcher)).rejects.toEqual(e);
    });
  });

  describe('render scenarios', () => {
    let r;

    describe('greeter', () => {
      beforeEach(() => {
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'greeter.html')
        });
        r = routeFactory({
          baseTemplate: b
        })(console);
      });

      test('should render a basic fragment', async () => {
        const body = await render(r, localFileFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with simple fragment inject', () => {
      beforeEach(() => {
        const f = Fragment.html({
          url: Url.localFile(localBasePath, 'greeter.html')
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplate.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            greeter: f
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with embedded fragment with injected data', () => {
      beforeEach(() => {
        const f = Fragment.json({
          data: {
            myData: 1234
          }
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplateWithEmbed.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            dataModel: f
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileOrDataFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with repeat embedded fragment with injected data', () => {
      beforeEach(() => {
        const dataModel = Fragment.json({
          data: JSON.parse(readFileSync(localBasePath + '/basicData.json').toString())
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'templateWithRepeatEmbed.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            dataModel
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileOrDataFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with repeat embedded fragment with no data', () => {
      beforeEach(() => {
        const f = Fragment.json({
          data: undefined
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'templateWithRepeatEmbed.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            dataModel: f
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileOrDataFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with nested fragments with injected data', () => {
      beforeEach(() => {
        const anotherTemplate = Fragment.html({
          url: Url.localFile(localBasePath, 'anotherTemplate.html')
        });
        const nestedFragment = Fragment.html({
          url: Url.localFile(localBasePath, 'simpleTemplateWithEmbed.html')
        });
        const dataModel = Fragment.json({
          data: {
            myData: 1234
          }
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplate.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            greeter: anotherTemplate,
            nestedFragment,
            dataModel
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileOrDataFetcher);
        expect(body).toMatchSnapshot();
      });
    });
  });

  describe('rendering error scenarios', () => {
    describe('base template with embedded fragment with missing data', () => {
      beforeEach(() => {
        const f = Fragment.json({
          data: undefined
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplateWithEmbed.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            dataModel: f
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileOrDataFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with repeat embedded fragment with missing data', () => {
      const f = Fragment.json({
        data: {
          data: {
            array: [undefined, undefined]
          }
        }
      });
      beforeEach(() => {
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'templateWithRepeatEmbed.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            dataModel: f
          }
        })(logger);
      });

      test('should render fragment', async () => {
        const body = await render(r, localFileOrDataFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('missing local base path', () => {
      beforeEach(() => {
        const b = Fragment.base({});
        r = routeFactory({
          baseTemplate: b
        })(console);
      });

      test('should throw', async () => {
        await expect(render(r, localDataFetcher)).rejects.toMatchSnapshot();
      });
    });

    describe('base template with not required missing fragment', () => {
      beforeEach(() => {
        const f = Fragment.html({
          url: Url.localFile(localBasePath, 'foobar.html')
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplate.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            greeter: f
          }
        })(logger);
      });

      test('should render fragment and show error message', async () => {
        const body = await render(r, localFileFetcher);
        expect(body).toMatchSnapshot();
      });
    });

    describe('base template with unknown fragment name', () => {
      beforeEach(() => {
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplate.html')
        });
        r = routeFactory({
          baseTemplate: b
        })(logger);
      });

      test('should throw and not render', async () => {
        await expect(render(r, localFileFetcher)).rejects.toMatchSnapshot();
      });
    });


    describe('base template with required missing fragment', () => {
      beforeEach(() => {
        const f = Fragment.html({
          url: Url.localFile(localBasePath, 'foobar.html'),
          required: true
        });
        const b = Fragment.base({
          url: Url.localFile(localBasePath, 'simpleTemplate.html')
        });
        r = routeFactory({
          baseTemplate: b,
          fragments: {
            greeter: f
          }
        })(logger);
      });

      test('should throw and not render', async () => {
        await expect(render(r, localFileFetcher)).rejects.toBeDefined();
      });
    });
  });
});
