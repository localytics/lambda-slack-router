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

  it('correctly aliases a command', function () {
    slackbot.aliasCommand('one two', 'alias');
    expect(slackbot.aliases).to.deep.equal({ alias: 'one two' });
  });

  it('supports aliasing multiple times', function () {
    slackbot.aliasCommand('one two', 'alias1', 'alias2');
    slackbot.aliasCommand('one two', 'alias3');
    expect(slackbot.aliases).to.deep.equal({ alias1: 'one two', alias2: 'one two', alias3: 'one two' });
  });

  it('finds the correct command when aliased', function () {
    var foundCommand;
    slackbot.aliasCommand('one two three', 'alias');
    foundCommand = slackbot.findCommand('alias arg1 arg2');
    expect(foundCommand).to.deep.equal({ commandName: 'one two three', args: ['arg1', 'arg2'] });
  });

  it('throws an error when attempting to alias a command that does not exist', function () {
    expect(function () { slackbot.aliasCommand('invalid', 'alias'); }).to.throw(Error);
  });

  it('throws an error when attempting to use an invalid alias', function () {
    slackbot.aliasCommand('one two', 'alias');
    expect(function () { slackbot.aliasCommand('one', 'alias'); }).to.throw(Error);
  });
});
