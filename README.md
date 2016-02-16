# localytics-slack

A Node package for creating Slackbots.

Install the package into your existing Node app.

    $ npm install --save git+ssh://github.com/localytics/localytics-slack.git

This module exposes the SlackBot utility class. It is built like:

    var SlackBot = require('localytics-slack');
    var slackbot = new SlackBot({ token: 'token' });

And you add commands by:

    slackbot.addCommand('testA', 'Test command A', function(options, cb) {
      cb(null, this.ephemeralResponse('A response'));
    });
    slackbot.addCommand('testB <arg1> <arg2>', 'Test command B', function(options, cb) {
      cb(null, this.inChannelResponse('B response'));
    });

## buildRouter

`buildRouter` returns a function that takes an event body and context object, and routes to the appropriate command in the SlackBot object. With AWS Lambda and API Gateway you can set the handler as the router, which will route the Slack webhook to the appropriate function defined in your list of commands, passing the context object down into each command as a callback.

    exports.handler = slackbot.buildRouter();

## ephemeralResponse

`ephemeralResponse` takes either a string or an object. If the passed value is a string, it is returned wrapped in an object specifying that the response should be ephemeral in the Slack channel - only to the user that submitted the original command. If the passed value is an object, the `response_type` attribute is set and the object is returned.

## inChannelResponse

Like above, `inChannelResponse` takes a string or an object specifies that it should be shown to all users in the channel.
