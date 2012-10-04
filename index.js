/*jslint node: true, debug: true, nomen: true */
/*global emit: true, sum: true */

var cradle = require("cradle"),
    async = require("async");

var couchQueue = function (queueName, hostUrl, port, auth, config, debug) {
    "use strict";

    if (!debug) { debug = false; }
    var thisQueue = this;
    this.db = new (cradle.Connection)(hostUrl, port, {auth: auth}).database(queueName);

    // Check if database exists; if not, create it
    /* This should not be run in production, but rather ahead of time,
     *  if the queuing database structure does not yet exist. */
    this.createQueue = function (callback) {//callback(err)
        thisQueue.db.exists(function (err, exists) {
            if (err) {
                callback(err);
            } else if (!(exists)) {
                thisQueue.db.create(function (err, response) {
                    if (response.ok === true) {
                        thisQueue.db.save('_dseign/queue', {
                            queued: {
                                map: function (doc) {
                                    if (doc.queued) { emit(doc.insert_time, doc._id); }
                                }
                            },

                            dequeued: {
                                map: function (doc) {
                                    if (!(doc.queued)) { emit(doc.dequeue_time, doc._id); }
                                }
                            },

                            numberQueued: {
                                map: function (doc) {
                                    if (doc.queued) { emit(null, 1); }
                                },
                                reduce: function (keys, values) {
                                    return sum(values);
                                }
                            },

                           /* In this view, which is how we're going to get the 'next' item,
                            to limit possible concurrency/redundancy issues that another
                            worker might call up the item while the first worker is still
                            working */
                            next: {
                                map: function (doc) {
                                    var randomNumber = Math.floor(Math.random() * 1000000000);
                                    if (doc.queued && doc.insert_time) {
                                        emit(randomNumber, doc.insert_time);
                                    }
                                }

                                // Rather than have a reduce function here, we'll have
                                //  the calling function demand a random start_key
                            }
                        }, function (err, response) {
                            if (!!callback) { callback(err); }
                        });
                    } else {
                        callback(err);
                    }
                });
            }
        });
    };

    this.checkIfItemExists = function (message, callback) {//callback(err, response)
        thisQueue.db.get(message, function (err, doc) {
            if (typeof doc !== 'undefined') {
                callback(null, true);
            } else if (err.error === 'not_found' && err.reason === 'missing') {
                callback(null, false);
            } else {
                callback(err, null);
            }
        });
    };

    // Consider changing 'override' to a config parameter?
    this.enqueue = function (message, override, callback) {//callback(err, response)
        var now, saveItem;
        now = new Date();
        saveItem = function () {
            thisQueue.db.save(message, {queued: true, insert_time: now},
                function (err, response) {
                    if (debug) { console.log('couchQueue ' + queueName + ': queued ' + message); }
                    if (!!callback) {
                        callback(err, response);
                    }
                });
        };

        if (!override) {
            thisQueue.checkIfItemExists(message, function (err, response) {
                if (!(response)) {
                    // Only enqueue if item DOESN'T exist, so we don't requeue dequeued items
                    saveItem();
                } else {
                    if (debug) { console.log('couchQueue ' + queueName + ': ' + message +
                                             ' is already present in the queue.'); }
                }
            });
        } else {
            saveItem();
        }
    };

    this.enqueueMany = function (messages, callback) {//callback(err, response)
        if (Object.prototype.toString.call(messages) === '[object String]') {
            messages = [messages];
        }

        var runList = [];
        messages.forEach(function (item) {
            runList.push(
                function (cb) {
                    thisQueue.enqueue(item, function (err, response) {
                        // This is redundant, but for clarity
                        cb(err, response);
                    });
                }
            );
        });

        //TODO: test this
        async.parallel(runList, function (err, results) {
            // This is redundant, but for clarity
            callback(err, results);
        });
    };

    this.dequeue = function (message, callback) {//callback(err, response)
        var now = new Date();

        // Sanity check: if item exists, only then dequeue it
        thisQueue.checkIfItemExists(message, function (err, response) {
            if (response) {
                thisQueue.db.merge(message, {queued: false, dequeue_time: now}, function (err, response) {
                    if (!!callback) {
                        callback(err, response);
                    }
                });
            }
        });
    };

    this.nextItem = function (callback) {//callback(err, doc)
        var randomNumber = Math.floor(Math.random() * 1000000000);
        this.db.view('queue/next', {startkey: randomNumber, limit: 1},
            function (err, response) {
                /* If there's no item above that queue ID, wrap around to the beginning,
                 *  but only if there are objects left in the queue (ie numberQueued > 0) */
                if (response === []) {
                    thisQueue.db.view('queue/numberQueued', function (err, response) {
                        if (err !== null) {
                            callback(err, null);
                        } else {
                            if (response[0].value > 0) {
                                thisQueue.db.view('queue/next', {startkey: 0, limit: 1},
                                    function (err, doc) {
                                        callback(err, doc);
                                    });
                            }
                        }
                    });
                } else {
                    callback(err, response);
                }
            });
    };
};

module.exports = couchQueue;
