# Postman Game

A simple multiplayer realtime game based on Nodejs and Websockets. It resembles typical IRC design, with rooms users can join and send messages to each other. The main interface shows list of all rooms, list of all users in the room and a text area where all messages are displayed.

The following actions are permitted -

1. `/nick <name>` - Change the nickname from the default allocated one.
2. `/join <room>` - Create or join a new room.
3. `/help` - Show info on the text area.

### TODO

1. Game logic.
2. Users sending PM to each other.
3. Room creators can ban/block users.
4. Porting to SailsJS.
