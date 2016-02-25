var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('./index');

chai.use(require('sinon-chai'));

describe('responses', function () {
  it('responds with the correct ephemeral response format', function () {
    expect((new SlackBot()).ephemeralResponse('foo')).to.eql({
      response_type: 'ephemeral',
      text: 'foo'
    });
  });

  it('responds with the correct in-channel response format', function () {
    expect((new SlackBot()).inChannelResponse('bar')).to.eql({
      response_type: 'in_channel',
      text: 'bar'
    });
  });

  it('adds attachments appropriately', function () {
    var response = (new SlackBot()).ephemeralResponse({
      text: 'test',
      attachments: [{
        text: 'attachment'
      }]
    });

    expect(response).to.eql({
      response_type: 'ephemeral',
      text: 'test',
      attachments: [{ text: 'attachment' }]
    });
  });
});

describe('managing commands', function () {
  it('adds a command with the correct description', function () {
    var slackbot = new SlackBot();
    var testCommand = function () {};
    slackbot.addCommand('test', 'The test command', testCommand);

    expect(slackbot.test).to.eq(testCommand);
    expect(slackbot.commands.test.desc).to.eq('The test command');
  });

  it('adds a command with the correct arguments', function () {
    var slackbot = new SlackBot();
    var testCommand = function () {};
    slackbot.addCommand('test arg1 arg2', 'The test command', testCommand);

    expect(slackbot.test).to.eq(testCommand);
    expect(slackbot.commands.test.args).to.deep.eq(['arg1', 'arg2']);
  });

  it('calls the correct command with the correct arguments', function () {
    var sandbox = sinon.sandbox.create();
    var spiedFunction = sandbox.spy();
    var slackbot = new SlackBot();
    var callback = function () {};
    var givenArgs;

    slackbot.addCommand('test', 'test function', spiedFunction);
    slackbot.callCommand('test', {}, callback);

    givenArgs = spiedFunction.getCall(0).args;
    expect(givenArgs[0]).to.deep.eq({ args: {} });
    expect(givenArgs[1]).to.eq(callback);
  });

  it('restricts calling without the correct number of arguments', function () {
    var sandbox = sinon.sandbox.create();
    var spiedFunction = sandbox.spy();
    var slackbot = new SlackBot();
    var callback = function () {};

    slackbot.addCommand('test arg1', 'test function', function () {});
    slackbot.help = spiedFunction;
    slackbot.callCommand('test', {}, callback);

    expect(spiedFunction).to.have.been.calledWithExactly({}, callback);
  });
});

describe('buildRouter', function () {
  var context = {};
  var slackbot = new SlackBot({ token: 'token' });

  var assertHelp = function (event, commandContext) {
    var descriptions = [
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

  it('routes to the help text when invalid command is specified', function () {
    var event = {
      body: {
        token: 'token',
        text: 'invalid'
      }
    };
    assertHelp(event, context);
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
});
