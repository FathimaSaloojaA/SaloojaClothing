const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const authRoutes = require('./routes/user/authRoutes');
const adminAuthRoutes = require('./routes/admin/authRoutes');
const adminUserRoutes = require('./routes/admin/userRoutes');
const adminCategoryRoutes = require('./routes/admin/categoryRoutes');
const adminProductRoutes = require('./routes/admin/productRoutes');
const adminOrderRoutes = require('./routes/admin/orderRoutes');
const adminStockRoutes = require('./routes/admin/stockRoutes');
const adminCouponRoutes = require('./routes/admin/couponRoutes');
const adminOfferRoutes = require('./routes/admin/offerRoutes');
const cartRoutes = require('./routes/user/cartRoutes');
const checkoutRoutes = require('./routes/user/checkoutRoutes');
const orderRoutes=require('./routes/user/orderRoutes');
const productRoutes = require('./routes/user/productRoutes');
const profileRoutes = require('./routes/user/profileRoutes');
const wishlistRoutes = require('./routes/user/wishlistRoutes');
const path = require("path");
const indexRoutes = require('./routes/user/indexRoutes')
const passport = require('./middlewares/passport');
const setCartCount = require('./middlewares/cartCount');
const setWishlistCount = require('./middlewares/setWishlistCount');
 // adjust path as needed
const expressLayouts = require('express-ejs-layouts');
const { EMAIL_FROM, EMAIL_PASS } = require('./utils/constants');

const flash = require('connect-flash');
dotenv.config();

const app = express();

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ Connected to MongoDB");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Middleware

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());




const userSession = session({
  name: 'user.sid',
  secret: 'userSecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});

const adminSession = session({
  name: 'admin.sid',
  secret: 'adminSecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
});

// Step 3: Apply session conditionally
app.use((req, res, next) => {
  if (req.url.startsWith('/admin')) {
    adminSession(req, res, next);
  } else {
    userSession(req, res, next);
  }
});

app.use(setCartCount);
app.use(setWishlistCount);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);



// Static files

// Sample route
app.use('/', authRoutes);
 app.use('/', indexRoutes);
app.use('/',productRoutes);
// mount un
 app.use('/admin', adminAuthRoutes);
app.use('/admin', adminUserRoutes); // '/admin/users' now works 
app.use('/admin', adminCategoryRoutes);
 app.use('/admin', adminProductRoutes) ;
 app.use('/admin', adminOrderRoutes)
 app.use('/admin', adminStockRoutes)
 app.use('/admin', adminCouponRoutes)
 app.use('/admin', adminOfferRoutes)
app.use('/',profileRoutes);
 app.use('/cart', cartRoutes); 
 app.use('/checkout', checkoutRoutes);
  app.use('/orders', orderRoutes);
  app.use('/wishlist',wishlistRoutes)

// Admin routes first
// User order routes should be AFTER admin routes
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
