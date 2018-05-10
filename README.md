# google-pubsub-wraper
Easy to use wrapper for Google pubsub


#### Example usage
```
var Pubsub = require('../../pubsub.js');

var pubsubServer = Pubsub.init(process.env.GCLOUD_PROJECT);
var pubsubClient = Pubsub.init(process.env.GCLOUD_PROJECT);

pubsubClient.subscribe(
{
    env: 'testing',
    topicName: 'test',
    groupName: 'test',
    callback: function (data)
    {
        console.log('got data');
    }
});

pubsubServer.emit(
{
    test: 'test'
},
{
    env: 'testing',
    topicName: 'test'
});
```