

google-pubsub-wraper
====================
Easy to use wrapper for Google pubsub


## Functionality
* Creating a topic
	* always done with a findOrCreate flow
* Broadcasting messages to a topic
	* publishJSON is used currently, always sending JSON data
* Subscribing to a topic
	* both the sync and async flows are possible, to require the message handler promise to complete before acknowledging the message or not

## Updating the framework
* `git tag x.x.x`
* `git push --tags`
* `nom publish`

## Example usage
```
const PubSub = require('google-pubsub-wrapper');

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
