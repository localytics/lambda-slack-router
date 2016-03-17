var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

chai.use(require('sinon-chai'));

describe('integration', function () {
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
  slackbot.addCommand(['testB', 'arg1', 'arg2'], 'Test command B', function (options, cb) {
    cb(null, this.ephemeralResponse('B response'));
  });
  slackbot.addCommand(['testC', 'arg1', 'arg2...'], 'Test command C', function (options, cb) {
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