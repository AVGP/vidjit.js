# Vidjit.js - Javascript Videostreaming library
## Version 0.1.1
**This is an experiment and needs a lot of work!**

## Getting started
Just run
```
$ node server.js
```

and point your browser to http://localhost:8080 in two different windows.
The easy way of doing this is shown index.html, the harder stuff with hooking around 
socket.io can be found in index\_with\_hooks.html

## Why would you want that?

Video streaming has been a domain for plugins (Flash, Silverlight and even worse stuff) but the UserMedia- and WebRTC APIs and Javascript give us enough power to
do it with the on-board awesomeness of modern browsers. So, why not?

## Yeah, but why not just WebRTC?

While WebRTC is super-freakin'-awesome it is not supported by most browsers just now.
The UserMedia API is not supported by all browsers as well, but still it is more wide-spread at the moment.
I hope that this will change sooner rather than later, but for the moment, this is the experiment of creating sort of a fallback solution.

## Requirements:
The default settings require node.js and socket.io to work.
However, if you wish you could just hook sendSegment, receiveSegmentFunc and receiveSegmentTrigger to work around this.

## What's on the ToDo?

* Better performance
* Supporting more browsers by adding the necessary switches, at the moment I default to WebKit.
* Support saving the streamed data somehow (mebbe on the server, maybe even on the client side).
* Have some sleep.