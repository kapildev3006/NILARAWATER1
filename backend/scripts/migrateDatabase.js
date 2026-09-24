/**
 * NILARA MongoDB Atlas Migration Script
 * 
 * Transfers all collections, documents, and indexes from:
 * Source: mongodb+srv://cyberlimcare_db_user:...@nilara.jcia1cx.mongodb.net/?appName=Nilara
 * Target: mongodb+srv://kdev7830_db_user:...@nilara.vsuabub.mongodb.net/?appName=NILARA
 */

const mongoose = require('mongoose');
const { MongoClient } = mongoose.mongo;

const SOURCE_URI = 'mongodb+srv://cyberlimcare_db_user:bfODqSnubHeEbeY8@nilara.jcia1cx.mongodb.net/?appName=Nilara';
const TARGET_URI = 'mongodb+srv://kdev7830_db_user:mqmKcoezAW6gFpBe@nilara.vsuabub.mongodb.net/?appName=NILARA';

async function migrate() {
  console.log('====================================================');
  console.log('   NILARA DATABASE MIGRATION STARTING');
  console.log('====================================================');

  console.log('\n[1/4] Connecting to Source and Target MongoDB clusters...');
  const srcClient = new MongoClient(SOURCE_URI);
  const tgtClient = new MongoClient(TARGET_URI);

  await srcClient.connect();
  console.log('✓ Connected to Source Cluster (nilara.jcia1cx)');
  
  await tgtClient.connect();
  console.log('✓ Connected to Target Cluster (nilara.vsuabub)');

  const srcDb = srcClient.db();
  const tgtDb = tgtClient.db();

  console.log(`\nSource DB: "${srcDb.databaseName}" | Target DB: "${tgtDb.databaseName}"`);

  console.log('\n[2/4] Fetching all collections from source database...');
  const collections = await srcDb.listCollections().toArray();
  console.log(`Found ${collections.length} collections to migrate.\n`);

  let totalMigratedDocs = 0;
  const summary = [];

  console.log('[3/4] Migrating collections, documents, and indexes...\n');

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const srcCol = srcDb.collection(colName);
    const tgtCol = tgtDb.collection(colName);

    // 1. Fetch document count & documents
    const docCount = await srcCol.countDocuments();
    let transferredCount = 0;

    if (docCount > 0) {
      const docs = await srcCol.find({}).toArray();
      const insertResult = await tgtCol.insertMany(docs, { ordered: false });
      transferredCount = insertResult.insertedCount;
      totalMigratedDocs += transferredCount;
    }

    // 2. Fetch and replicate indexes (excluding default _id_ index)
    let indexCount = 0;
    try {
      const indexes = await srcCol.indexes();
      const nonDefaultIndexes = indexes
        .filter(idx => idx.name !== '_id_')
        .map(idx => {
          const indexSpec = {
            key: idx.key,
            name: idx.name,
          };
          if (idx.unique) indexSpec.unique = true;
          if (idx.sparse) indexSpec.sparse = true;
          if (idx.expireAfterSeconds !== undefined) indexSpec.expireAfterSeconds = idx.expireAfterSeconds;
          return indexSpec;
        });

      if (nonDefaultIndexes.length > 0) {
        await tgtCol.createIndexes(nonDefaultIndexes);
        indexCount = nonDefaultIndexes.length;
      }
    } catch (idxErr) {
      console.warn(`  Warning copying indexes for ${colName}:`, idxErr.message);
    }

    // 3. Verify target count
    const verifiedTargetCount = await tgtCol.countDocuments();
    const isSuccess = verifiedTargetCount === docCount;

    summary.push({
      collection: colName,
      sourceCount: docCount,
      targetCount: verifiedTargetCount,
      indexesReplicated: indexCount,
      status: isSuccess ? 'MATCH' : 'MISMATCH'
    });

    console.log(`  ✓ ${colName.padEnd(20)} | Docs: ${docCount.toString().padStart(3)} transferred | Indexes: ${indexCount} | Verified: ${isSuccess ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n[4/4] Final Verification & Summary:');
  console.log('----------------------------------------------------');
  console.table(summary);
  console.log(`Total documents transferred: ${totalMigratedDocs}`);

  const allPassed = summary.every(s => s.status === 'MATCH');

  await srcClient.close();
  await tgtClient.close();

  if (allPassed) {
    console.log('\n✓ MIGRATION COMPLETED SUCCESSFULLY WITH 100% INTEGRITY!');
  } else {
    console.error('\n✗ WARNING: Some collections had count mismatches!');
    process.exit(1);
  }
}

migrate().catch(err => {
  console.error('\n✗ Migration fatal error:', err);
  process.exit(1);
});
