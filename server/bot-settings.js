import {defaultBotSettings,validateBotSettings} from '../src/bot-settings.js';
export async function readBotSettings(sql){const [row]=await sql`select settings,revision from forja_game.bot_settings where id=true`;return {settings:row?validateBotSettings(row.settings):structuredClone(defaultBotSettings),revision:row?.revision||0};}
