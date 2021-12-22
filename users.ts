const userFile = Deno.readTextFileSync('./db.json');
const obj = JSON.parse(userFile);
const arr = obj.filter((a: any) => a);
const set = new Set();
for (const e of arr.flat()) {
    set.add(e.id);
    console.log(e);
}

console.log(set.size);