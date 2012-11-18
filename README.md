# Vidjit.js - Javascript Videostreaming library

**This is an experiment and needs a lot of work!**

## Why would you want that?

Video streaming has been a domain for plugins (Flash, Silverlight and even worse stuff) but the UserMedia- and WebRTC APIs and Javascript give us enough power to
do it with the on-board awesomeness of modern browsers. So, why not?

## Yeah, but why not just WebRTC?

While WebRTC is super-freakin'-awesome it is not supported by most browsers just now.
The UserMedia API is not supported by all browsers as well, but still it is more wide-spread at the moment.
I hope that this will change sooner rather than later, but for the moment, this is the experiment of creating sort of a fallback solution.

## Requirements:
* socket.io & node.js

## What's on the ToDo?

* Better performance
* Supporting more browsers by adding the necessary switches, at the moment I default to WebKit.
* Support saving the streamed data somehow (mebbe on the server, maybe even on the client side).
* Have some more coffee.
* Allowing to hook in to change the videoCallback function, and creating callbacks for receiving stream data as well as sending stream data.
