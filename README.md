localytics-slack
=======

A Node package for creating Slackbots.

Install the package into your existing Node app.

    $ npm install --save git+ssh://github.com/localytics/localytics-slack.git

This module exposes three functions:

router
-------

`router` returns a function that takes an event body and context object, and routes to the appropriate command in the given object. Specify config (containing the token provided to you by Slack when configuring the slashcommand) and an object of commands to set up the router:

    var config = {
      token: 'abc'
    };

    var commands = {
      'testA': ['Test command A', function(options, cb) {
        cb(null, ephemeralResponse('A response'));
      }],

      'testB': ['Test command B', function(options, cb) {
        cb(null, ephemeralResponse('B response'));
      }]
    };

    var slackbot = router(config, commands);

If you're using Lambda and API Gateway, you can set the handler as the router, which will wire up the Slack webhook to the appropriate function defined in your list of commands, passing the context object down into each command as a callback.

    exports.handler = router(config, commands);

ephemeralResponse
------

`ephemeralResponse` takes a string and returns it wrapped in an object specifying that the response should be ephemeral in the Slack channel - only to the user that submitted the original command.

inChannelResponse
-------

Like above, `inChannelResponse` takes a string and wraps it in an object that specifies it should be shown to all users in the channel.