ada-proxy
=========

The proxy settings for my ec2.

It handles redirects to from 80 to internal apps based on url.

It also will self update and trigger updates based upon githooks.

http requests can:

 * Trigger a command to be run. (Must be at the top of the config)

And one of:

 * Be proxied to an internal address.
 * Point at a static folder.
 * Redirect to another url.

https requests can:

 * Trigger a command to be run. (Must be at the top of the config)

And one of:
 
 * Be proxied to an internal address.

 TODO
 ====

 Implement automated self testing.