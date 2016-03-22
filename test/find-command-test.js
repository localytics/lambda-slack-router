var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

chai.use(require('sinon-chai'));

describe('finding the right commands', function () {
  var slackbot;

  beforeEach(function () {
    slackbot = new SlackBot();
    slackbot.addCommand('one', 'one function', function () {});
    slackbot.addCommand('one two', 'two function', function () {});
    slackbot.addCommand('one two three', 'three function', function () {});
  });

  it('finds the correct function when there is overlap', function () {
    var foundCommand = slackbot.findCommand('one two three arg1 arg2');
    expect(foundCommand).to.deep.equal({ commandName: 'one two three', args: ['arg1', 'arg2'] });
  });

  it('finds the correct function with partial matches', function () {
    var foundCommand = slackbot.findCommand('one two four arg1 arg2');
    expect(foundCommand).to.deep.equal({ commandName: 'one two', args: ['four', 'arg1', 'arg2'] });
  });

  it('finds the correct command with partial matches wrapping', function () {
    var foundCommand = slackbot.findCommand('one four three arg1 arg2');
    expect(foundCommand).to.deep.equal({ commandName: 'one', args: ['four', 'three', 'arg1', 'arg2'] });
  });
});
