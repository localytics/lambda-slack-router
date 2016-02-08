'use strict';

var qs = require('qs');

var Utils = {
  alignArgs: function(argNames, args) {
    args = args || [];
    var aligned = {};

    if(argNames.length == args.length) {
      argNames.forEach(function(argName, index) {
        aligned[argName] = args[index];
      });
      return aligned;
    }
    else if(argNames[argNames.length - 1].match(/\.\.\.$/)) {
      argNames.slice(0, -1).forEach(function(argName, index) {
        aligned[argName] = args[index];
      });

      var lastArgName = argNames[argNames.length - 1];
      aligned[lastArgName.substring(0, lastArgName.length - 3)] = args.slice(argNames.length - 1);
      return aligned;
    }
    else {
      return false;
    }
  },

  buildResponse: function(response_type, response) {
    if(typeof response === 'string') {
      return { response_type: response_type, text: response };
    }
    else {
      response.response_type = response_type;
      return response;
    }
  },

  splitCommand: function(command) {
    var split = command.split(' ');
    return { commandName: split[0], args: split.slice(1) };
  }
};

// wraps logic around routing
function SlackBot(config) {
  this.config = config;
  this.commands = {};
}

// add a command
SlackBot.prototype.addCommand = function(commandName, desc, command) {
  var split = Utils.splitCommand(commandName);
  this[split.commandName] = command;
  this.commands[split.commandName] = { args: split.args, desc: desc };
};

// call a stored command
SlackBot.prototype.callCommand = function(commandName, options, callback) {
  var args;
  if(this.commands.hasOwnProperty(commandName) && (args = Utils.alignArgs(this.commands[commandName].args, options.args)) !== false) {
    options.args = args;
    return this[commandName](options, callback);
  }
  else {
    return this.help(options, callback);
  }
};

// respond to the whole channel
SlackBot.prototype.inChannelResponse = function(response) {
  return Utils.buildResponse('in_channel', response);
};

// respond to just the requesting user
SlackBot.prototype.ephemeralResponse = function(response) {
  return Utils.buildResponse('ephemeral', response);
};

// respond with a usage message
SlackBot.prototype.help = function(options, callback) {
  var command, helpText = '';
  for(command in this.commands) {
    helpText += command;
    if(this.commands[command].args.length)
      helpText += ' ' + this.commands[command].args.join(' ');
    helpText += ': ' + this.commands[command].desc + '\n';
  }
  helpText += 'help: display this help message';

  callback(null, this.ephemeralResponse({
    text: 'Available commands:',
    attachments: [{ text: helpText }]
  }));
};

// control the flow of queries from slack
SlackBot.prototype.buildRouter = function() {
  return function(event, context) {
    var body = qs.parse(event.body);
    var token = this.config.token;

    if (!body.token || body.token != token)
      return context.done(this.ephemeralResponse('Invalid Slack token'));

    var split = Utils.splitCommand(body.text);
    if(split.commandName === 'help' || !this.commands.hasOwnProperty(split.commandName))
      return this.help({}, context.done);
    else
      return this.callCommand(split.commandName, { userName: body.user_name, args: split.args }, context.done);
  }.bind(this);
};

module.exports = SlackBot;
