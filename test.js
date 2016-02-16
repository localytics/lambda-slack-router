var sinon = require('sinon'),
  chai = require('chai'),
  expect = chai.expect,
  SlackBot = require('./index');

chai.use(require('sinon-chai'));

describe('responses', function() {
  it('responds with the correct ephemeral response format', function() {
    expect((new SlackBot()).ephemeralResponse('foo')).to.eql({
      response_type: 'ephemeral',
      text: 'foo'
    });
  });

  it('responds with the correct in-channel response format', function() {
    expect((new SlackBot()).inChannelResponse('bar')).to.eql({
      response_type: 'in_channel',
      text: 'bar'
    });
  });

  it('adds attachments appropriately', function() {
    expect((new SlackBot()).ephemeralResponse({ text: 'test', attachments: [{ text: 'attachment' }] })).to.eql({
      response_type: 'ephemeral',
      text: 'test',
      attachments: [{ text: 'attachment' }]
    });
  });
});

describe('managing commands', function() {
  it('adds a command with the correct description', function() {
    var slackbot = new SlackBot(),
      testCommand = function(options, callback) {};
    slackbot.addCommand('test', 'The test command', testCommand);

    expect(slackbot.test).to.eq(testCommand);
    expect(slackbot.commands.test.desc).to.eq('The test command');
  });

  it('adds a command with the correct arguments', function() {
    var slackbot = new SlackBot(),
      testCommand = function(options, callback) {};
    slackbot.addCommand('test <arg1> <arg2>', 'The test command', testCommand);

    expect(slackbot.test).to.eq(testCommand);
    expect(slackbot.commands.test.args).to.deep.eq(['<arg1>', '<arg2>']);
  });

  it('calls the correct command with the correct arguments', function() {
    var sandbox = sinon.sandbox.create(),
      spiedFunction = sandbox.spy(),
      slackbot = new SlackBot();
    slackbot.addCommand('test', 'test function', spiedFunction);

    var options = {}, callback = new Function();
    slackbot.callCommand('test', options, callback);

    expect(spiedFunction).to.have.been.calledWithExactly(options, callback);
  });

  it('restricts calling without the correct number of arguments', function() {
    var sandbox = sinon.sandbox.create(),
      spiedFunction = sandbox.spy(),
      slackbot = new SlackBot();
    slackbot.addCommand('test <arg1>', 'test function', new Function());
    slackbot.help = spiedFunction;

    var options = {}, callback = new Function();
    slackbot.callCommand('test', options, callback);

    expect(spiedFunction).to.have.been.calledWithExactly(options, callback);
  });
});

describe('buildRouter', function() {
  var context = {},
    slackbot = new SlackBot({ token: 'token' });

  slackbot.addCommand('testA', 'Test command A', function(options, cb) {
    cb(null, this.ephemeralResponse('A response'));
  });
  slackbot.addCommand('testB', 'Test command B', function(options, cb) {
    cb(null, this.ephemeralResponse('B response'));
  });

  beforeEach(function() {
    context.done = sinon.spy();
  });

  var assertHelp = function(event, context) {
    slackbot.buildRouter()(event, context);
    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'Available commands:',
      attachments: [{ text: 'testA: Test command A\ntestB: Test command B\nhelp: display this help message' }],
      response_type: 'ephemeral'
    });
  };

  it('fails when the provided token is invalid', function() {
    var event = {
      'body': {
        'token': 'foo',
        'text': 'help'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly({
      'text': 'Invalid Slack token',
      'response_type': 'ephemeral'
    });
  });

  it('responds with help text', function() {
    var event = {
      'body': {
        'token': 'token',
        'text': 'help'
      }
    };
    assertHelp(event, context);
  });

  it('routes to the help text by default', function() {
    var event = {
      'body': {
        'token': 'token',
        'text': ''
      }
    };
    assertHelp(event, context);
  });

  it('routes to the help text when invalid command is specified', function() {
    var event = {
      'body': {
        'token': 'token',
        'text': 'invalid'
      }
    };
    assertHelp(event, context);
  });

  it('routes to the appropriate command name', function() {
    var event = {
      'body': {
        'token': 'token',
        'text': 'testA'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'A response',
      response_type: 'ephemeral'
    });
  });
});
