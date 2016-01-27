var sinon = require('sinon');
var chai = require('chai');

chai.use(require("sinon-chai"));

var expect = chai.expect;

var slack = require('./index');

describe('ephemeralResponse', function() {
  it('responds with the correct ephemeral response format', function() {
    expect(slack.ephemeralResponse('foo')).to.eql({
      type: 'ephemeral',
      text: 'foo'
    });
  });

  it('responds with the correct in-channel response format', function() {
    expect(slack.inChannelResponse('bar')).to.eql({
      type: 'in_channel',
      text: 'bar'
    });
  });
})

describe('router', function(){
  var config = {
    token: 'abc'
  };

  var commands = {
    'testA': ['Test command A', function(options, cb) {
      cb(null, slack.ephemeralResponse('A response'));
    }],

    'testB': ['Test command B', function(options, cb) {
      cb(null, slack.ephemeralResponse('B response'));
    }]
  };

  var slackbot = slack.router(config, commands);
  var context = {};

  beforeEach(function(){
    sandbox = sinon.sandbox.create();
    context.done = sandbox.spy();
  });

  afterEach(function() {
    sandbox.restore();
  });

  var assertHelp = function(event, context) {
    slackbot(event, context);

    expect(context.done).to.have.been.calledWithExactly(undefined, {
      text: 'testA: Test command A\ntestB: Test command B',
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

    slackbot(event, context);

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

    slackbot(event, context);

    expect(context.done).to.have.been.calledWithExactly(null, {
      text: 'A response',
      type: 'ephemeral'
    });
  });
});