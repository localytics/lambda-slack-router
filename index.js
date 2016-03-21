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
  this.config = config;
  this.commands = {};
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

// call a stored command
SlackBot.prototype.callCommand = function (commandName, options, callback) {
  var args;
  var modifiedOptions = options;

  if (!this.commands.hasOwnProperty(commandName)) {
    return this.help(options, callback);
  }
  args = ArgParser.align(this.commands[commandName].args, options.args || []);
  if (args !== false) {
    modifiedOptions.args = args;
    return this[commandName](modifiedOptions, callback);
  }
  return this.help(options, callback);
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
SlackBot.prototype.help = function (options, callback) {
  var helpText = '';

  Object.keys(this.commands).forEach(function (command) {
    helpText += command;

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
    if (this.commands.hasOwnProperty(commandName)) {
      return { commandName: commandName, args: splitPayload.slice(commandNameLength) };
    }
  }
  return { commandName: 'help' };
};

// control the flow of queries from Slack
SlackBot.prototype.buildRouter = function () {
  return function (event, context) {
    var body = qs.parse(event.body);
    var token = this.config.token;
    var foundCommand;

    if (!body.token || body.token !== token) {
      return context.done(this.ephemeralResponse('Invalid Slack token'));
    }

    foundCommand = this.findCommand(body.text);
    return this.callCommand(foundCommand.commandName, {
      userName: body.user_name,
      args: foundCommand.args
    }, context.done);
  }.bind(this);
};

module.exports = SlackBot;
