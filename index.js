var net = require('net'),
  fs = require('fs');

function createIsPipeTaken (lib) {
  var q = lib.q,
    Fifo = lib.Fifo,
    _requests = new lib.Fifo(),
    _busy = false;

  function onConnected(defer,socket){
    socket.removeAllListeners();
    defer.resolve(socket);
    finishRequest();
  }
  function onError(pipename,defer,socket,e){
    socket.removeAllListeners();
    socket.destroy();
    if (fs.existsSync(pipename)){
      fs.unlinkSync(pipename);
    }
    setTimeout(defer.resolve.bind(defer, null), ~~(Math.random()*1000));
    finishRequest();
  }
  function isPipeTaken(pipename){
    var d = q.defer();
    if (!pipename) {
      d.reject(new Error('Pipename not provided to "isPipeTaken"'));
      return d.promise;
    }
    if (_busy) {
      _requests.push([pipename,d]);
      return d.promise;
    }
    return doRequestDefer(pipename, d);
  }
  function doRequestDefer (pipename, d) {
    _busy = true;
    var c = new net.Socket();
    c.on('error',onError.bind(null,pipename,d,c));
    c.connect(pipename,onConnected.bind(null,d,c));
    return d.promise;
  }
  function requestQDrainer(qe) {
    doRequestDefer(qe[0], qe[1]);
  }
  function finishRequest(){
    _busy = false;
    _requests.pop(requestQDrainer);
  }

  return isPipeTaken;
}

module.exports = createIsPipeTaken;
