var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('./index');

chai.use(require('sinon-chai'));

describe('responses', function () {
  it('responds with the correct ephemeral response format', function () {
    expect(new SlackBot().ephemeralResponse('foo')).to.deep.equal({
      response_type: 'ephemeral',
      text: 'foo'
    });
  });

  it('responds with the correct in-channel response format', function () {
    expect(new SlackBot().inChannelResponse('bar')).to.deep.equal({
      response_type: 'in_channel',
      text: 'bar'
    });
  });

  it('adds attachments appropriately', function () {
    var response = new SlackBot().ephemeralResponse({
      text: 'test',
      attachments: [{
        text: 'attachment'
      }]
    });

    expect(response).to.deep.equal({
      response_type: 'ephemeral',
      text: 'test',
      attachments: [{ text: 'attachment' }]
    });
  });
});

describe('managing commands', function () {
  var slackbot;
  var testCommand;

  beforeEach(function () {
    slackbot = new SlackBot();
    testCommand = function () {};
  });

  it('defaults the root function to help', function () {
    var spiedFunction = sinon.stub(slackbot, 'help');
    var callback = function () {};

    slackbot.callCommand('root', {}, callback);

    expect(spiedFunction).to.have.been.calledWithExactly({}, callback);
  });

  it('adds a command with the correct description', function () {
    slackbot.addCommand('test', 'The test command', testCommand);

    expect(slackbot.test).to.equal(testCommand);
    expect(slackbot.commands.test.desc).to.equal('The test command');
  });

  it('sets the root command with the correct description', function () {
    slackbot.setRootCommand('', 'The root command', testCommand);

    expect(slackbot.root).to.equal(testCommand);
    expect(slackbot.rootCommand.desc).to.equal('The root command');
  });

  it('adds a command with the correct arguments', function () {
    slackbot.addCommand('test arg1 arg2', 'The test command', testCommand);

    expect(slackbot.test).to.equal(testCommand);
    expect(slackbot.commands.test.args).to.deep.equal(['arg1', 'arg2']);
  });

  it('sets the root command with the correct arguments', function () {
    slackbot.setRootCommand('arg1 arg2', 'The root command', testCommand);

    expect(slackbot.root).to.equal(testCommand);
    expect(slackbot.rootCommand.args).to.deep.equal(['arg1', 'arg2']);
  });

  it('calls the correct command with the correct arguments', function () {
    var spiedFunction = sinon.spy();
    var callback = function () {};
    var givenArgs;

    slackbot.addCommand('test', 'test function', spiedFunction);
    slackbot.callCommand('test', {}, callback);

    expect(spiedFunction).to.have.been.called; // eslint-disable-line no-unused-expressions
    givenArgs = spiedFunction.getCall(0).args;
    expect(givenArgs[0]).to.deep.equal({ args: {} });
    expect(givenArgs[1]).to.equal(callback);
  });

  it('calls the root command with the correct arguments', function () {
    var spiedFunction = sinon.spy();
    var callback = function () {};
    var givenArgs;

    slackbot.setRootCommand('', 'root function', spiedFunction);
    slackbot.callCommand('root', {}, callback);

    expect(spiedFunction).to.have.been.called; // eslint-disable-line no-unused-expressions
    givenArgs = spiedFunction.getCall(0).args;
    expect(givenArgs[0]).to.deep.equal({ args: {} });
    expect(givenArgs[1]).to.equal(callback);
  });

  it('overrides previously set root commands', function () {
    var firstSpiedFunction = sinon.spy();
    var secondSpiedFunction = sinon.spy();
    var callback = function () {};
    var givenArgs;

    slackbot.setRootCommand('', 'first root function', firstSpiedFunction);
    slackbot.setRootCommand('', 'second root function', secondSpiedFunction);
    slackbot.callCommand('root', {}, callback);

    expect(slackbot.rootCommand.desc).to.equal('second root function');
    expect(firstSpiedFunction).to.have.not.been.called; // eslint-disable-line no-unused-expressions
    expect(secondSpiedFunction).to.have.been.called; // eslint-disable-line no-unused-expressions
    givenArgs = secondSpiedFunction.getCall(0).args;
    expect(givenArgs[0]).to.deep.equal({ args: {} });
    expect(givenArgs[1]).to.equal(callback);
  });

  it('restricts calling without the correct number of arguments', function () {
    var spiedFunction = sinon.stub(slackbot, 'help');
    var callback = function () {};

    slackbot.addCommand('test arg1', 'test function', testCommand);
    slackbot.callCommand('test', {}, callback);

    expect(spiedFunction).to.have.been.calledWithExactly({}, callback);
  });

  it('restricts calling root without the correct number of arguments', function () {
    var spiedFunction = sinon.stub(slackbot, 'help');
    var callback = function () {};

    slackbot.setRootCommand('arg1', 'root function', testCommand);
    slackbot.callCommand('root', {}, callback);

    expect(spiedFunction).to.have.been.calledWithExactly({}, callback);
  });
});

describe('buildRouter', function () {
  var context = {};
  var slackbot = new SlackBot({ token: 'token' });

  var assertHelp = function (event, commandContext) {
    var descriptions = [
      'arg1: Root command',
      'testA: Test command A',
      'testB arg1 arg2: Test command B',
      'testC arg1 arg2...: Test command C',
      'help: display this help message'
    ];

    slackbot.buildRouter()(event, commandContext);
    expect(commandContext.done).to.have.been.calledWithExactly(null, {
      text: 'Available commands:',
      attachments: [{ text: descriptions.join('\n') }],
      response_type: 'ephemeral'
    });
  };

  slackbot.setRootCommand('arg1', 'Root command', function (options, cb) {
    cb(null, this.ephemeralResponse('Root response: ' + options.args.arg1));
  });

  slackbot.addCommand('testA', 'Test command A', function (options, cb) {
    cb(null, this.ephemeralResponse('A response'));
  });
  slackbot.addCommand('testB arg1 arg2', 'Test command B', function (options, cb) {
    cb(null, this.ephemeralResponse('B response'));
  });
  slackbot.addCommand('testC arg1 arg2...', 'Test command C', function (options, cb) {
    cb(null, this.ephemeralResponse(options.args.arg2.join(' ')));
  });

  beforeEach(function () {
    context.done = sinon.spy();
  });

  it('fails when the provided token is invalid', function () {
    var event = {
      body: {
        token: 'foo',
        text: 'help'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly({
      text: 'Invalid Slack token',
      response_type: 'ephemeral'
    });
  });

  it('responds with help text', function () {
    var event = {
      body: {
        token: 'token',
        text: 'help'
      }
    };
    assertHelp(event, context);
  });

  it('routes to the help text by default', function () {
    var event = {
      body: {
        token: 'token',
        text: ''
      }
    };
    assertHelp(event, context);
  });

  it('routes to the root command when only args are specified', function () {
    var event = {
      body: {
        token: 'token',
        text: 'root1'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'Root response: root1',
      response_type: 'ephemeral'
    });
  });

  it('routes to the appropriate command name', function () {
    var event = {
      body: {
        token: 'token',
        text: 'testA'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'A response',
      response_type: 'ephemeral'
    });
  });

  it('supports splatting the last argument', function () {
    var event = {
      body: {
        token: 'token',
        text: 'testC these are all my words'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'are all my words',
      response_type: 'ephemeral'
    });
  });

  it('correctly splats when only one argument is given', function () {
    var event = {
      body: {
        token: 'token',
        text: 'testC arg1 arg2'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'arg2',
      response_type: 'ephemeral'
    });
  });
});
