import {AccessLevel, Connection, Entry} from "../src";
import {MongoClient} from "mongodb";
import {ChildProcess, exec} from 'child_process'

const port = 27010
const url = `mongodb://localhost:${port}`

const filterObject = (obj: any, fields: string[]) => Object.keys(obj)
    .filter(key => fields.includes(key))
    .reduce((newObj: any, key) => {
        newObj[key] = obj[key];
        return newObj;
    }, {})

let mongod: ChildProcess

beforeAll(async (done) => {
    exec("mkdir test-database")
    mongod = exec(`mongod --dbpath test-database --port ${port}`)
    mongod.stdout!!.on('data', chunk => {
        chunk.match(`waiting for connections on port ${port}`) && done()
    })
    mongod.on('close', code => {
        done.fail(`MongoDB exited with code ${code}`)
    })
})

afterAll(async (done) => {
    mongod.kill()
    exec("rm -rf test-database")
    done()
})

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
        const client = await new MongoClient(url,{ useUnifiedTopology: true }).connect()
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
            expect(receivedEntry).toMatchObject(filterObject(entry, entryFields))
        }
    })

    test('Test get entry with non-existent entry', async () => {
        await expect(connection.getEntry("non-existent-rfid")).resolves.toBeNull()
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
            await expect(connection.getEntry(newEntry.rfid)).resolves.toMatchObject(filterObject(newEntry, entryFields))
        }
    })
})