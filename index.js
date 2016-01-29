'use strict';

var _ = require('lodash'),
    qs = require('qs');

function SlackBot(config) {
  this.config = config;
  this.commands = {};
}

// add a command
SlackBot.prototype.addCommand = function(commandName, description, command) {
  this[commandName] = command;
  this.commands[commandName] = description;
};

// call a stored command
SlackBot.prototype.callCommand = function(commandName, options, callback) {
  if(this.commands.hasOwnProperty(commandName))
    return this[commandName](options, callback);
};

// respond to the whole channel
SlackBot.prototype.inChannelResponse = function(text) {
  return {
    type: 'in_channel',
    text: text
  };
};

// respond to just the requesting user
SlackBot.prototype.ephemeralResponse = function(text) {
  return {
    type: 'ephemeral',
    text: text
  };
};

// control the flow of queries from slack
SlackBot.prototype.router = function(event, context) {
  var body = qs.parse(event.body);
  var token = this.config.token;

  if (!body.token || body.token != token)
    return context.done(this.ephemeralResponse('Invalid Slack token'));

  var splitCommand = body.text.split(' '),
    commandName = _.head(splitCommand),
    commandArgs = _.tail(splitCommand);

  if(commandName === 'help' || !this.commands.hasOwnProperty(commandName)) {
    var command, helpText = '';
    for(command in this.commands)
      helpText += command + ': ' + this.commands[command] + '\n';
    helpText += 'help: display this help message';
    return context.done(null, this.ephemeralResponse(helpText));
  }
  else {
    return this[commandName]({ userName: body.user_name, args: commandArgs }, context.done);
  }
};

module.exports = SlackBot;
