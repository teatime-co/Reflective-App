"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var path_1 = __importDefault(require("path"));
var os_1 = __importDefault(require("os"));
var dbPath = path_1.default.join(os_1.default.homedir(), 'Library', 'Application Support', 'reflective-web', 'reflective', 'database.db');
console.log("Seeding database at: ".concat(dbPath));
var db = new better_sqlite3_1.default(dbPath);
var now = Date.now();
var day = 24 * 60 * 60 * 1000;
var seedEntries = [
    {
        content: '<p>The project deadline is looming and I can feel the pressure mounting. My team has been working late nights trying to get everything ready for the presentation. I\'m worried we might not finish in time, but trying to stay focused and tackle one task at a time.</p>',
        created_at: now - 28 * day,
        word_count: 52,
    },
    {
        content: '<p>Had a really productive therapy session today. We talked about my tendency to overthink things and how it creates unnecessary stress. She suggested I try mindfulness meditation when I start feeling overwhelmed. Going to give it a shot this week.</p>',
        created_at: now - 25 * day,
        word_count: 48,
    },
    {
        content: '<p>Finally got back into running this morning! Did a slow 3 miles around the park. My legs are sore but it feels great to be active again. Want to build up to 5 miles by the end of the month. Fresh air and movement really help clear my head.</p>',
        created_at: now - 23 * day,
        word_count: 54,
    },
    {
        content: '<p>Mom called today and we had a long chat about everything going on. It\'s nice to have someone who just listens without judgment. She reminded me that it\'s okay to not have everything figured out. Family support means everything.</p>',
        created_at: now - 21 * day,
        word_count: 45,
    },
    {
        content: '<p>Started reading "Atomic Habits" and I\'m already finding it so insightful. The idea that small changes compound over time really resonates with me. I want to build better routines around sleep and exercise. One percent better every day sounds achievable.</p>',
        created_at: now - 19 * day,
        word_count: 48,
    },
    {
        content: '<p>The anxiety has been creeping back lately. Little things that shouldn\'t bother me feel overwhelming. I notice my chest getting tight and my thoughts racing. Need to remember the breathing exercises and maybe schedule another session with my therapist.</p>',
        created_at: now - 17 * day,
        word_count: 45,
    },
    {
        content: '<p>We shipped the product today! All those late nights and stressful meetings paid off. The client loved the presentation and we got approval to move forward. Team went out to celebrate - feels amazing to see hard work recognized. So relieved the pressure is off.</p>',
        created_at: now - 15 * day,
        word_count: 50,
    },
    {
        content: '<p>Hit a new personal record at the gym today - benched 185 pounds! My trainer says my form has improved a lot. Consistent workouts are definitely paying off. Feeling strong and energized. This is exactly why I keep showing up.</p>',
        created_at: now - 13 * day,
        word_count: 45,
    },
    {
        content: '<p>Coffee with Sarah was exactly what I needed. We laughed about old memories and she gave me great advice about the work situation. True friends who really know you are rare. Grateful to have her in my corner. Left feeling lighter and more optimistic.</p>',
        created_at: now - 11 * day,
        word_count: 50,
    },
    {
        content: '<p>Tried a new recipe tonight - homemade pasta from scratch. It was messy and took forever, but the end result was delicious. Cooking is becoming my creative outlet. There\'s something therapeutic about following a recipe and creating something with your hands.</p>',
        created_at: now - 9 * day,
        word_count: 47,
    },
    {
        content: '<p>Woke up feeling uncertain about everything today. Career path, relationships, where I\'m heading. Sometimes the weight of decisions feels paralyzing. Taking it one day at a time is all I can do right now. Tomorrow will bring new perspective.</p>',
        created_at: now - 7 * day,
        word_count: 45,
    },
    {
        content: '<p>Morning meditation practice is starting to stick. Twenty minutes of just sitting and breathing. My mind still wanders constantly but I\'m learning to notice thoughts without attaching to them. Finding moments of calm in the chaos feels revolutionary.</p>',
        created_at: now - 5 * day,
        word_count: 45,
    },
    {
        content: '<p>Team conflict today was rough. Different opinions about project direction led to heated discussion. I hate confrontation but spoke up anyway. Sometimes you have to advocate for what you believe is right even when it\'s uncomfortable. Hoping we can find middle ground tomorrow.</p>',
        created_at: now - 4 * day,
        word_count: 50,
    },
    {
        content: '<p>Six mile run this morning! Couldn\'t have imagined doing that a month ago. The endorphins afterward are incredible. Running gives me time to process thoughts and work through problems. My mental health has improved so much since I started exercising regularly.</p>',
        created_at: now - 3 * day,
        word_count: 48,
    },
    {
        content: '<p>Date night was wonderful. We tried that new Italian place downtown and just talked for hours. It\'s easy to take relationships for granted when life gets busy. Making time for connection is so important. Fell asleep feeling loved and appreciated.</p>',
        created_at: now - 2 * day,
        word_count: 45,
    },
    {
        content: '<p>Grateful for: my health, supportive friends, meaningful work, morning coffee, good books, and the ability to grow and change. Even on hard days, there\'s always something to appreciate. Focusing on gratitude shifts my entire mindset.</p>',
        created_at: now - 1 * day,
        word_count: 42,
    },
    {
        content: '<p>Setting goals for next month: run a 10K, finish two books, cook three new recipes, and maintain daily meditation. Also want to be more present with loved ones and less absorbed in screens. Progress over perfection.</p>',
        created_at: now - 12 * day,
        word_count: 44,
    },
    {
        content: '<p>Tough day at the office. Deadline pressure is back and tensions are high. My manager piled on extra work right when I thought things were settling down. Feeling stretched thin and exhausted. Need to set better boundaries but don\'t know how without seeming difficult.</p>',
        created_at: now - 6 * day,
        word_count: 50,
    },
];
console.log("Preparing to insert ".concat(seedEntries.length, " entries..."));
var insertStmt = db.prepare("\n  INSERT INTO entries (content, created_at, updated_at, word_count)\n  VALUES (?, ?, ?, ?)\n");
var inserted = 0;
for (var _i = 0, seedEntries_1 = seedEntries; _i < seedEntries_1.length; _i++) {
    var entry = seedEntries_1[_i];
    try {
        insertStmt.run(entry.content, entry.created_at, entry.created_at, entry.word_count);
        inserted++;
    }
    catch (error) {
        console.error('Failed to insert entry:', error);
    }
}
console.log("\u2713 Successfully inserted ".concat(inserted, " entries"));
console.log('\nNext steps:');
console.log('1. Open the app (npm run dev)');
console.log('2. Navigate to the Search page');
console.log('3. Click "Generate All Embeddings"');
console.log('4. Test semantic search with queries like:');
console.log('   - "work stress" (should find deadline/project entries)');
console.log('   - "anxiety" (should find worried/overwhelmed entries)');
console.log('   - "exercise" (should find running/gym entries)');
console.log('   - "grateful" (should find gratitude/appreciation entries)');
db.close();
