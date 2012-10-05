#couchQueue

A [Node.js][1] queuing system for [CouchDB][2].

##Basics
Sometimes, you are unable to or unwilling to use a specialized queuing system like Amazon SQS or Redis for your project.  This project is intended to fill that gap for users of CouchDB.  With couchQueue, you have the ability to:

 - [create the queuing database](#create) and [configuring](#configure)
 - [check if an item exists](#exist)
 - [enqueue items](#enqueue)
 - [get the next item](#retrieving) according to your chosen queuing strategy
 - [dequeue items](#dequeue)

The queuing itself is performed using views and map/reduce strategies on those views.

##Detail

###Installation

npm:

    npm install couchqueue

**Note: this is not actually published to npm yet.**
Alternatively, you can get the source from [github][3].

###Importing
To use couchQueue, simply `require` it:

```javascript
CouchQueue = require("couchQueue");
```

###Setting Up Your Queue

```javascript
queue = new CouchQueue(queueName, hostUrl, port, auth, [config], [debug]);
```

Example usage:

```javascript
queue = new CouchQueue('idQueue', 'mycouch.cloudapp.net', 3000,
        {username: 'myusername', password: 'mypassword'},
        {order: 'fifo', override: false}, false);
```

 - `queueName` (*required*)
  - The name that you're using for your queue.  If this queue or database already exists, you __must__ ensure that the name is identical to the database name.
 - `hostUrl` (*required*)
  - The URL at which your CouchDB database is hosted.
 - `port` (*required*)
  - The port at which your database is accessable.  Likely `3000`.
 - `auth` (*required*):
  - format: ```{username: <database username>, password: <database password>}```
  - These are the credentials you use to access your CouchDB databases.
 - `config` (*optional*):
  - Optional parameters that you may pass to your queue instance to configure its behavior.  Current options are:
     -  `order`: `'random'`, `'lifo'`, or `'fifo'`.  Defaults to `'random'`.  See [below](#config) for more detail.
     -  `override`: `true` or `false`.  Defaults to `false`.
 - `debug` (*optional*):
   - If you want your queuing activity to log to the console.  Defaults to `false`.

<a name="config"></a>
####Config

These config parameters are passed upon the construction of the queue, but since they publicly accessible, you can change these configurations later in your program by changing `queue.config`.  For example:
   
```javascript
    queue.config.order = 'lifo';
```    



`config.order`

- Options: `'random'`, `'fifo'`, `'lifo'`.  **Default:** `'random'`.
- This determines the queuing strategy that your queue will use to deliver items when `queue.nextItem(...)` is called.
- `'random'` means that your still-queued items will be returned in a random order.  `'fifo'` stands for "**F**irst **I**n **F**irst **O**ut", and `'lifo'` stands for "**L**ast **I**n **F**irst **O**ut".  These two strategies use a timestamp attached to the items when they are enqueued using `queue.enqueue(...)`.
- Alternatively, you can select one of the strategies for individual item retrievals by calling `queue.randomNext(...)`, `queue.fifoNext(...)`, or `queue.lifoNext(...)`.

`config.override`

- Options: `true` and `false`.  **Default:** `false`.
- This determines whether `queue.enqueue(...)` and `queue.enqueueMany(...)` will re-enqueue an item if it already appears in the database and you try to enqueue it.  Be careful when setting this to `true`, because you may accidentally be re-enqueuing items that have already been dequeued.
- `false` is the default behavior of only enqueuing items if they are not already present in the database.  This way, dequeued items are not re-enqueued.  `true` disables this protection.
- You have the option of overriding the `config.override` setting on an individual basis when calling `queue.enqueue(...)` or `queue.enqueueMany(...)` by passing it a separate configuration object.

<a name="create"></a>
###Creating Your Queue (if it hasn't been already)
You only need to create your queue once--this means physically adding it as a database to your CouchDB instance, and setting up all of the views necessary for CouchQueue to work.
```javascript
queue.createQueue([callback]);
```
- This function takes an optional callback of form `callback(error)`.

Please note that this method should (and can) only be called **one** time, when you are creating the queue, and **should not** be called in production.  You should run this function once separately before running any other code that relies on couchQueue, sinc otherwise the other functions will have no database to refer to.  It is not recommended to set up the database yourself in CouchDB, since you might not get the views exactly as CouchDB needs them.  You can, of course, add additional views to your CouchDB database, so long as they don't override any of the view names that couchQueue uses.

<a name="exist"></a>
###Exists
####Exists and is Queued
```javascript
queue.checkIfItemIsQueued(message, callback);
```

Example:
```javascript
queue.checkIfItemIsQueued('ID3445', function(error, isIt) {
    if (!!err) {
        if (err.hasOwnProperty('reason') && err.reason === 'missing') {
            console.log("Item isn't in the database.  Should have called queue.checkIfItemExists!");
        } else {
            handleError(error);
        }
    } else {
        if (isIt) {
            console.log("The item is queued!");
        } else {
            console.log("The item is not queued.");
        }
    }
});
```
- `message` (*required*)
  - The name or ID of the item you're checking to see is queued.
- `callback` (*required*)
  - A callback in form `callback(err, response)`, where `response` will be `true` or `false`, depending on whether it's queued or not.

If the item actually isn't in the database at all, `error` will be returned as `{ error: 'not_found', reason: 'missing' }` and `response` will be `null`.  Do not use this function to check if the item is in the database, use `queue.checkIfItemExists(...)` instead.

####Exists in the Database
```javascript
queue.checkIfItemExists(message, callback)
```
Example:
```javascript
queue.checkIfItemExists('ID33445', function(error, isThere){
    if (isThere) {
        console.log("The item is in the queue database!");
    } else {
        console.log("Aw, it's not in the queue database...");
    }
});
```
Note: this function will tell you whether the specified item is in the database, **not** whether or not it is queued.

- `message` (*required*)
  - The name or ID of the item you're checking to see is in the database.
- `callback` (*required*)
  - A callback in form `callback(err, response)`, where `response` will be `true` or `false`, depending on if it's in the database or not.

<a name="enqueue"></a>
###Enqueuing
####queue.enqueue
```javascript
queue.enqueue(message, [config], [callback]);
```

Examples:
```javascript
queue.enqueue('33124');
queue.enqueue('34234', {override: true});
queue.enqueue('myusername', function (err, response) {...});
queue.enqueue('96884', {override: false}, function (err, response) {...});
```

- `message` (*required*) (**string**)
 -  The item that you intend to queue.  This will be used as the document's `_id` in the CouchDB database.
-  `config` (*optional*)
 -  Configuration parameter that for this function call overrides `queue.config`.
 -  Options: `{ override: [true | false] }`
- `callback` (*optional, but suggested*)
 - Callback function of form `callback(error, response)`.

####queue.enqueueMany
```javascript
queue.enqueueMany(messages, [config], [callback]);
```

Same as `queue.enqueue(...)`, except `messages`should be a list of string items that you intend to queue.  The optional local configuration will apply to all of these items, and the callback will be called only upon the completion of all enqueuings.
`messages` can also be passed as a single string item, just like `queue.enqueue(...)`.

Examples:
```javascript
queue.enqueueMany(['1', '2', '3'], {override: true});
queue.enqueueMany('john', function (error, response) {...});
```

<a name="retrieving"></a>
###Retrieving Records
<a name="nextItem"></a>
####Strategy-Independent Function
```javascript
queue.nextItem(callback)
```
Example:
```javascript
queue.nextItem(function (err, doc) {
    runScraper(doc._id);
});
```
- Takes a required callback of form `callback(err, doc)`, where `doc` is the retrieved CouchDB document.  The document's name or ID that you used to queue it can be retrieved with `doc._id`, and any other parameters like `doc.insert_time`, `doc.queued`, and `doc.dequeue_time` can be retrieved similarly.
- This function retrieves the next item randomly, by FIFO, or by LIFO according to the queue's global `queue.config`.

####Strategy-Specific Functions
```javascript
queue.randomNext(callback);
queue.fifoNext(callback);
queue.lifoNext(callback);
```
Each of these follows the same rules as [`queue.nextItem(...)`](#nextItem), except that they will use the specified ordering strategy, no matter what `queue.config.order` says.

<a name="dequeue"></a>
###Dequeuing
```javascript
queue.dequeue(message, [callback]);
```

Example:
```javascript
queue.dequeue('12345', function(err, reponse) {...});
```
Note that the dequeued item *will continue to be in the database*, but will be removed from the queue itself by having the documents `queued` parameter set to `false` and the views updated accordingly.

- `message` (*required*)
  - The item name or ID that you intend to dequeue from the queue.
- `callback` (*optional*)
  - A callback function in form `callback(error, response)`.
##Future Releases
For future versions, I hope to add the following features:

- Ability to add your own custom queuing strategies in addition to random, FIFO, and LIFO
- Dequeuing more than one item at once

[1]: http://nodejs.org/
[2]: http://couchdb.apache.org/
[3]: https://github.com/jdotjdot/couchQueue