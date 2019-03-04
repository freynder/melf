
// alias#token%rpname/body
// &token/body
// |token/body

const AntenaEmitter = require("antena/emitter");

const max = parseInt("zzzzzz", 36);

function terminate (callback) {
  this._emitter.terminate(callback);
}

function destroy () {
  return this._emitter.destroy();
}

const rpcallhelper = (melf, recipient, rpname, data, callback) => {
  melf._counter++;
  if (melf._counter === max)
    melf._counter = 1;
  const token = melf._counter.toString(36);
  melf._callbacks[token] = callback;
  return recipient+"/"+melf.alias+"#"+token+"%"+rpname+"/"+JSON.stringify(data);
};

const localize = (alias) => (line) => line.startsWith("    at ") ?
  "    " + alias + " " + line.substring(4) :
  line;

const makeonmeteor = (melf) => (meteor) => {
  const head = meteor.substring(0, meteor.indexOf("/"));
  const index = melf._done.indexOf(head);
  if (index === -1) {
    melf._done.push(head);
    const body = JSON.parse(meteor.substring(head.length+1));
    if (head[0] === "&" || head[0] === "|") {
      const token = head.substring(1);
      const callback = melf._callbacks[token];
      delete melf._callbacks[token];
      if (head[0] === "&") {
        callback(null, body);
      } else {
        error = new Error(body[1]);
        error.name = body[0];
        error.stack = body[0]+": "+body[1]+"\n"+body[2].join("\n");
        callback(error);
      }
    } else {
      const alias = head.substring(0, head.indexOf("#"));
      const token = head.substring(alias.length+1, head.indexOf("%"));
      const pname = head.substring(alias.length+1+token.length+1);
      const callback = (error, result) => {
        if (error) {
          const lines = error.stack.substring(error.name.length + 2 + error.message.length + 1).split("\n");
          melf._emitter.post(alias+"/|"+token+"/"+JSON.stringify([error.name, error.message, lines.map(localize(melf.alias))]));
        } else {
          melf._emitter.post(alias+"/&"+token+"/"+JSON.stringify(result));
        }
      };
      if (pname in melf.rprocedures) {
        melf.rprocedures[pname](alias, body, callback);
      } else {
        callback(new Error("Procedure not found: "+pname));
      }
    }
  } else {
    melf._done.splice(index, 1);
  }
};

function rpcall (recipient, rpname, data, callback) {
  if (callback)
    return this._emitter.post(rpcallhelper(this, recipient, rpname, data, callback));
  let pending = true;
  let result = null;
  this._emitter.pull(rpcallhelper(this, recipient, rpname, data, (error, data) => {
    if (error) {
      error.stack = (
        error.name + ": " +
        error.message + "\n" +
        error.stack.substring(error.name.length+2+error.message.length+1) + "\n" +
        (new Error("foo")).stack.substring("Error: foo\n".length).split("\n").map(localize(this.alias)).join("\n"));
      throw error;
    }
    pending = false;
    result = data;
  })).split("\n").forEach(this._onmeteor);
  while (pending)
    this._emitter.pull("").split("\n").forEach(this._onmeteor);
  return result;
}

module.exports = (address, alias, callback) => {
  AntenaEmitter(address, alias, (error, emitter) => {
    if (error)
      return callback(error);
    const melf = {
      _callbacks: {__proto__:null},
      _counter: 0,
      _done: [],
      _emitter: emitter,
      _onmeteor: null,
      rprocedures: {__proto__:null},
      terminate,
      destroy,
      rpcall,
      alias
    };
    melf._onmeteor = emitter.onpush = makeonmeteor(melf);
    emitter._melf = melf;
    callback(null, melf);
  });
};