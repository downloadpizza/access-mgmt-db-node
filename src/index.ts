import {Collection, Db, MongoClient} from 'mongodb'

const url = 'mongodb://localhost:27017'

class Connection {
    private client: MongoClient;
    private db: Db;
    private collection: Collection<Entry>;

    constructor() {
        this.client = new MongoClient(url)
        this.db = this.client.db("main")
        this.collection = this.db.collection("mainColl")
    }

    addEntry(entry: Entry): Promise<boolean> {
        return this.collection.insertOne(entry).then(isOk)
    }

    removeEntry(rfid: string): Promise<boolean> {
        return this.collection.deleteOne({RFID: rfid}).then(isOk)
    }

    editEntry(rfid: string, patchEntry: Partial<Entry>) {
        return this.collection.updateOne({RFID: rfid}, patchEntry).then(isOk)
    }

    getEntry(rfid: string): Promise<Entry | null> {
        return this.collection.findOne({RFID: rfid})
    }
}

type Entry = {
    RFID: string,
    Name: string,
    Access_Level: AccessLevel,
    // Access_Code: NoIdea // TODO: Implement stuff related to AccessCode once its used
}

type AccessLevel = 'Full'
    | 'Basic'
    | 'None'

interface OkResult {
    result: {
        ok?: number
    }
}

const isOk = (taskResult: OkResult) => taskResult.result.ok === 1