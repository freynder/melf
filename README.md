# Melf <img src="melf.png" align="right" alt="melf-logo" title="Melf's Minute Meteors"/>

[npm module](https://www.npmjs.com/package/melf) to perform (a)synchronous remote procedure calls for JavaScript processes.
To avoid deadlocks, synchronous remote procedure calls can be interleaved (only) by locally declared remote procedures.

## Client API

### `melf = require("melf")(address, alias)`

* `address :: string | object | melf.Orchestrator`
* `alias :: string`
* `melf :: melf.Melf`

### `output = melf.rpcall(recipient, rpname, input)`

* `recipient :: string`
* `rpname :: string`
* `input :: JSON`
* `output :: JSON`

### `melf.rpcall(recipient, rpname, (error, output) => {...})`

* `recipient :: string`
* `rpname :: string`
* `input :: JSON`
* `error :: Error`
* `output :: JSON`

### `melf.rprocedures[rpname] = (origin, input, callback) => {...}`

* `rpname :: string`
* `origin :: string`
* `input :: JSON`
* `callback(error, output)`
  * `error :: Error`
  * `output :: JSON`

## Server API

If Melf is installed globally, a Melf server can be launched with:

```txt
> melf --port 8080
Listening on { address: '::', family: 'IPv6', port: 8080 }
```

### `orchestrator = require("melf/orchestrator")([logger])`

* `orchestrator :: antena.Receptor`
* `logger(origin, recipient, meteor)`
  * `origin :: string` 
  * `recipient :: string`
  * `meteor :: string`
