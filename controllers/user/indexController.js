const loadHome = async (req, res) => {
  try {
    res.render('user/home', { title: 'Home' ,layout :'user/indexlayout'});
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  loadHome,
  // ... export other methods too
};
