Synthetis
---------

A library currently used by `composer-proxy` that provides abstractions over
content fragments and a mechanism for rendering placeholders (fragment tags) for 
content inside those fragments.

An example use case is to build a reverse proxy which aggregates responses from
various backend services and generates a single response.

How?
----

The renderer is currently implemented using regular expressions to perform the
fragment tag searches. The fragment to be searched must currently reside in memory.

Ideally this would instead be implemented by parsing a stream to make the solution
faster and more scalable however writing say a stack based parser for this purpose
was beyond the scope of the current implementation. 

Run tests
---------

Run the specs with 

`> npm t`

Documentation
-------------

To generate the JSDoc documentation use:

`> npm run docs`

Then open `./docs/index.html`

Authors
-------

- Opendesk (https://opendesk.cc)
- Stephen Ierodiaconou (http://stephenierodiaconou.com)

License
-------

See `UNLICENSE`
