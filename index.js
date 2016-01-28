'use strict';

var _ = require('lodash'),
    qs = require('qs');

function SlackBot(config, commands) {
  this.config = config;
  this.commands = commands;
}

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
    return context.done(this.ephemeralResponse("Invalid Slack token"));

  var splitCommand = body.text.split(" "),
    commandName = _.head(splitCommand),
    commandArgs = _.tail(splitCommand);

  var helpCommand = function() {
    return _.map(this.commands, function(command, commandName) {
      return commandName + ': ' + command[0];
    }).join('\n');
  }.bind(this);

  if (commandName === 'help' || !this.commands.hasOwnProperty(commandName)) {
    return context.done(undefined, this.ephemeralResponse(helpCommand()));
  } else {
    return this.commands[commandName][1](
      { userName: body.user_name, args: commandArgs },
      context.done
    );
  }
};

module.exports = SlackBot;
