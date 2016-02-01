var sinon = require('sinon');
var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var SlackBot = require('./index');

describe('responses', function() {
  it('responds with the correct ephemeral response format', function() {
    expect((new SlackBot()).ephemeralResponse('foo')).to.eql({
      type: 'ephemeral',
      text: 'foo'
    });
  });

  it('responds with the correct in-channel response format', function() {
    expect((new SlackBot()).inChannelResponse('bar')).to.eql({
      type: 'in_channel',
      text: 'bar'
    });
  });

  it('adds attachments appropriately', function() {
    expect((new SlackBot()).ephemeralResponse({ text: 'test', attachments: [{ text: 'kdeisz' }] })).to.eql({
      type: 'ephemeral',
      text: 'test',
      attachments: [{ text: 'kdeisz' }]
    });
  });
});

describe('managing commands', function() {
  it('adds a command with the correct description', function() {
    var slackbot = new SlackBot(),
      testCommand = function(options, callback) {};
    slackbot.addCommand('test', 'The test command', testCommand);

    expect(slackbot.test).to.eq(testCommand);
    expect(slackbot.commands.test).to.eq('The test command');
  });

  it('calls the correct command with the correct arguments', function() {
    var sandbox = sinon.sandbox.create(),
      spiedFunction = sandbox.spy(),
      slackbot = new SlackBot();
    slackbot.addCommand('test', 'test function', spiedFunction);

    var options = {}, callback = {};
    slackbot.callCommand('test', options, callback);

    expect(spiedFunction).to.have.been.calledWithExactly(options, callback);
  });
});

describe('buildRouter', function() {
  var context = {},
    sandbox,
    slackbot = new SlackBot({ token: 'abc' });

  slackbot.addCommand('testA', 'Test command A', function(options, cb) {
    cb(null, this.ephemeralResponse('A response'));
  });
  slackbot.addCommand('testB', 'Test command B', function(options, cb) {
    cb(null, this.ephemeralResponse('B response'));
  });

  beforeEach(function(){
    sandbox = sinon.sandbox.create();
    context.done = sandbox.spy();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var assertHelp = function(event, context) {
    slackbot.buildRouter()(event, context);
    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'Available commands:',
      attachments: [{ text: 'testA: Test command A\ntestB: Test command B\nhelp: display this help message' }],
      type: 'ephemeral'
    });
  };

  it('fails when the provided token is invalid', function() {
    var event = {
      'body': {
        'token': 'xyz',
        'text': 'help'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly({
      'text': 'Invalid Slack token',
      'type': 'ephemeral'
    });
  });

  it('responds with help text', function() {
    var event = {
      'body': {
        'token': 'abc',
        'text': 'help'
      }
    };
    assertHelp(event, context);
  });

  it('routes to the help text by default', function() {
    var event = {
      'body': {
        'token': 'abc',
        'text': ''
      }
    };
    assertHelp(event, context);
  });

  it('routes to the help text when invalid command is specified', function() {
    var event = {
      'body': {
        'token': 'abc',
        'text': 'testC'
      }
    };
    assertHelp(event, context);
  });

  it('routes to the appropriate command name', function() {
    var event = {
      'body': {
        'token': 'abc',
        'text': 'testA'
      }
    };
    slackbot.buildRouter()(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'A response',
      type: 'ephemeral'
    });
  });
});
