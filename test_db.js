const mongoose = require("./backend/db/sqlite");
const User = require("./backend/models/User");

mongoose.connect("./backend/database.sqlite").then(async () => {
  const users = await User.find({});
  console.log("All users:");
  users.forEach(u => console.log(u.full_name, u.role, u._id.toString()));

  const regex = new RegExp("Koki", "i");
  const searched = await User.find({
    role: "student",
    $and: [
      { $or: [{ allowComparison: true }, { allowComparison: { $exists: false } }] },
      { $or: [{ full_name: regex }, { roll_number: regex }, { department: regex }] }
    ]
  });
  console.log("Searched:", searched.map(u => u.full_name));
  process.exit();
});
