#couchQueue

A [Node.js][1] queuing system for [CouchDB][2].

##Basics
Sometimes, you are unable to or unwilling to use a specialized queuing system like Amazon SQS or Redis for your project.  This project is intended to fill that gap for users of CouchDB.  With couchQueue, you have the ability to:

 - [create the queuing database](#create) and [configuring](#configure)
 - [enqueue items](#enqueue)
 - dequeue items
 - get the next item according to your chosen queuing strategy

The queuing itself is performed using views and map/reduce strategies on those views.

##Detail

###Installation

npm:

    npm install couchqueue

Alternatively, you can get it from the [github][3].

###Importing
To use couchQueue, simply `require` it:

    CouchQueue = require("couchQueue");

<a name="create"></a>
###Setting Up and Creating Your Queue

    queue = new CouchQueue(queueName, hostUrl, port, auth, config, debug);

Example usage:

    queue = new CouchQueue('idQueue', 'mycouch.cloudapp.net', 3000,
            {username: 'myusername', password: 'mypassword'},
            {order: 'fifo', override: false}, false);

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

<a name="enqueue"></a>
###Enqueuing


##Future Releases
For future versions, I hope to add the following features:

- Ability to add your own custom queuing strategies in addition to random, FIFO, and LIFO

[1]: http://nodejs.org/
[2]: http://couchdb.apache.org/
[3]: https://github.com/jdotjdot/couchQueue