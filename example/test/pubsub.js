var expect = require('chai').expect;
var Pubsub = require('../../pubsub.js');

var pubsubServer = Pubsub.init(process.env.GCLOUD_PROJECT);
var pubsubClient = Pubsub.init(process.env.GCLOUD_PROJECT);

describe('Test emitting & reception', function ()
{
    var topicName = 'test';
    var env = 'testing';

    var testVal = 'testVal';

    var globalCheck = false;
    var callback = function (data, publishTime)
    {
        globalCheck = data.testKey === testVal
    };

    before(function (done)
    {
        pubsubClient.subscribe(
        {
            env: env,
            topicName: topicName,
            groupName: 'test',
            callback: callback
        }).then(function ()
        {
            return pubsubServer.emit(
            {
                testKey: testVal
            },
            {
                env: env,
                topicName: topicName
            });
        }).then(function ()
        {
            done();
        }).catch(done);
    });

    it('should have created an order', function (done)
    {
        setTimeout(function ()
        {
            expect(globalCheck).to.equal(true);
            done();
        }, 500);
    });
});