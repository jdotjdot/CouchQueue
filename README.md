#couchQueue

A [Node.js][1] queuing system for [CouchDB][2].

##Basics
Sometimes, you are unable to or unwilling to use a specialized queuing system like Amazon SQS or Redis for your project.  This project is intended to fill that gap for users of CouchDB.  With couchQueue, you have the ability to:

 - [create the queuing database](#create)
 - enqueue items
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
`config.order`


##Future Releases
For future versions, I hope to add the following features:

- Ability to add your own custom queuing strategies in addition to random, FIFO, and LIFO

[1]: http://nodejs.org/
[2]: http://couchdb.apache.org/
[3]: https://github.com/jdotjdot/couchQueue