var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

chai.use(require('sinon-chai'));

describe('integration', function () {
  describe('testbot', function () {
    var context = {};
    var callback = null;
    var slackbot = new SlackBot({ token: 'token' });

    var assertHelp = function (options, lambdaContext, lambdaCallback) {
      var descriptions = [
        'testA (tA, A): Test command A',
        'testB arg1 arg2 arg3:3: Test command B',
        'testC arg1 arg2...: Test command C',
        'help: display this help message'
      ];

      slackbot.buildRouter()(options, lambdaContext, lambdaCallback);
      expect(lambdaCallback).to.have.been.calledWithExactly(null, {
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
    slackbot.addAction('testButtonAction', function (options, cb) {
      cb(null, { text: 'You pressed the ' + options.body.actions[0].name + ' button' });
    });

    slackbot.aliasCommand('testA', 'tA', 'A');

    beforeEach(function () {
      callback = sinon.spy();
      context.fail = sinon.spy();
    });

    it('fails when the provided token is invalid', function () {
      var event = {
        body: {
          token: 'foo',
          text: 'help'
        }
      };
      slackbot.buildRouter()(event, context, callback);
      expect(context.fail).to.have.been.calledWithExactly('Invalid Slack token');
    });

    it('responds with help text', function () {
      var event = {
        body: {
          token: 'token',
          text: 'help'
        }
      };
      assertHelp(event, context, callback);
    });

    it('routes to the help text by default', function () {
      var event = {
        body: {
          token: 'token',
          text: ''
        }
      };
      assertHelp(event, context, callback);
    });

    it('routes to the help text when invalid command is specified', function () {
      var event = {
        body: {
          token: 'token',
          text: 'invalid'
        }
      };
      assertHelp(event, context, callback);
    });

    it('routes to the appropriate command name', function () {
      var event = {
        body: {
          token: 'token',
          text: 'testA'
        }
      };
      slackbot.buildRouter()(event, context, callback);

      expect(callback).to.have.been.calledWithExactly(null, {
        text: 'A response',
        response_type: 'ephemeral'
      });
    });

    it('routes to the appropriate action', function () {
      var event = {
        body: 'payload={"actions":[{"name":"testButtonAction","value":"testValue"}],"token":"token"}'
      };
      slackbot.buildRouter()(event, context, callback);

      expect(callback).to.have.been.calledWithExactly(null, {
        text: 'You pressed the testButtonAction button'
      });
    });

    it('supports splatting the last argument', function () {
      var event = {
        body: {
          token: 'token',
          text: 'testC these are all my words'
        }
      };
      slackbot.buildRouter()(event, context, callback);

      expect(callback).to.have.been.calledWithExactly(null, {
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
      slackbot.buildRouter()(event, context, callback);

      expect(callback).to.have.been.calledWithExactly(null, {
        text: 'arg2',
        response_type: 'ephemeral'
      });
    });

    it('passes the entire event on to the command', function () {
      var event = {
        body: {
          token: 'token',
          text: 'testC arg1 arg2'
        },
        foo: 'bar'
      };
      var stub = sinon.stub(slackbot, 'testC');
      slackbot.buildRouter()(event, context, callback);

      event.args = { arg1: 'arg1', arg2: ['arg2'] };
      expect(stub).to.have.been.calledWithExactly(event, callback);
      stub.restore();
    });
  });

  describe('examples', function () {
    var lambdaCallback = null;
    var slackbot = new SlackBot({ token: 'token' });
    var args = ['title', { lastName: 'User' }, 'words...'];

    slackbot.addCommand('echo', args, 'Greetings', function (options, callback) {
      var response = 'Hello ' + options.args.title + ' ' + options.args.lastName;
      if (options.args.words.length) {
        response += ', ' + options.args.words.join(' ');
      }
      callback(null, slackbot.ephemeralResponse(response));
    });

    beforeEach(function () {
      lambdaCallback = sinon.spy();
    });

    it('returns the expected response', function () {
      var event = {
        body: {
          token: 'token',
          text: 'echo Sir User how are you today?'
        }
      };
      slackbot.buildRouter()(event, {}, lambdaCallback);

      expect(lambdaCallback).to.have.been.calledWithExactly(null, {
        text: 'Hello Sir User, how are you today?',
        response_type: 'ephemeral'
      });
    });
  });

  describe('no token provided', function () {
    var lambdaCallback = null;
    var slackbot = new SlackBot();

    slackbot.addCommand('test', 'Test', function (options, callback) {
      callback(null, this.ephemeralResponse('test'));
    });

    beforeEach(function () {
      lambdaCallback = sinon.spy();
    });

    it('does not raise an error for no token passed', function () {
      var event = { body: { text: 'test' } };
      slackbot.buildRouter()(event, {}, lambdaCallback);
      expect(lambdaCallback).to.have.been.calledWithExactly(null, slackbot.ephemeralResponse('test'));
    });
  });

  describe('ping command', function () {
    var pingEvent = { source: 'aws.events', resources: ['test-ping-test'], body: { text: 'test' } };

    it('returns quickly', function () {
      var succeed = sinon.spy();
      new SlackBot({ pingEnabled: true }).buildRouter()(pingEvent, { succeed: succeed });
      expect(succeed).to.have.been.calledWithExactly('Ok');
    });

    it('ignores when pingEnabled is falsy', function () {
      var slackbot = new SlackBot();
      var lambdaCallback = sinon.spy();

      slackbot.addCommand('test', 'Test', function (options, callback) {
        callback('foobar');
      });

      slackbot.buildRouter()(pingEvent, {}, lambdaCallback);
      expect(lambdaCallback).to.have.been.calledWithExactly('foobar');
    });
  });
});
