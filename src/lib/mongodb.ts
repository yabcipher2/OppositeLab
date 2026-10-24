import { Db, MongoClient } from "mongodb";

declare global {
  var oppositelabMongoPromise: Promise<MongoClient> | undefined;
  var oppositelabMongoUri: string | undefined;
}

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017";
  const databaseName = process.env.MONGODB_DB?.trim() || "oppositelab";

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://.");
  }

  if (global.oppositelabMongoUri !== uri) {
    global.oppositelabMongoUri = uri;
    global.oppositelabMongoPromise = undefined;
  }

  let clientPromise = global.oppositelabMongoPromise;
  if (!clientPromise) {
    clientPromise = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 }).connect();
    global.oppositelabMongoPromise = clientPromise;
    clientPromise.catch(() => {
      if (global.oppositelabMongoPromise === clientPromise) {
        global.oppositelabMongoPromise = undefined;
        global.oppositelabMongoUri = undefined;
      }
    });
  }
  const client = await clientPromise;
  return client.db(databaseName);
}
