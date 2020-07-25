import {Collection, Db, MongoClient} from 'mongodb'

export class Connection {
    private client: MongoClient;
    private db: Db;
    private collection: Collection<Entry>;

    constructor(client: MongoClient) {
        this.client = client;
        this.db = this.client.db("main")
        this.collection = this.db.collection("mainColl")
    }

    async addEntry(entry: Entry): Promise<boolean> {
        return this.collection.insertOne(entry).then(isOk)
    }

    async removeEntry(rfid: string): Promise<boolean> {
        return this.collection.deleteOne({RFID: rfid}).then(isOk)
    }

    async editEntry(rfid: string, patchEntry: Partial<Entry>): Promise<boolean> {
        return this.collection.updateOne({RFID: rfid}, patchEntry).then(isOk)
    }

    async getEntry(rfid: string): Promise<Entry | null> {
        return this.collection.findOne({RFID: rfid})
    }

    async close(): Promise<void> {
        return this.client.close()
    }
}

export type Entry = {
    rfid: string,
    name: string,
    accessLevel: AccessLevel,
    // Access_Code: NoIdea // TODO: Implement stuff related to AccessCode once its used
}

export enum AccessLevel {
    Full = 'Full',
    Basic = 'Basic',
    None = 'None'
}

interface OkResult {
    result: {
        ok?: number
    }
}

const isOk = (taskResult: OkResult) => taskResult.result.ok === 1