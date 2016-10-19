var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

describe('structureResponse', function () {
  it('sets the default response structure', function () {
    expect(new SlackBot().ephemeralResponse('foo')).to.deep.equal({
      response_type: 'ephemeral',
      text: 'foo'
    });
  });

  it('handles custom response structures', function () {
    var slackbot = new SlackBot({
      structureResponse: function (response) {
        return { body: JSON.stringify(response) };
      }
    });

    expect(slackbot.inChannelResponse('bar')).to.deep.equal({
      body: '{"response_type":"in_channel","text":"bar"}'
    });
  });
});
