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

##Future Releases
For future versions, I hope to add the following features:

- Ability to add your own custom queuing strategies in addition to random, FIFO, and LIFO

[1]: http://nodejs.org/
[2]: http://couchdb.apache.org/
[3]: https://github.com/jdotjdot/couchQueue

<br><br><br><br><br><br><br><br><br><br><br><br>


#Hi#

This is a [Markdown][1] live editor built using [WMD][2] and other open source tools. I use it to write entries for my [posterous][3] blog and other places where Markdown is needed.

##Usage##

When you press the *copy markdown* button you'll get the markdown markup wrapped in `markdown` and `p` tags, so you can send it as an email to post@posterous.com to create a new entry for your own blog.

> *if your browser supports HTML 5, this text will be stored locally*

###Adding images###
![alt text][4]

###Writting code ###

    #!javascript
    function hi(){
        alert('hi!');
    }

To learn more about markdown click [here][5]

Dillinger
=========

Dillinger is a cloud-enabled HTML5 Markdown editor.

  - Type some Markdown text in the left window
  - See the HTML in the right
  - Magic

Markdown is a lightweight markup language based on the formatting conventions that people naturally use in email.  As [John Gruber] writes on the [Markdown site] [1]:

> The overriding design goal for Markdown's
> formatting syntax is to make it as readable 
> as possible. The idea is that a
> Markdown-formatted document should be
> publishable as-is, as plain text, without
> looking like it's been marked up with tags
> or formatting instructions.

This text your see here is *actually* written in Markdown! To get a feel for Markdown's syntax, type some text into the left window and watch the results in the right.  

Version
-

2.0

Tech
-----------

Dillinger uses a number of open source projects to work properly:

* [Ace Editor] - awesome web-based text editor
* [Showdown] - a port of Markdown to JavaScript
* [Twitter Bootstrap] - great UI boilerplate for modern web apps
* [node.js] - evented I/O for the backend
* [Express] - fast node.js network app framework [@tjholowaychuk]
* [keymaster.js] - awesome keyboard handler lib by [@thomasfuchs]
* [jQuery] - duh 

Installation
--------------

NOTE: currently the `app.js` file expects a Redis instance to be up and running and available.  It is used for session storage and will be used in the future.

1. Clone the repo
2. `cd dillinger`
3. `npm i`
4. `mkdir -p public/files`
5. `mkdir -p public/files/md && mkdir -p public/files/html`
6. `sudo node app`


License
-

MIT

*Free Software, Fuck Yeah!*

  [john gruber]: http://daringfireball.net/
  [@thomasfuchs]: http://twitter.com/thomasfuchs
  [1]: http://daringfireball.net/projects/markdown/
  [showdown]: http://www.attacklab.net/
  [ace editor]: http://ace.ajax.org
  [node.js]: http://nodejs.org
  [Twitter Bootstrap]: http://twitter.github.com/bootstrap/
  [keymaster.js]: https://github.com/madrobby/keymaster
  [jQuery]: http://jquery.com  
  [@tjholowaychuk]: http://twitter.com/tjholowaychuk
  
    