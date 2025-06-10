
const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const { sendEmail } = require('../../utils/mailer');
const bcrypt=require('bcrypt')
const Wallet = require('../../models/walletModel');



const getUserProfile = async(req, res) => {
  const userEmail = req.session.user.email; // assuming user email is in session

    // Fetch user details (assuming already done)
    const user = await User.findOne({ email: userEmail }).lean();

    // Fetch latest 5 orders of this user (sorted newest first)
    const orders = await Order.find({ userEmail })
      .sort({ orderDate: -1 })
      .limit(5)
      .lean();
  res.render('user/profile', {
    user,orders,
    userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout'
  });
};

const getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // assuming JWT puts user in req.user
    res.render('user/edit-profile', { user,
        userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout'
     });
  } catch (err) {
    console.log(err);
    res.redirect('/profile');
  }
};


const postEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { firstName, lastName, email } = req.body;
    const profileImage = req.file ? req.file.filename : user.profileImage;

    // ✅ If email is changed
    if (email !== user.email) {
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Temporarily store new email and OTP
      user.emailTemp = email;
      user.emailVerifyToken = otp;
      user.isVerified = false;

      await sendEmail(
        email,
        'Verify Your New Email Address',
        `Hi ${user.firstName},\n\nYour OTP to verify the new email address is: ${otp}\n\nThank you!`
      );

      await user.save();

      return res.render('user/verify-new-email', {
        userId: user._id,
        userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout',
        message: 'OTP sent to new email address!',
      });
    }

    // ✅ If email is not changed, update other info
    user.firstName = firstName;
    user.lastName = lastName;
    user.profileImage = profileImage;

    await user.save();
    res.redirect('/profile');

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong while editing profile.');
  }
};

const getVerifyNewEmail = (req, res) => {
  res.render('user/verify-new-email', { message: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout', });
};
const postVerifyNewEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { otp } = req.body;

    if (user.emailVerifyToken === otp) {
      user.email = user.emailTemp;
      user.emailTemp = null;
      user.emailVerifyToken = null;
      user.isVerified = true;

      await user.save();

      return res.redirect('/profile');
    } else {
      return res.render('user/verify-new-email', { message: 'Invalid OTP. Please try again.', userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout',});
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Verification failed.');
  }
};

const getChangePassword = (req, res) => {
  res.render('user/change-userpassword', { error: null, success: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout'});
};

const postChangePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render('user/change-userpassword', { error: 'Current password is incorrect', success: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
    }

    if (newPassword !== confirmPassword) {
      return res.render('user/change-userpassword', { error: 'Passwords do not match', success: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
    }

    if (newPassword.length < 6) {
      return res.render('user/change-userpassword', { error: 'Password must be at least 6 characters', success: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.render('user/change-userpassword', { success: 'Password updated successfully!', error: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });

  } catch (err) {
    console.error(err);
    res.render('user/change-userpassword', { error: 'Something went wrong', success: null,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
  }
};

const getOrderDetails=async (req, res) => {
  try {
    const order = await Order.findOne({ orderID: req.params.orderID }).lean();
    if (!order) return res.status(404).send('Order not found');
    res.render('user/orderDetail', { order,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
  } catch (err) {
    res.status(500).send('Server error');
  }
}

const postCancelOrder=async (req, res) => {
  try {
    const order = await Order.findOne({ orderID: req.params.orderID });
    if (!order) return res.status(404).send('Order not found');

    if (order.status !== 'pending') {
      return res.status(400).send('Order cannot be cancelled');
    }

    order.status = 'cancelled';
    await order.save();

    // TODO: Increase stock of products in inventory here

    res.redirect('/profile');
  } catch (err) {
    res.status(500).send('Server error');
  }
};

const getAddAddressPage = (req, res) => {

  res.render('user/addAddress', { user: req.session.user,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
};

const postAddAddress = async (req, res) => {
  try {
    const { street, city, state, zip, country } = req.body;
    const user = await User.findById(req.session.user._id);

    user.addresses.push({ street, city, state, zip, country });
    await user.save();

    res.redirect('/profile');
  } catch (err) {
    console.error("Error adding address:", err);
    res.status(500).send("Something went wrong");
  }
};

const getEditAddressForm = async (req, res) => {
  const userId = req.session.user._id;
  const addressId = req.params.id;

  try {
    const user = await User.findById(userId);
    const address = user.addresses.id(addressId); // Mongoose subdoc lookup

    if (!address) {
      return res.status(404).send('Address not found');
    }

    res.render('user/editAddress', { address,userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

const postEditAddress = async (req, res) => {
  const userId = req.session.user._id;
  const addressId = req.params.id;

  const { street, city, state, zip, country } = req.body;

  try {
    const user = await User.findById(userId);
    const address = user.addresses.id(addressId);

    if (!address) return res.status(404).send('Address not found');

    address.street = street;
    address.city = city;
    address.state = state;
    address.zip = zip;
    address.country = country;

    await user.save();
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

const deleteAddress = async (req, res) => {
  const userId    = req.session.user._id;
  const addressId = req.params.addressId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect(
        `/profile?alert=error&msg=${encodeURIComponent('User not found')}`
      );
    }

    // remove the sub-document
    user.addresses = user.addresses.filter(
      a => a._id.toString() !== addressId
    );
    await user.save();

    return res.redirect(
      `/profile?alert=success&msg=${encodeURIComponent('Address deleted successfully')}`
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/profile?alert=error&msg=${encodeURIComponent('Something went wrong')}`
    );
  }
};

const setDefaultAddress = async (req, res) => {
  const userId = req.session.user._id;
  const addressId = req.params.addressId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect('/profile?alert=error&msg=User not found');
    }

    // Set all addresses to isDefault: false
    user.addresses.forEach(address => {
      address.isDefault = address._id.toString() === addressId;
    });

    await user.save();

    return res.redirect('/profile?alert=success&msg=Default address updated');
  } catch (err) {
    console.error(err);
    return res.redirect('/profile?alert=error&msg=Something went wrong');
  }
};


// GET /user/wallet
const getWalletDetails = async (req, res) => {
  try {
    const userEmail = req.session.user.email; // Or however you store the session

    const wallet = await Wallet.findOne({ userEmail });
    if (!wallet) {
      return res.render('wallet', { balance: 0, transactions: [] });
    }

    res.render('user/wallet', {
      balance: wallet.balance,
      transactions: wallet.transactions.sort((a, b) => b.date - a.date),
      userName: req.session.user ? req.session.user.firstName : '',
    layout: 'user/detailsLayout'
    });
  } catch (err) {
    console.error('Error fetching wallet:', err);
    res.status(500).send('Internal Server Error');
  }
};






module.exports = { getUserProfile,getEditProfile,postEditProfile,getVerifyNewEmail ,
                  postVerifyNewEmail,getChangePassword,postChangePassword,getOrderDetails,
                  postCancelOrder,getAddAddressPage,postAddAddress,getEditAddressForm,
                  postEditAddress,deleteAddress,setDefaultAddress,getWalletDetails};
