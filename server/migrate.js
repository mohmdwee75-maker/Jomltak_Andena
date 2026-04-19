const mongoose = require('mongoose');

// ==========================================
// حط الرابط القديم بتاع Atlas هنا
const ATLAS_URI = 'mongodb+srv://mohmadweee75_db_user:zwxZd3ajUbFZ8vjH@cluster0.2adqwfx.mongodb.net/?appName=Cluster0';

// حط رابط الداتابيز الجديدة بتاعة Railway هنا
const RAILWAY_URI = 'mongodb://mongo:aozkyJGfzJDSVwQhuYqzQoCybTXGmbLZ@roundhouse.proxy.rlwy.net:32371';
// ==========================================

async function migrate() {
    try {
        console.log("⏳ جاري الاتصال بقواعد البيانات...");

        // الاتصال بالقاعدة القديمة والجديدة
        const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log("✅ تم الاتصال بقاعدة بيانات Atlas القديمة");

        const railwayConn = await mongoose.createConnection(RAILWAY_URI).asPromise();
        console.log("✅ تم الاتصال بقاعدة بيانات Railway الجديدة");

        // سحب أسماء كل أجزاء الداتا (الـ collections)
        const collections = await atlasConn.db.listCollections().toArray();

        for (let collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            console.log(`\n🔄 جاري العمل على [${collectionName}]...`);

            // سحب البيانات من Atlas
            const docs = await atlasConn.db.collection(collectionName).find({}).toArray();

            if (docs.length > 0) {
                // مسح البيانات لو كانت موجودة بالخطأ في القاعدة الجديدة عشان مايكررهاش
                await railwayConn.db.collection(collectionName).deleteMany({});

                // رفع البيانات لـ Railway
                await railwayConn.db.collection(collectionName).insertMany(docs);
                console.log(`✔️ تم نقل ${docs.length} صف إلى Railway بنجاح`);
            } else {
                console.log(`⚠️ الداتا فاضية، مفيش حاجة تتنقل`);
            }
        }

        console.log("\n🎉 تمت عملية النقل بالكامل بنجاااح!");
        process.exit(0);

    } catch (err) {
        console.error("❌ حصل خطأ أثناء النقل:", err.message);
        process.exit(1);
    }
}

migrate();
