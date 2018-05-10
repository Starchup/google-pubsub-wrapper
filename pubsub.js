"use strict";

const PubSub = require('@google-cloud/pubsub');

const sep = '__';

module.exports = {
    init: init,
    emit: emit,
    subscribe: subscribe
}

function init(projectId)
{
    if (!projectId) throw new Error('projectId is required');

    this.pubsub = PubSub(
    {
        projectId: projectId
    });

    return this;
}

function emit(data, options)
{
    if (!options)
    {
        return Promise.reject(new Error('Publishing message requires options'));
    }

    return findOrCreateTopic(this.pubsub, options).then(topic =>
    {
        return topic.publisher().publish(Buffer.from(JSON.stringify(data)), function (err, res)
        {
            if (err) console.error(err);
        });
    });
}

function findOrCreateTopic(pubsub, options)
{
    if (!pubsub)
    {
        return Promise.reject(new Error('Topic creation requires pubsub'));
    }
    if (!options)
    {
        return Promise.reject(new Error('Topic creation requires options'));
    }
    if (!options.topicName)
    {
        return Promise.reject(new Error('Topic creation requires topic name'));
    }
    if (!options.env)
    {
        return Promise.reject(new Error('Topic creation requires env'));
    }

    const topic = pubsub.topic([options.env, options.topicName].join(sep));

    //Find or create topic
    return topic.get(
    {
        autoCreate: true
    }).then(topics =>
    {
        //Google return format, always first index in array
        return topics[0];
    });
}

function createSubscription(topic, options)
{
    if (!topic)
    {
        return Promise.reject(new Error('Subscription creation requires topic'));
    }
    if (!options)
    {
        return Promise.reject(new Error('Subscription creation requires options'));
    }
    if (!options.topicName)
    {
        return Promise.reject(new Error('Subscription creation requires topic name'));
    }
    if (!options.env)
    {
        return Promise.reject(new Error('Subscription creation requires env'));
    }
    if (!options.groupName)
    {
        return Promise.reject(new Error('Subscription creation requires groupName'));
    }

    const subscriptionName = [options.env, options.groupName, options.topicName].join(sep);
    return topic.createSubscription(subscriptionName).then(subscriptions =>
    {
        return subscriptions[0];
    });
}

function subscribe(options)
{
    if (!options)
    {
        return Promise.reject(new Error('Subscription requires options'));
    }
    if (!options.callback)
    {
        return Promise.reject(new Error('Subscription requires callback'));
    }
    if (!this.pubsub)
    {
        return Promise.reject(new Error('Subscription requires pubsub client to be initialized'));
    }

    return findOrCreateTopic(this.pubsub, options).then(topic =>
    {
        return createSubscription(topic, options);
    }).then(subscription =>
    {
        const msgHandler = messageHandler.bind(null, options.callback);
        const errHandler = errorHandler.bind(null, subscription);

        subscription.on('message', msgHandler);
        subscription.on('error', errHandler);
    });
}

function messageHandler(callback, message)
{
    message.ack();

    var data = JSON.parse(message.data.toString('utf8'));

    if (data.constructor !== Array) callback(data);
    else data.forEach(callback);
}

function errorHandler(subscription, err)
{
    console.error('Error for subscription ' + subscription.name + ': ' + err.message);
}