"use strict";

const grpc = require('grpc');
const
{
    PubSub
} = require('@google-cloud/pubsub');

const sep = '__';

module.exports = {
    init: init,
    emit: emit,
    subscribe: subscribe
}

const defaultAckDeadline = 300; // 5 minutes

function init(projectId)
{
    if (!projectId) throw new Error('projectId is required');

    this.pubsub = new PubSub(
    {
        projectId: projectId,
        grpc: grpc
    });

    this.topics = {};

    return this;
}

function emit(data, options)
{
    if (!options)
    {
        return Promise.reject(new Error('Publishing message requires options'));
    }

    return findOrCreateTopic(this.pubsub, this.topics, options).then(topic =>
    {
        return new Promise(function (resolve, reject)
        {
            try
            {
                topic.publishJSON(data, function (err, res)
                {
                    if (err) reject(err);
                    else resolve(res);
                });
            }
            catch (e)
            {
                console.error(e);
                reject(e);
            }
        });
    });
}

function findOrCreateTopic(pubsub, topics, options)
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

    const topicName = [options.env, options.topicName].join(sep);
    if (topics[topicName]) return Promise.resolve(topics[topicName]);

    try
    {
        return pubsub.topic(topicName).get(
        {
            autoCreate: true
        }).then(rawTopics =>
        {
            topics[topicName] = rawTopics[0];
            return rawTopics[0];
        });
    }
    catch (err)
    {
        return Promise.reject(err)
    }
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
    return topic.subscription(subscriptionName,
    {
        ackDeadline: defaultAckDeadline
    }).get(
    {
        autoCreate: true
    }).then((res) =>
    {
        return res[0];
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

    return findOrCreateTopic(this.pubsub, this.topics, options).then(topic =>
    {
        return createSubscription(topic, options);
    }).then(subscription =>
    {
        const msgHandler = messageHandler.bind(null, options.callback, options.topicName);
        const errHandler = errorHandler.bind(null, subscription);

        subscription.on('message', msgHandler);
        subscription.on('error', errHandler);
    }).catch(function (err)
    {
        console.error('google-pubsub-wrapper: subscribe error: ' + err.message);
        throw err;
    });
}

function messageHandler(callback, topicName, message)
{
    if (!callback) callback = function ()
    {
        return Promise.resolve();
    };

    var prom;

    if (!message || !message.data) prom = callback();
    else try
    {
        const data = JSON.parse(message.data.toString('utf8'));
        if (data.constructor !== Array) prom = callback(data);
        else prom = data.reduce(function (prev, d, idx)
        {
            return prev.then(function ()
            {
                return callback(d);
            });
        }, Promise.resolve());
    }
    catch (err)
    {
        console.error('google-pubsub-wrapper: Error in messageHandler for topicName ' + topicName + ': ' + err.message);
    }

    prom.then(function ()
    {
        console.debug('google-pubsub-wrapper handle: ' + topicName + ' with ack: ' + !!message.ack);
        if (message.ack) message.ack();
    }).catch(function (err)
    {
        console.error('google-pubsub-wrapper: Error in messageHandler catch for topicName ' + topicName + ': ' + err.message);

        if (message.ack) message.ack();
    });
}

function errorHandler(subscription, err)
{
    console.error('google-pubsub-wrapper: Error for subscription ' + subscription.name + ': ' + err.message);
}