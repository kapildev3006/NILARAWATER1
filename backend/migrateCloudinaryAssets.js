/**
 * Cloudinary Migration Script: xkzptzzq -> dwsdxem8w
 * Clones all media assets from source Cloudinary to target Cloudinary,
 * then updates all references in MongoDB.
 */

const cloudinarySource = require('cloudinary').v2;
const cloudinaryTarget = require('cloudinary').v2;
const mongoose = require('mongoose');

// Configure Source Cloudinary
const sourceConfig = {
  cloud_name: 'xkzptzzq',
  api_key: '912597643772522',
  api_secret: 'fhEsNWI0jtW3m5jBL7QvIdPmuL0'
};

// Configure Target Cloudinary
const targetConfig = {
  cloud_name: 'dwsdxem8w',
  api_key: '615526122419916',
  api_secret: 'pFdhPSJMmtmDP8yFULch-TgP3LE'
};

const MONGO_URI = 'mongodb+srv://kdev7830_db_user:mqmKcoezAW6gFpBe@nilara.vsuabub.mongodb.net/?appName=NILARA';

// Fetch all resources across all resource types (image, raw, video)
async function fetchAllSourceResources() {
  const source = cloudinarySource;
  source.config(sourceConfig);

  const resourceTypes = ['image', 'raw', 'video'];
  let allResources = [];

  for (const rType of resourceTypes) {
    let nextCursor = null;
    do {
      try {
        const options = {
          resource_type: rType,
          max_results: 500
        };
        if (nextCursor) options.next_cursor = nextCursor;

        const result = await source.api.resources(options);
        if (result && result.resources) {
          result.resources.forEach(r => {
            r.custom_resource_type = rType;
            allResources.push(r);
          });
          nextCursor = result.next_cursor;
        } else {
          nextCursor = null;
        }
      } catch (err) {
        if (err.error && err.error.message && err.error.message.includes('not found')) {
          // No resources of this type
          nextCursor = null;
        } else {
          console.warn(`[Warning] Error fetching ${rType} resources:`, err.message);
          nextCursor = null;
        }
      }
    } while (nextCursor);
  }

  return allResources;
}

// Upload a single asset to target Cloudinary
async function uploadAssetToTarget(asset) {
  // Use a separate target instance
  const target = require('cloudinary').v2;
  target.config(targetConfig);

  const sourceUrl = asset.secure_url || asset.url;
  const publicId = asset.public_id;
  const resourceType = asset.custom_resource_type || asset.resource_type || 'image';

  return new Promise((resolve, reject) => {
    target.uploader.upload(
      sourceUrl,
      {
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
        invalidate: true
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

// Concurrency pool helper
async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item, array));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

// Update database URLs
async function updateDatabaseUrls() {
  console.log('\n--- Step 2: Updating MongoDB Database URLs ---');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  let totalDocsUpdated = 0;

  for (const col of collections) {
    const colName = col.name;
    const docs = await db.collection(colName).find({}).toArray();
    let colUpdated = 0;

    for (const doc of docs) {
      const docStr = JSON.stringify(doc);
      if (docStr.includes('xkzptzzq')) {
        // Safe string replacement in serialized JSON
        const updatedDocStr = docStr
          .split('res.cloudinary.com/xkzptzzq/')
          .join('res.cloudinary.com/dwsdxem8w/')
          .split('https://res.cloudinary.com/xkzptzzq')
          .join('https://res.cloudinary.com/dwsdxem8w');

        const updatedDoc = JSON.parse(updatedDocStr);
        delete updatedDoc._id; // avoid immutable field error

        await db.collection(colName).replaceOne({ _id: doc._id }, { ...updatedDoc, _id: doc._id });
        colUpdated++;
        totalDocsUpdated++;
      }
    }

    if (colUpdated > 0) {
      console.log(`[MongoDB] Updated ${colUpdated} documents in collection "${colName}".`);
    }
  }

  console.log(`[MongoDB] Total documents updated across all collections: ${totalDocsUpdated}`);
  await mongoose.disconnect();
}

async function main() {
  console.log('====================================================');
  console.log('CLOUDINARY ASSET MIGRATION: xkzptzzq -> dwsdxem8w');
  console.log('====================================================');

  console.log('\n--- Step 1: Discovering all assets in source Cloudinary ---');
  const resources = await fetchAllSourceResources();
  console.log(`Found ${resources.length} total resources in source account.`);

  if (resources.length === 0) {
    console.log('No resources found to migrate.');
    return;
  }

  console.log(`\n--- Step 2: Copying ${resources.length} assets to new Cloudinary (Concurrency: 5) ---`);
  let completed = 0;
  let successCount = 0;
  let failCount = 0;
  const failedAssets = [];

  await asyncPool(5, resources, async (asset) => {
    try {
      await uploadAssetToTarget(asset);
      successCount++;
      completed++;
      if (completed % 10 === 0 || completed === resources.length) {
        console.log(`Progress: [${completed}/${resources.length}] (${Math.round((completed/resources.length)*100)}%) assets migrated.`);
      }
    } catch (err) {
      failCount++;
      completed++;
      console.error(`[Error] Failed to migrate asset: ${asset.public_id}:`, err.message);
      failedAssets.push({ id: asset.public_id, error: err.message });
    }
  });

  console.log('\n--- Asset Copy Summary ---');
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failedAssets.length > 0) {
    console.warn('Failed assets:', JSON.stringify(failedAssets, null, 2));
  }

  // Step 3: Update Database
  await updateDatabaseUrls();

  console.log('\n====================================================');
  console.log('CLOUDINARY MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
