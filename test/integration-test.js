var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

chai.use(require('sinon-chai'));

describe('integration', function () {
  describe('testbot', function () {
    var context = {};
    var slackbot = new SlackBot({ token: 'token' });
    var assertHelp = function (event, commandContext) {
      var descriptions = [
        'testA (tA, A): Test command A',
        'testB arg1 arg2 [arg3:3]: Test command B',
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
    slackbot.addCommand('testB', ['arg1', 'arg2', { arg3: 3 }], 'Test command B', function (options, cb) {
      cb(null, this.ephemeralResponse('B response'));
    });
    slackbot.addCommand('testC', ['arg1', 'arg2...'], 'Test command C', function (options, cb) {
      cb(null, this.ephemeralResponse(options.args.arg2.join(' ')));
    });

    slackbot.aliasCommand('testA', 'tA', 'A');

    beforeEach(function () {
      context.done = sinon.spy();
      context.fail = sinon.spy();
    });

    it('fails when the provided token is invalid', function () {
      var event = {
        body: {
          token: 'foo',
          text: 'help'
        }
      };
      slackbot.buildRouter()(event, context);
      expect(context.fail).to.have.been.calledWithExactly('Invalid Slack token');
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

  describe('examples', function () {
    var context = {};

    var slackbot = new SlackBot({ token: 'token' });
    var args = ['title', { lastName: 'User' }, 'words...'];

    slackbot.addCommand('echo', args, 'Greetings', function (options, callback) {
      var response = 'Hello ' + options.args.title + ' ' + options.args.lastName;
      if (options.args.words.length) {
        response += ', ' + options.args.words.join(' ');
      }
      callback(null, this.ephemeralResponse(response));
    });

    beforeEach(function () {
      context.done = sinon.spy();
    });

    it('returns the expected response', function () {
      var event = {
        body: {
          token: 'token',
          text: 'echo Sir User how are you today?'
        }
      };
      slackbot.buildRouter()(event, context);

      expect(context.done).to.have.been.calledWithExactly(null, {
        text: 'Hello Sir User, how are you today?',
        response_type: 'ephemeral'
      });
    });
  });
});
