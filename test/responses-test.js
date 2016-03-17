var chai = require('chai');
var expect = chai.expect;
var SlackBot = require('../index');

describe('responses', function () {
  it('responds with the correct ephemeral response format', function () {
    expect(new SlackBot().ephemeralResponse('foo')).to.deep.equal({
      response_type: 'ephemeral',
      text: 'foo'
    });
  });

  it('responds with the correct in-channel response format', function () {
    expect(new SlackBot().inChannelResponse('bar')).to.deep.equal({
      response_type: 'in_channel',
      text: 'bar'
    });
  });

  it('adds attachments appropriately', function () {
    var response = new SlackBot().ephemeralResponse({
      text: 'test',
      attachments: [{
        text: 'attachment'
      }]
    });

    expect(response).to.deep.equal({
      response_type: 'ephemeral',
      text: 'test',
      attachments: [{ text: 'attachment' }]
    });
  });
});
