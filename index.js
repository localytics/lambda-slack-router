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
  var _this = this;
  var helpText = '';
  var aliasText;

  Object.keys(this.commands).forEach(function (command) {
    helpText += command;

    // add argument description
    if (this.commands[command].args.length) {
      helpText += ' ' + this.commands[command].args.map(function (arg) {
        var optionalArgName;
        var configuredArgName;
        var configuredArgOpts;
        var configuredArgHelpText = '';
        var configuredArgRestrictText = '';
        var argType = ArgParser.typeOf(arg);
        if (argType === 'opt') {
          optionalArgName = Object.keys(arg)[0];
          return '[' + optionalArgName + ':' + arg[optionalArgName] + ']';
        } else if (argType === 'configured') {
          configuredArgName = Object.keys(arg)[0];
          configuredArgOpts = arg[configuredArgName];
          if (configuredArgOpts.restrict) {
            if (configuredArgOpts.restrict instanceof Array) {
              configuredArgRestrictText = ' (' + configuredArgOpts.restrict.join('|') + ')';
            } else {
              configuredArgRestrictText = ' (' + configuredArgOpts.restrict.toString() + ')';
            }
          }
          if (configuredArgOpts.default) {
            configuredArgHelpText = '[' + configuredArgName + ':' +
              configuredArgOpts.default + ' ' + configuredArgRestrictText + ']';
          } else {
            configuredArgHelpText = configuredArgName + configuredArgRestrictText;
          }

          return configuredArgHelpText;
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
    var body = qs.parse(event.body);
    var token = this.config.token;
    var foundCommand;

    if (!body.token || body.token !== token) {
      return context.fail('Invalid Slack token');
    }

    foundCommand = this.findCommand(body.text);
    return this.callCommand(foundCommand.commandName, {
      userName: body.user_name,
      args: foundCommand.args
    }, context.done);
  }.bind(this);
};

module.exports = SlackBot;
