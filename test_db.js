const mongoose = require("mongoose");
const User = require("./backend/models/User");

mongoose.connect("mongodb://127.0.0.1:27017/beyond_grades").then(async () => {
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
