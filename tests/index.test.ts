import {Connection} from "../src";
import {MongoClient} from "mongodb";

test('Connect to a database', async () => {
    const mongoClient = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true })
    await expect(mongoClient
        .connect()
        .then(client => new Connection(client))
        .then(conn => conn.close()))
        .resolves.toBeUndefined()
})