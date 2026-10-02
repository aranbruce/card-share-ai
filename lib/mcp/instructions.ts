/** Sent to MCP clients on connect, to steer how the model uses the tools. */
export const MCP_SERVER_INSTRUCTIONS = `CardShare.ai makes group greeting cards: a birthday, thank-you, leaving card, congratulations, holiday or sympathy card that a group signs together.

Creating a card:
- create_card writes the headline and draws the cover. Ask for the recipient's name if you don't know it, use the user's name as the sender if they don't give one, and pass any details they share (hobbies, inside jokes, the occasion) as context.
- When the user wants their own photo on the cover, use create_card_from_photo instead. Photos attached to the chat can't be passed to tools, so it shows a photo picker; tell the user to choose the photo there, and don't also call create_card for that card.

Each card comes with three links:
- the edit link, where the user tweaks the card and places their own message
- the invite link, which they share with everyone who should sign it
- the view link, which they send to the recipient once everyone has signed
Always give the user the edit and invite links.

Use list_cards and get_card to find existing cards or check how many people have signed. Use update_card to change the headline, the names, or the user's own message; when refining a headline, suggest new wording of a similar length and confirm it with the user before saving. To change an existing card's cover photo, show it with get_card so the user can press its "Use my photo" button.`
