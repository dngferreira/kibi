define(function (require) {
  let _ = require('lodash');
  let sinon = require('auto-release-sinon');

  function MockState(defaults) {
    this.on = _.noop;
    this.off = _.noop;
    this.save = sinon.stub();
    this.replace = sinon.stub();
    _.assign(this, defaults);
  }

  MockState.prototype.resetStub = function () {
    this.save = sinon.stub();
    return this;
  };

  return MockState;
});
