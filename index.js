'use strict';

var ArgParser = require('./lib/arg-parser');
var qs = require('qs');

// build a response to return to Slack
var buildResponse = function (response_type, response) {
  var modifiedResponse = response;
  if (typeof response === 'string') {
    return { response_type: response_type, text: response };
  }
  modifiedResponse.response_type = response_type;
  return modifiedResponse;
};

// wraps logic around routing
function SlackBot(config) {
  this.config = config || {};
  this.commands = {};
  this.aliases = {};
}

// add a command
SlackBot.prototype.addCommand = function (command, args, desc, callback) {
  var realCallback = callback;
  var realDesc = desc;
  var realArgs = args;

  // if only 3 arguments are passed, then we're assuming no args are used for
  // this function, in which case we should shift all of the arguments down one
  if (arguments.length === 3) {
    realCallback = desc;
    realDesc = args;
    realArgs = [];
  }

  this[command] = realCallback;
  this.commands[command] = { args: realArgs, desc: realDesc };
};

// alias a command so that it can be called by multiple names
SlackBot.prototype.aliasCommand = function (commandName) {
  var argIndex;

  if (!this.commands.hasOwnProperty(commandName)) {
    throw new Error(commandName + ' is not a configured command');
  }

  for (argIndex = 1; argIndex < arguments.length; argIndex++) {
    if (this.aliases.hasOwnProperty(arguments[argIndex])) {
      throw new Error(arguments[argIndex] + ' is already aliased or is an invalid alias name');
    }
    this.aliases[arguments[argIndex]] = commandName;
  }
};

// call a stored command
SlackBot.prototype.callCommand = function (commandName, event, callback) {
  var args;
  var modifiedEvent = event;

  if (!this.commands.hasOwnProperty(commandName)) {
    return this.help(event, callback);
  }
  args = ArgParser.align(this.commands[commandName].args, event.args || []);
  if (args !== false) {
    modifiedEvent.args = args;
    return this[commandName](modifiedEvent, callback);
  }
  return this.help(event, callback);
};

// respond to the whole channel
SlackBot.prototype.inChannelResponse = function (response) {
  return buildResponse('in_channel', response);
};

// respond to just the requesting user
SlackBot.prototype.ephemeralResponse = function (response) {
  return buildResponse('ephemeral', response);
};

// respond with a usage message
SlackBot.prototype.help = function (event, callback) {
  var _this = this;
  var helpText = '';
  var aliasText;

  Object.keys(this.commands).forEach(function (command) {
    helpText += command;

    // add argument description
    if (this.commands[command].args.length) {
      helpText += ' ' + this.commands[command].args.map(function (arg) {
        var optionalArgName;
        if (arg instanceof Object) {
          optionalArgName = Object.keys(arg)[0];
          return optionalArgName + ':' + arg[optionalArgName];
        }
        return arg.toString();
      }).join(' ');
    }

    // add alias description
    aliasText = Object.keys(this.aliases).filter(function (alias) {
      return _this.aliases[alias] === command;
    });
    if (aliasText.length) {
      helpText += ' (' + aliasText.join(', ') + ')';
    }

    // add command description
    helpText += ': ' + this.commands[command].desc + '\n';
  }.bind(this));
  helpText += 'help: display this help message';

  callback(null, this.ephemeralResponse({
    text: 'Available commands:',
    attachments: [{ text: helpText }]
  }));
};

/**
 * Find a command to match the given payload for "one two three", looks for matches for:
 * - "one two three"
 * - "one two"
 * - "one"
 */
SlackBot.prototype.findCommand = function (payload) {
  var splitPayload = payload.split(' ');
  var commandName;
  var commandNameLength;

  for (commandNameLength = payload.length - 1; commandNameLength > 0; commandNameLength--) {
    commandName = splitPayload.slice(0, commandNameLength).join(' ');
    if (this.aliases.hasOwnProperty(commandName)) {
      return { commandName: this.aliases[commandName], args: splitPayload.slice(commandNameLength) };
    }
    if (this.commands.hasOwnProperty(commandName)) {
      return { commandName: commandName, args: splitPayload.slice(commandNameLength) };
    }
  }
  return { commandName: 'help' };
};

// control the flow of queries from Slack
SlackBot.prototype.buildRouter = function () {
  return function (event, context) {
    var foundCommand;
    var builtEvent = event;
    builtEvent.body = qs.parse(builtEvent.body);

    if (this.config.token && (!builtEvent.body.token || builtEvent.body.token !== this.config.token)) {
      return context.fail('Invalid Slack token');
    }

    foundCommand = this.findCommand(builtEvent.body.text);
    builtEvent.args = foundCommand.args;
    return this.callCommand(foundCommand.commandName, builtEvent, context.done);
  }.bind(this);
};

module.exports = SlackBot;
