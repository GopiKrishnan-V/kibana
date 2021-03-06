define(function (require) {
  var _ = require('lodash');

  return function EventsProvider(Private, Promise, Notifier) {
    var BaseObject = Private(require('factories/base_object'));
    var notify = new Notifier({ location: 'EventEmitter' });

    _(Events).inherits(BaseObject);
    function Events() {
      Events.Super.call(this);
      this._listeners = {};
      this._emitChain = Promise.resolve();
    }

    /**
     * Listens for events
     * @param {string} name - The name of the event
     * @param {function} handler - The function to call when the event is triggered
     * @returns {undefined}
     */
    Events.prototype.on = function (name, handler) {
      if (!_.isArray(this._listeners[name])) {
        this._listeners[name] = [];
      }

      var listener = {
        handler: handler
      };
      this._listeners[name].push(listener);

      (function rebuildDefer() {
        listener.defer = Promise.defer();
        listener.resolved = listener.defer.promise.then(function (value) {
          rebuildDefer();

          // we ignore the completion of handlers, just watch for unhandled errors
          Promise.resolve(handler(value)).catch(notify.fatal);
        });
      }());

      return this;
    };

    /**
     * Removes an event listener
     * @param {string} [name] - The name of the event
     * @param {function} [handler] - The handler to remove
     * @return {undefined}
     */
    Events.prototype.off = function (name, handler) {
      if (!name && !handler) {
        return this._listeners = {};
      }

      // exit early if there is not an event that matches
      if (!this._listeners[name]) return;

      // If no hander remove all the events
      if (!handler) {
        delete this._listeners[name];
      } else {
        this._listeners[name] = _.filter(this._listeners[name], function (listener) {
          return handler !== listener.handler;
        });
      }

      return this;
    };

    /**
     * Emits the event to all listeners
     *
     * @param {string} name - The name of the event.
     * @param {any} [value] - The value that will be passed to all event handlers.
     * @returns {Promise}
     */
    Events.prototype.emit = function (name, value) {
      var self = this;

      if (!self._listeners[name]) {
        return self._emitChain;
      }

      return Promise.map(self._listeners[name], function (listener) {
        return self._emitChain = self._emitChain.then(function () {
          listener.defer.resolve(value);
          return listener.resolved;
        });
      });
    };

    return Events;
  };
});
