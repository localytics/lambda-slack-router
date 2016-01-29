localytics-slack
=======

A Node package for creating Slackbots.

Install the package into your existing Node app.

    $ npm install --save git+ssh://github.com/localytics/localytics-slack.git

This module exposes the SlackBot utility class. It is built like:

    var SlackBot = require('localytics-slack');
    var slackbot = new SlackBot({ token: 'abc' });

And you add commands by:

    slackbot.addCommand('testA', 'Test command A', function(options, cb) {
      cb(null, this.ephemeralResponse('A response'));
    });
    slackbot.addCommand('testB', 'Test command B', function(options, cb) {
      cb(null, this.inChannelResponse('B response'));
    });

router
-------

`router` is a function that takes an event body and context object, and routes to the appropriate command in the given object:

If you're using Lambda and API Gateway, you can set the handler as the router, which will wire up the Slack webhook to the appropriate function defined in your list of commands, passing the context object down into each command as a callback.

    exports.handler = slackbot.router;

ephemeralResponse
------

`ephemeralResponse` takes a string and returns it wrapped in an object specifying that the response should be ephemeral in the Slack channel - only to the user that submitted the original command.

inChannelResponse
-------

Like above, `inChannelResponse` takes a string and wraps it in an object that specifies it should be shown to all users in the channel.
