import { Bot } from "https://deno.land/x/grammy@v1.5.4/mod.ts";
import { LottoResponse } from "./lotto-response.ts";
import { DB } from "./user-db.ts";

// Create bot object
const bot = new Bot(Deno.env.get("gorbot_tg_token") || ''); // <-- place your bot token inside this string
const db = new DB();

async function checkNumbers() {
    const date = new Date();
    if ((date.getDate() === 22 && date.getMonth() === 11) || (date.getDate() === 6 && date.getMonth() === 0)) {
        console.log('Checking!')
        for (const number in db.lottoUsersByNumber) {
            if (number && db.lottoUsersByNumber[number]) {
                const URL = new Date().getDate() === 22 ? 'https://api.elpais.com/ws/LoteriaNavidadPremiados' : 'https://api.elpais.com/ws/LoteriaNinoPremiados'
                const result = await fetch(URL + '?n=' + number);
                // const result = await fetch('http://localhost:8000/premios.txt');
                const resultText = await result.text();
                const json = resultText.substr(9);
                const obj: LottoResponse = JSON.parse(json);
                if (obj.error === 0 && obj.premio !== 0) {
                    for (const user of db.lottoUsersByNumber[number] || []) {
                        bot.api.sendMessage(user.chatId, `¡Enhorabuena! [${user.user.first_name}](tg://user?id=${user.user.id}), tu décimo ${number.toString().padStart(5, '0')} ha sido premiado con ${obj.premio}€\nPor favor, recuerda que este medio no es oficial, compruebalo de inmediato con otra fuente.`, {parse_mode: "Markdown"}).catch(() => {});
                    }
                    db.removeNumber(+number);
                }
            }
        }
    }
}

// Listen for messages
bot.command("start", (ctx) => ctx.reply("¡Hola, mandame tu decimo de 5 digitos!"));
bot.command("about", (ctx) => ctx.reply("Hecho con ❤ por @TLuigi003 . Si te gusta puedes donarme un cafecito: https://ko-fi.com/luismayo"))
bot.command('decimos', (ctx) => {
    if (ctx.message) {
        ctx.reply('Tienes los siguientes decimos(si un decimo ya ha sido premiado no aparecerá):\n' + db.getTicketsByUser(ctx.message).map(ticker => ticker.toString().padStart(5, '0')).join('\n'));
    }
});
bot.command('borrar', (ctx) => {
    db.removeUser(ctx.msg);
    ctx.reply('Se han borrado tus décimos');
});
bot.on("message:text", (ctx) => {
    if (/\d{5}/.test(ctx.message.text)) {
        const currentDate = new Date();
        const number = ctx.message.text.match(/\d{5}/)![0];
        db.addNumber(ctx.message, +number);
        if (currentDate >= new Date(currentDate.getFullYear(), 11, 23) && currentDate <= new Date(currentDate.getFullYear() + 1, 0, 7)) {
            ctx.reply('Se ha añadido tu decimo para el sorteo del niño');
        } else {
            ctx.reply('Se ha añadido tu decimo para el sorteo de navidad');
        }
    }
});

// Launch!
bot.start();
setInterval(checkNumbers, 60000 * 5);
checkNumbers();
// setInterval(checkNumbers, 10000);