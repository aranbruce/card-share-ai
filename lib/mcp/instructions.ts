/** Sent to MCP clients on connect, to steer how the model uses the tools. */
export const MCP_SERVER_INSTRUCTIONS = `CardShare.ai makes group greeting cards. Use create_card when the user wants a card for someone (a birthday, thank-you, leaving card, congratulations, holiday or sympathy card). It writes the headline and draws the cover, then returns three links:
- the edit link, where the user adds their own message and tweaks the card
- the invite link, which they share with everyone who should sign it
- the view link, which they send to the recipient once everyone has signed
Always give the user the edit and invite links. Use list_cards and get_card to find existing cards or check how many people have signed. Use update_card to change the headline, the names, or the user's own message inside the card; when refining a headline, suggest the new wording and confirm it before saving. If the user wants their own photo on the cover (including one attached to the chat, which can't be passed to tools), use create_card_from_photo for a new card, or show the card with get_card so they can use its "Use my photo" button.`
