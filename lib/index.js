/*jslint node: true, debug: true, nomen: true */
/*global emit: true, sum: true */

var cradle = require("cradle"),
    async = require("async");

var couchQueue = function (queueName, hostUrl, port, auth, config, debug) {
    /* Config options:
    *    order: "FIFO", "LIFO", "random" (default 'random')
    *    override: true, false (default false)
    *
    * */

    "use strict";
    [queueName, hostUrl, port, auth].forEach(function(item) {
        if (!item) {
            throw {name: "variableError", message: "queueName, hostUrl, port, and auth are all required variables."};
        }
    });

    // Setup
    var thisQueue = this;
    if (!debug) { debug = false; }
    this.debug = debug;
    if (!!config) {
        this.config = config;
    } else {
        this.config = {};
    }
    if (!this.config.order) { this.config.order = 'random'; }
    if (!this.config.override) { this.config.override = false; }
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
                    if (response['ok'] === true) {
                        thisQueue.db.save('_design/queue', {
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
                            randomNext: {
                                map: function (doc) {
                                    var randomNumber = Math.floor(Math.random() * 1000000000);
                                    if (doc.queued && doc.insert_time) {
                                        emit(randomNumber, doc.insert_time);
                                    }
                                }

                                // Rather than have a reduce function here, we'll have
                                //  the calling function demand a random start_key
                            },

                            fifoNext: {
                                map: function (doc) {
                                    if (doc.queued && doc.insert_time) {
                                        emit(doc.insert_time, doc._id);
                                    }
                                }
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

    this.checkIfItemIsQueued = function (message, callback) {//callback(err, response)
        thisQueue.db.get(message, function(err, doc) {
            if (!err) {
                var out;
                if (doc.hasOwnProperty('queued') && doc.queued !== null) {
                    out = doc.queued;
                } else {
                    out = null;
                }
                callback(err, out);
            } else {
                callback(err, null);
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

    this.enqueue = function (message, config, callback) {//callback(err, response)
        /* config parameters:
        *       override: true, false (default false)
        *
        * */


        //In case config wasn't provided but callback was:
        if (typeof arguments['1'] === 'function' && !arguments.hasOwnProperty('2')) {
            callback = config;
            config = thisQueue.config;
        } else if (!config) {
            config = thisQueue.config;
        }


        var now, saveItem;
        now = new Date();
        saveItem = function (callback) {
            thisQueue.db.save(message, {queued: true, insert_time: now},
                function (err, response) {
                    if (debug) { console.log('couchQueue ' + queueName + ': queued ' + message + '.'); }
                    if (!!callback) {
                        callback(err, response);
                    }
                });
        };

        if (typeof config === 'undefined' || config === null || !config.hasOwnProperty('override') ||
            (config.hasOwnProperty('override') && !config.override)) {
            thisQueue.checkIfItemExists(message, function (err, response) {
                if (!(response)) {
                    // Only enqueue if item DOESN'T exist, so we don't requeue dequeued items
                    saveItem(callback);
                } else {
                    if (debug) { console.log('couchQueue ' + queueName + ': ' + message +
                                             ' is already present in the queue.'); }
                    callback(err, response);
                }
            });
        } else {
            saveItem(callback);
        }
    };

    this.enqueueMany = function (messages, config, callback) {//callback(err, response)
        if (Object.prototype.toString.call(messages) === '[object String]') {
            messages = [messages];
        }

        //In case config wasn't provided but callback was:
        if (typeof arguments['1'] === 'function' && !arguments.hasOwnProperty('2')) {
            callback = config;
            config = thisQueue.config;
        } else if (!config) {
            config = thisQueue.config
        }

        var runList = [];
        messages.forEach(function (item) {
            runList.push(
                function (cb) {
                    thisQueue.enqueue(item, config, function (err, response) {
                        // This is redundant, but for clarity
                        cb(err, response);
                    });
                }
            );
        });

        async.parallel(runList, function (err, results) {
            // This is redundant, but for clarity
            if (!!callback) { callback(err, results); }
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
            } else {
                throw {name: 'ItemDoesntExistError', message: 'Item ' + message + ' does not exist to dequeue.'}
            }
        });
    };

    var checkCallback = function(callback, name) {
        if (typeof callback !== 'function') {
            throw {name: 'CallbackError', message: 'You must provide a callback function for ' + name + '.'}
        }
    };

    this.randomNext = function (callback) {//callback(err, doc)
        checkCallback(callback, 'randomNext');
        var randomNumber = Math.floor(Math.random() * 1000000000);
        this.db.view('queue/randomNext', {startkey: randomNumber, limit: 1},
            function (err, doc) {
                // If there's no item above that queue ID, wrap around to the beginning,
                if (doc === []) {
                    thisQueue.db.view('queue/randomNext', {startkey: 0, limit: 1},
                        function (err, doc) {
                            callback(err, doc);
                        });
                } else {
                    callback(err, doc);
                }
            });
    };

    this.fifoNext = function (callback) {//callback(err, doc)
        checkCallback(callback, 'fifoNext');
        this.db.view('queue/fifoNext', {limit: 1}, function (err, doc) {
            callback(err, doc);
        });
    };

    this.lifoNext = function (callback) {//callback(err, doc)
        checkCallback(callback, 'lifoNext');
        this.db.view('queue/fifoNext', {limit: 1, descending: true}, function (err, doc) {
            callback(err, doc);
        });
    };

    this.nextItem = function (callback) {//callback(err, doc)
        checkCallback(callback, 'nextItem');
        // Check to make sure there are items left in the queue
        thisQueue.db.view('queue/numberQueued', function (err, response) {
            if (err !== null) {
                callback(err, null);
            } else {
                if (response[0].value > 0) {
                    if (!!thisQueue.config && thisQueue.config.hasOwnProperty('order')) {
                        switch (thisQueue.config.order.toLowerCase()) {
                            case 'random':
                            case 'r':
                                thisQueue.randomNext(callback);
                                break;
                            case 'fifo':
                            case 'f':
                                thisQueue.fifoNext(callback);
                                break;
                            case 'lifo':
                            case 'l':
                                thisQueue.lifoNext(callback);
                                break;
                            default:
                                throw {name: 'OrderConfigError',
                                    message: 'The order config option "' +
                                        thisQueue.config.order + '" does not exist.'};
                                break;
                        }
                    }
                } else {
                    //if there are no items queued left
                    throw {name: 'NoItemsQueuedError', message: 'There are no items left to be queued.'};
                }
            }
        });



    };
};

module.exports = couchQueue;
