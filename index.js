'use strict';

var _ = require('lodash'),
    qs = require('qs');

var inChannelResponse = function(text) {
  return {
    type: 'in_channel',
    text: text
  };
}

var ephemeralResponse = function(text) {
  return {
    type: 'ephemeral',
    text: text
  };
}

var router = function (config, commands) {
  return function (event, context) {
    var body = qs.parse(event.body);
    var token = config.token;

    if (!body.token || body.token != token) {
      return context.done(ephemeralResponse("Invalid Slack token"));
    }

    var splitCommand = body.text.split(" ");

    var commandName = _.head(splitCommand);
    var commandArgs = _.tail(splitCommand);

    var helpCommand = function() {
      return _.map(commands, function(command, commandName) {
        return commandName + ': ' + command[0];
      }).join('\n');
    };

    if (commandName === 'help' || !commands.hasOwnProperty(commandName)) {
      return context.done(undefined, ephemeralResponse(helpCommand()));
    } else {
      var commandFn = commands[commandName][1];

      return commandFn(
        {userName: body.user_name, args: commandArgs},
        context.done
      );
    }
  };
}

module.exports = {
  inChannelResponse: inChannelResponse,
  ephemeralResponse: ephemeralResponse,
  router: router
}
