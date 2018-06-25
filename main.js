const SplitIn = require("./split-in.js");

const noop = () => {};

const onmessage = (event) => {
  event.target._melf._pull()
};

const onerror = (event) => {
  (event.target._melf.onerror||noop)(event);
};

const onclose = (event) => {
  (event.target._melf.onclose||noop)(event);
};

const remote_procedure_not_found = (origin, input, callback) => {
  callback(new Error("Remote procedure not found"));
};

function _async_rpcall (recipient, name, data, callback) {
  do {
    var token = Math.random().toString(36).substring(2, 10);
  } while (token in this._callbacks);
  this._callbacks[token] = callback;
  this._websocket.send(recipient+"/"+this.alias+"/"+token+"/"+name+"/"+JSON.stringify(data === void 0 ? null : data));
}

function _pull () {
  const [status, message, headers, body] = this._antena.request("GET", "/"+this.alias, {}, null);
  if (status !== 200)
    throw new Error(status+" ("+message+")");
  if (body !== "") {
    const meteors = body.split("\n");
    for (let index = 0, length=meteors.length; index<length; index++) {
      if (meteors[index][0] === "/") {
        const [,echo, hint, output] = SplitIn(meteors[index], "/", 4);
        if (echo in this._callbacks) {
          callback = this._callbacks[echo];
          delete this._callbacks[echo];
          if (hint === "s") {
            callback(null, JSON.parse(output));
          } else if (hint === "f") {
            callback(JSON.parse(output));
          } else if (hint === "e") {
            const [message, stack] = JSON.parse(output);
            const error = new Error(message);
            error.stack = stack;
            callback(error);
          } else {
            console.warn("Illegal hint: "+hint);
          }
        } else {
          console.warn("Unmatched echo: "+echo);
        }
      } else {
        const [origin, token, name, input] = SplitIn(meteors[index], "/", 4);
        const self = this;
        (this.rprocedures[name]||remote_procedure_not_found)(origin, JSON.parse(input), (error, data) => {
          if (error) {
            if (error instanceof Error) {
              self._websocket.send(origin+"//"+token+"/e/"+JSON.stringify([error.message, error.stack]));
            } else {
              self._websocket.send(origin+"//"+token+"/f/"+JSON.stringify(error));
            }
          } else {
            self._websocket.send(origin+"//"+token+"/s/"+JSON.stringify(data));
          }
        });
      }
    }
  }
}

function rpcall (recipient, name, data, callback) {
  if (callback)
    return this._async_rpcall(recipient, name, data, callback);
  let pending = true;
  let result = null;
  this._async_rpcall(recipient, name, data, (error, data) => {
    if (error)
      throw error;
    pending = false;
    result = data;
  });
  while (pending)
    this._pull();
  return result;
}

module.exports = (antena, alias, callback) => {
  const websocket = antena.WebSocket("/"+alias);
  websocket.onerror = (event) => { callback(new Error(event.message || "Could not connect to: "+event.target.URL)) };
  websocket.onmessage = (event) => {
    websocket.onmessage = onmessage;
    websocket.onerror = onerror;
    websocket.onclose = onclose;
    websocket._melf = {
      rpcall: rpcall,
      rprocedures: Object.create(null),
      alias: event.data,
      _websocket: websocket,
      _callbacks: Object.create(null),
      _async_rpcall: _async_rpcall,
      _pull: _pull,
      _antena: antena
    };
    callback(null, websocket._melf);
  };
};
