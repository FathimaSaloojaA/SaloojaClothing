const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const adminAuthRoutes = require('./routes/admin/authRoutes');
const adminUserRoutes = require('./routes/admin/userRoutes');
const adminCategoryRoutes = require('./routes/admin/categoryRoutes');
const adminProductRoutes = require('./routes/admin/productRoutes');

const path = require("path");
const indexRoutes = require('./routes/user/indexRoutes')
const passport = require('./middlewares/passport');
 // adjust path as needed
const expressLayouts = require('express-ejs-layouts');
const { EMAIL_FROM, EMAIL_PASS } = require('./utils/constants');

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

/*app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 ,secure: false,  // set to true only if HTTPS
    httpOnly: true,
    sameSite: 'lax'        // Use HTTPS
     
}}));*/

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


app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);



// Static files

// Sample route
const authRoutes = require('./routes/user/authRoutes');
app.use('/', authRoutes);
app.use('/', indexRoutes);
const productRoutes = require('./routes/user/productRoutes');
app.use('/',productRoutes)
 // mount under "/"
app.use('/admin', adminAuthRoutes);

const cartRoutes = require('./routes/user/cartRoutes');
app.use('/cart', cartRoutes);

app.use('/admin', adminUserRoutes); // '/admin/users' now works
app.use('/admin', adminCategoryRoutes)
app.use('/admin', adminProductRoutes)




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
