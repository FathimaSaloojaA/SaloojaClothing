const User = require('../../models/userModel');


const loadUserList = async (req, res) => {
  try {

    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 1; // Users per page
    const skip = (page - 1) * limit;

    let filter = {isAdmin: false};
    if (searchQuery) {
      // Case-insensitive partial match on firstName or email
      filter = {
        $or: [
          { firstName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
        ]
      };
    }
     const totalUsers = await User.countDocuments(filter); // Total matching users
    const totalPages = Math.ceil(totalUsers / limit);


    const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    res.render('admin/users', { users ,searchQuery,currentPage:page,totalPages,layout:'admin/adminLayout'});
  } catch (error) {
    console.log(error);
    res.status(500).send("Error loading users");
  }
};
const blockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Block Error:', err);
    res.json({ success: false,message:'something went wrong' });
  }
};

const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
    res.json({ success: true });
  } catch (err) {
    console.error('UnBlock Error:', err);
    res.json({ success: false ,message:'something went wrong'});
  }
};

module.exports = { blockUser, unblockUser ,loadUserList};
