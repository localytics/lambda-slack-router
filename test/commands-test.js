var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

chai.use(require('sinon-chai'));

describe('managing commands', function () {
  var slackbot;
  var testCommand;

  beforeEach(function () {
    slackbot = new SlackBot();
    testCommand = function () {};
  });

  it('adds a command with the correct description', function () {
    slackbot.addCommand('test', 'The test command', testCommand);

    expect(slackbot.test).to.equal(testCommand);
    expect(slackbot.commands.test.desc).to.equal('The test command');
  });

  it('adds a command with the correct arguments', function () {
    slackbot.addCommand('test', ['arg1', 'arg2'], 'The test command', testCommand);

    expect(slackbot.test).to.equal(testCommand);
    expect(slackbot.commands.test.args).to.deep.equal(['arg1', 'arg2']);
  });

  it('calls the correct command with the correct arguments', function () {
    var spiedFunction = sinon.spy();
    var callback = function () {};
    var givenArgs;

    slackbot.addCommand('test', 'test function', spiedFunction);
    slackbot.callCommand('test', {}, callback);

    givenArgs = spiedFunction.getCall(0).args;
    expect(givenArgs[0]).to.deep.equal({ args: {} });
    expect(givenArgs[1]).to.equal(callback);
  });

  it('restricts calling without the correct number of arguments', function () {
    var spiedFunction = sinon.stub(slackbot, 'help');
    var callback = function () {};

    slackbot.addCommand('test', ['arg1'], 'test function', testCommand);
    slackbot.callCommand('test', {}, callback);

    expect(spiedFunction).to.have.been.calledWithExactly({}, callback);
  });
});
