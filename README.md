# localytics-slack

[![Build Status](https://travis-ci.com/localytics/localytics-slack.svg?token=kQUiABmGkzyHdJdMnCnv&branch=master)](https://travis-ci.com/localytics/localytics-slack)

As part of our commitment toward more integrated ChatOps, `localytics-slack` is a pattern for building [Slack slash commands](https://api.slack.com/slash-commands) using the Amazon AWS Lambda service and Node.js. It functions as a single endpoint that receives a JSON payload from Slack and returns an appropriate response. For instance, if you were to enter

    /testbot ping

into a correctly configured Slack channel, it would call the appropriate `ping` command and return the generated response to the user. A `help` command is also generated that is based on the provided commands and their descriptions, so that you can also call

    /testbot help

and a usage message will be returned.

## Configuration

Commands are added to the slackbot through the `addCommand` function. Sample configuration for the above ping command would look like

    var SlackBot = require('localytics-slack');
    var slackbot = new SlackBot({ token: "<token>" });
    slackbot.addCommand('ping', 'Ping the lambda', function(options, callback) {
      callback(null, this.inChannelResponse('Hello World'));
    });

In the above code, a slackbot is created with the given token (used for verifying the authenticity of each request). The ping command is then added to the routing, and when called responds with an in-channel response of 'Hello World'.

The first argument to the `addCommand` function is the name of the command. This can optionally have arguments specified like `ping <arg1> <arg2>`. In that case the router will only invoke that function if the number of arguments matches exactly. Arguments should be space-separated. The second argument is the description of the function. This is used in the generated `help` command, and is useful to your users when they can't remember the syntax of your bot.

The two arguments passed to the command callback are `options` and `callback`. The `options` object contains two attributes: `userName` (your Slack username) and `args` (the arguments passed to the function, as an array). The callback function is the same as the `context.done` function that's built into [lambda](http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html). The function expects that an error will be passed in as the left argument if there is one, and otherwise a successful execution's response will be passed in as the right argument.

The responses for Slack can either be ephemeral (returning to the user that invoked the function) or in-channel (returning to everyone in the channel in which the function was invoked). SlackBot has a built-in helper for each of these types of responses which are `ephemeralResponse` and `inChannelResponse` respectively. If you pass a string to either one of these functions they return a correctly-formatted object. If you want more fine-grained control, you can pass an object to them and they will set the `response_type` attribute. You can also ignore these functions entirely if you want to return a custom payload.

## Routing

The routing for the commands is achieved by the Slackbot's router acting as the [handler function](http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html) for the lambda. After a Slackbot has been fully configured (adding in configuration, building the command callbacks, etc.), the handler should be set to the return value of the buildRouter function.

    exports.handler = slackbot.buildRouter();

## Testing

It's helpful in testing your function to also export the slackbot itself. If it's part of the module's exports, each function can be tested explicitly as opposed to having to go through the router (which would be testing library code instead of your own). A sample test using `mocha` and `chai` for the aforementioned `ping` function would look like

    var expect = require('chai').expect;
      slackBot = require('../slackbot/handler').slackBot;
    
    describe('slackbot', function() {
      it('responds to ping', function() {
        var received = false, receivedArgs = [], callback = function(error, success) {
          received = true;
          receivedArgs = [error, success];
        };
        
        slackBot.ping(null, callback);
        expect(received).to.be.true;
        expect(receivedArgs).to.deep.eq([null, slackBot.inChannelResponse('Hello World')]);
      });
    });

assuming your handler is named index.js and you had `exports.slackBot = slackBot` in your handler.
