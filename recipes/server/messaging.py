import asyncio
import os

from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CallbackContext, CallbackQueryHandler


TOKEN = os.getenv("KIWI_PLANIFIER_BOT")
CHAT_ID = int(os.getenv("KIWI_PLANIFIER_CHAT_ID", -4898009368))
CHECK_CHAR = "✅"
UNCHECK_CHAR = "⬜"


async def _send_todo_checklist(bot_token: str, chat_id: int, title:str, todos: list[str]):
    """
    Sends a checklist to the given chat.
    
    :param bot_token: Telegram Bot token
    :param chat_id: Target chat ID (user or group)
    :param todos: List of todo item strings
    """
    bot = Bot(token=bot_token)

    keyboard = []
    for index, item in enumerate(todos):
        item = item.strip()

        if not item:
            continue

        keyboard.append([
            InlineKeyboardButton(f"{UNCHECK_CHAR} {item}", callback_data=f"toggle__{index}"),
        ])

    reply_markup = InlineKeyboardMarkup(keyboard)

    await bot.send_message(
        chat_id=chat_id,
        text=title,
        reply_markup=reply_markup
    )


def send_todo_checklist(title, checklist):
    asyncio.run(_send_todo_checklist(TOKEN, CHAT_ID, title, checklist))


async def button_click(update, context):
    query = update.callback_query
    await query.answer()

    if not query.message.reply_markup:
        print(f'no reply_markup for message_id {query.message.message_id} and chat_id {query.message.chat_id}')
        return

    new_keyboard = []
    state = {}

    for i, row in enumerate(query.message.reply_markup.inline_keyboard):
        old_button = row[0]
        btn_text = old_button.text.replace(f'{UNCHECK_CHAR} ', '').replace(f'{CHECK_CHAR} ', '')

        if query.data == f"toggle__{i}":
            checked = not old_button.text.startswith(CHECK_CHAR)
        else:
            checked = old_button.text.startswith(CHECK_CHAR)

        new_text = f"{CHECK_CHAR if checked else UNCHECK_CHAR} {btn_text}"
        new_keyboard.append([InlineKeyboardButton(new_text, callback_data=f"toggle__{i}")])
        state[btn_text] = checked

    # save state
    reply_id = query.message.message_id

    # update the message with the new keyboard
    await context.bot.edit_message_text(
        chat_id=query.message.chat_id,
        message_id=query.message.message_id,
        text=query.message.text,
        reply_markup=InlineKeyboardMarkup(new_keyboard)
    )

def main() -> None:
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CallbackQueryHandler(button_click))

    async def set_commands(app):
        # async def async_send_todo_checklist():
        #     TODOS = ["Buy milk", "Clean desk", "Finish report"]
        #     await _send_todo_checklist(TOKEN, CHAT_ID, "Test list", TODOS)

        # app.create_task(async_send_todo_checklist())
        pass

    app.post_init = set_commands
    app.run_polling()


# Example usage
if __name__ == "__main__":
    main()
