# Page snapshot

```yaml
- heading "Poker Table" [level=1]
- button "Game Lobby"
- heading "Create New Game" [level=2]
- paragraph: Create a new poker game and share the link with another player to join!
- text: Player 1 (You) TestPlayer1
- paragraph: Your authenticated username
- text: Player 2 Name
- textbox "Enter player 2 name": Player 2
- button "Create Game & Get Shareable Link"
- heading "How it works:" [level=3]
- list:
  - listitem: 1. Enter player names and click "Create Game"
  - listitem:
    - text: "2. You'll get a unique game URL like:"
    - code: localhost:3000/table/abc123
  - listitem: 3. Share this URL with the other player
  - listitem: 4. Both players can view and interact with the same game in real-time!
- button "🔧 Debug Dashboard"
- alert
- button "Open Next.js Dev Tools":
  - img
```