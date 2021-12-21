import { Message, User } from "https://deno.land/x/grammy@v1.5.4/platform.deno.ts";

export class SavedUser {
    id: string;
    chatId: number;
    user: User;
    lottoNumbers: number[];
    constructor(msg: Message, lotto: number | number[]) {
        this.chatId = msg.chat.id;
        this.user = msg.from!;
        this.lottoNumbers = Array.isArray(lotto) ? lotto : [lotto];
        this.id = SavedUser.calcId(this.chatId, this.user.id);
    }

    static calcId(chatId: number, userId: number) {
        return chatId.toString() + '|' + userId.toString();
    }
}

export class DB {
    // The index of the array is the number, so if multiple users have the same number, all of them will be together
    // Is it efficient to use an array for this things? No, Is it a good practice? No. But Iw anted to do this quick
    public lottoUsersByNumber: (SavedUser[] | undefined)[] = [];
    // For quicker operation, we having this map here
    private lottoUsersById = new Map<string, SavedUser>();

    constructor() {
        this.load();
    }

    addNumber(msg: Message, number: number) {
        let user = this.addUser(msg, number);

        if (this.lottoUsersByNumber[number] == null) {
            this.lottoUsersByNumber[number] = [];
        }
        this.lottoUsersByNumber[number]!.push(user);
        this.save();
    }

    private addUser(msg: Message, number: number) {
        let user = new SavedUser(msg, number);
        if (this.lottoUsersById.has(user.id)) {
            user = this.lottoUsersById.get(user.id)!;
            user.lottoNumbers.push(number);
        } else {
            this.lottoUsersById.set(user.id, user);
        }
        return user;
    }

    removeNumber(number: number) {
        const users = this.lottoUsersByNumber[number];
        if (users) {
            for (const user of users) {
                const numberIndex = user.lottoNumbers.findIndex(ticket => ticket === number);
                if (numberIndex !== -1) {
                    user.lottoNumbers.splice(numberIndex, 1);
                }
            }
        }

        this.lottoUsersByNumber[number] = undefined;
        this.save();
    }

    getTicketsByUser(msg: Message) {
        const newUser = new SavedUser(msg, -1);
        if (this.lottoUsersById.has(newUser.id)) {
            return this.lottoUsersById.get(newUser.id)?.lottoNumbers || [];
        }
        return [];
    }

    removeUser(msg: Message) {
        const newUser = new SavedUser(msg, -1);
        const user = this.lottoUsersById.get(newUser.id);
        if (user) {
            for (const number of user.lottoNumbers) {
                const numberUsers = this.lottoUsersByNumber[number];
                if (!numberUsers || numberUsers.length === 1) {
                    this.lottoUsersByNumber[number] = undefined;
                } else {
                    const index = this.lottoUsersByNumber[number]?.findIndex(savedUser => user.id === savedUser.id);
                    if (index != null && index !== -1) {
                        this.lottoUsersByNumber[number]?.splice(index, 1);
                    }
                }
            }
        }
        this.lottoUsersById.delete(newUser.id);
        this.save();
    }

    save() {
        Deno.rename('./db.json', 'db.json.bak').catch(() => {}).finally(() => {
            Deno.writeTextFile('./db.json', JSON.stringify(this.lottoUsersByNumber));
        });
    }

    load() {
        let txt: string;
        try {
            txt = Deno.readTextFileSync('./db.json');
        } catch (e) {
            txt = '[]';
        }

        try {
            this.lottoUsersByNumber = JSON.parse(txt);
        } catch (e) {
            try {
                txt = Deno.readTextFileSync('./db.json.bak');
            } catch (e) {
                txt = '[]';
            }
        }
        try {
            this.lottoUsersByNumber = JSON.parse(txt);
        } catch (goodError) {
            this.lottoUsersByNumber = [];
            console.log(goodError);
        }
        for (const user of this.lottoUsersByNumber.flat()) {
            if (user) {
                this.lottoUsersById.set(user.id, user);
            }
        }
    }

}