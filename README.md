## Guess-The-Number

A simple multiplayer realtime game based on Nodejs and Websockets. It resembles typical IRC design, with rooms users can join and send messages to each other. The main interface shows list of all rooms, list of all users in the room and a text area where all messages are displayed.

### Available Commands

1. `/nick <name>` - Change the nickname from the default allocated one.
2. `/join <room>` - Create or join a new room.
3. `/help` - Show info on the text area.
4. `/start <number>` - Start a game
5. `/play <number>` - Participate in an existing game

### Game Logic

When a user starts a game, the system assumes a positive integer between 1 and 1000. Rest of the users within the room will have to guess and enter a number between 1 and 1000. User who has entered an integer closest to the system number will win.
