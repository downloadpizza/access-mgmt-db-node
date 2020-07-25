import {AccessLevel, Connection, Entry} from "../src";
import {MongoClient} from "mongodb";

const url = 'mongodb://localhost:27017'

const filterObject = (obj: any, fields: string[]) => Object.keys(obj)
    .filter(key => fields.includes(key))
    .reduce((newObj: any, key) => {
        newObj[key] = obj[key];
        return newObj;
    }, {})

expect.extend({
    toMatchObjectByFields(received: any, expected: any, fields: string[]) {
        const filteredReceived = filterObject(received, fields)
        const filteredExpected = filterObject(expected, fields)
        const equal = fields.every(field => filteredReceived[field] === filteredExpected[field])
        if(equal) {
            return {
                pass: true,
                message: () => "Expected objects to mismatch"
            }
        } else {
            return {
                pass: false,
                message: () =>
                    "Expected objects to match \n" +
                    "Difference:\n\n" +
                    `Expected: ${this.utils.printExpected(filteredExpected)}\n` +
                    `Received: ${this.utils.printReceived(filteredReceived)}`
            }
        }
    }
})

declare global {
    namespace jest {
        interface Matchers<R> {
            toMatchObjectByFields(expected: any, fields: string[]): CustomMatcherResult
        }
    }
}

test('Connect to a database', async () => {
    const mongoClient = await new MongoClient(url, { useUnifiedTopology: true }).connect()
    const conn = new Connection(mongoClient)
    await expect(conn.close()).resolves.toBeUndefined()
})

test('Connect to a non-existent database', () => {
    const mongoClient = new MongoClient('mongodb://localhost:1337',{ useUnifiedTopology: true })
    expect(() => new Connection(mongoClient)).toThrowError("Client is not connected")
})

const entryFields = ["rfid", "name", "accessLevel"]

describe('test methods of connection class', () => {
    let entries: Entry[]
    let connection: Connection

    beforeEach(async (done) => {
        const client = await new MongoClient('mongodb://localhost:27017',{ useUnifiedTopology: true }).connect()
        connection = new Connection(client)
        entries = [
            {
                rfid: "one",
                name: "John Doe",
                accessLevel: AccessLevel.Basic
            },
            {
                rfid: "two",
                name: "Mister Bread",
                accessLevel: AccessLevel.Full
            },
            {
                rfid: "three",
                name: "Please Change Name",
                accessLevel: AccessLevel.Basic
            }
        ]
        for (const entry of entries) {
            await expect(connection.addEntry(entry)).resolves.toBe(true)
        }
        done()
    })

    afterEach(async (done) => {
        await expect(connection.clearCollection()).resolves.toBe(true)
        await expect(connection.close()).resolves.toBeUndefined()
        done()
    })

    test('Test get entry', async () => {
        for (const entry of entries) {
            const receivedEntry = await connection.getEntry(entry.rfid)
            expect(receivedEntry).toMatchObjectByFields(entry, entryFields)
        }
    })

    test('Test remove entry', async () => {
        for (const entry of entries) {
            await expect(connection.removeEntry(entry.rfid)).resolves.toBe(true)
        }
    })

    test('Test edit entry', async () => {
        let patchEntries: Partial<Entry>[] = [
            {
                rfid: "changedrfid"
            },
            {
                accessLevel: AccessLevel.None
            },
            {
                name: "changedname"
            }
        ]
        let entriesAfterPatch = [
            {
                rfid: "changedrfid",
                name: "John Doe",
                accessLevel: AccessLevel.Basic
            },
            {
                rfid: "two",
                name: "Mister Bread",
                accessLevel: AccessLevel.None
            },
            {
                rfid: "three",
                name: "changedname",
                accessLevel: AccessLevel.Basic
            }
        ]

        for(let i=0;i<entries.length;i++) {
            const rfid = entries[i].rfid
            const patch = patchEntries[i]
            const newEntry = entriesAfterPatch[i]

            await expect(connection.editEntry(rfid, patch)).resolves.toBe(true)
            await expect(connection.getEntry(newEntry.rfid)).resolves.toMatchObjectByFields(newEntry, entryFields)
        }
    })
})