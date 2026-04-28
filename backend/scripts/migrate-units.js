const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/smartHome').then(async () => {
  const Unit = require('../models/Unit');
  const User = require('../models/User');

  // 1. Backfill existing agency-generated units with isManaged: true
  const unitResult = await Unit.updateMany(
    { isManaged: { $exists: false } },
    { $set: { isManaged: true } }
  );
  console.log('Units backfilled with isManaged:true:', unitResult.modifiedCount);

  // 2. Report users with no houseCode who will see onboarding
  const noHouse = await User.find(
    { houseCode: { $in: [null, ''] } },
    'name email role houseCode'
  ).lean();
  console.log('Users with no houseCode (will see /onboarding):');
  noHouse.forEach(u => console.log(` - ${u.role} | ${u.email}`));

  // 3. Verify all units now have isManaged
  const allUnits = await Unit.find({}, 'unitCode isManaged claimed').lean();
  console.log('\nAll units after backfill:');
  allUnits.forEach(u => console.log(` - ${u.unitCode} | isManaged: ${u.isManaged} | claimed: ${u.claimed}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}).catch(e => { console.error(e); process.exit(1); });
