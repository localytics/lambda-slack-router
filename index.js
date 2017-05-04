'use strict';

var ArgParser = require('./lib/arg-parser');
var qs = require('qs');

// wraps logic around routing
function SlackBot(config) {
  this.config = config || {};
  this.commands = {};
  this.aliases = {};

  if (!this.config.structureResponse) {
    this.config.structureResponse = function (response) {
      return response;
    };
  }
}

// build a response to return to Slack
SlackBot.prototype._buildResponse = function (response_type, response) {
  var modifiedResponse = response;
  if (typeof response === 'string') {
    modifiedResponse = { response_type: response_type, text: response };
  } else {
    modifiedResponse.response_type = response_type;
  }
  return this.config.structureResponse(modifiedResponse);
};

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

  if (!Object.prototype.hasOwnProperty.call(this.commands, commandName)) {
    throw new Error(commandName + ' is not a configured command');
  }

  for (argIndex = 1; argIndex < arguments.length; argIndex += 1) {
    if (Object.prototype.hasOwnProperty.call(this.aliases, arguments[argIndex])) {
      throw new Error(arguments[argIndex] + ' is already aliased or is an invalid alias name');
    }
    this.aliases[arguments[argIndex]] = commandName;
  }
};

// call a stored command
SlackBot.prototype.callCommand = function (commandName, event, callback) {
  var args;
  var modifiedEvent = event;

  if (!Object.prototype.hasOwnProperty.call(this.commands, commandName)) {
    return this.help(event, callback);
  }
  args = ArgParser.align(this.commands[commandName].args, event.args || []);
  if (args !== false) {
    modifiedEvent.args = args;
    return this[commandName](modifiedEvent, callback);
  }
  return this.help(event, callback);
};

// add an action
SlackBot.prototype.addAction = function (action, callback) {
  if (!this[action]) {
    this[action] = callback;
  } else {
    throw new Error('Action ' + action + ' is already defined as a command or action');
  }
};

// process an action
SlackBot.prototype.processAction = function (action, event, callback) {
  if (!this[action]) {
    throw new Error('Tried to process ' + action + ' but did not find the corresponding action');
  } else {
    return this[action](event, callback);
  }
};

// respond to the whole channel
SlackBot.prototype.inChannelResponse = function (response) {
  return this._buildResponse('in_channel', response);
};

// respond to just the requesting user
SlackBot.prototype.ephemeralResponse = function (response) {
  return this._buildResponse('ephemeral', response);
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

  for (commandNameLength = payload.length - 1; commandNameLength > 0; commandNameLength -= 1) {
    commandName = splitPayload.slice(0, commandNameLength).join(' ');
    if (Object.prototype.hasOwnProperty.call(this.aliases, commandName)) {
      return { commandName: this.aliases[commandName], args: splitPayload.slice(commandNameLength) };
    }
    if (Object.prototype.hasOwnProperty.call(this.commands, commandName)) {
      return { commandName: commandName, args: splitPayload.slice(commandNameLength) };
    }
  }
  return { commandName: 'help' };
};

// control the flow of queries from Slack
SlackBot.prototype.buildRouter = function () {
  return function (event, context, callback) {
    var foundCommand;
    var foundAction;
    var builtEvent = event;

    if (this.config.pingEnabled && event.source && event.source === 'aws.events' &&
      event.resources && event.resources[0].indexOf('ping') !== -1) {
      return context.succeed('Ok');
    }

    builtEvent.body = qs.parse(builtEvent.body);
    if (builtEvent.body.payload) {
      builtEvent.body = JSON.parse(builtEvent.body.payload);
    }

    if (this.config.token && (!builtEvent.body.token || builtEvent.body.token !== this.config.token)) {
      return context.fail('Invalid Slack token');
    }

    // Handle actions from slack buttons
    if (builtEvent.body.actions) {
      // Though presented as an array, slack will only send a single action per incoming invocation.
      foundAction = builtEvent.body.actions[0].name;
      return this.processAction(foundAction, builtEvent, callback);
    } // Else route to commands
    foundCommand = this.findCommand(builtEvent.body.text);
    builtEvent.args = foundCommand.args;
    return this.callCommand(foundCommand.commandName, builtEvent, callback);
  }.bind(this);
};

module.exports = SlackBot;
