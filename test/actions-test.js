var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

describe('managing actions', function () {
  var slackbot;
  var testAction;

  beforeEach(function () {
    slackbot = new SlackBot();
    testAction = function () {};
  });

  it('adds an action', function () {
    slackbot.addAction('test', testAction);

    expect(slackbot.test).to.equal(testAction);
  });
});
