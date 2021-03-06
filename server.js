'use strict';

// Packages
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');

// Global vars
const PORT = process.env.PORT;
const app = express();
const methodOverride = require('method-override');
const getJobs = require('./modules/jobModule.js');
const locJobs = getJobs.standard;
const searchJobs = getJobs.search;
const getWeather = require('./modules/weatherModule.js');
const localWeather = getWeather.localWeather;
const searchWeather = getWeather.searchWeather;
const getNews = require('./modules/newsModules.js');
const getHeadlineNews = getNews.newsHeadline;
const getNewsSearch = getNews.newsSearch;
const stocksModule = require('./modules/stocksModule.js');
const displaySearchStocks = stocksModule.displaySearchStocks;
const sqlSaveStocks = stocksModule.sqlSaveStocks;
const displaySingleStock = stocksModule.displaySingleStock;
const displayTrackedStocks = stocksModule.displayTrackedStocks;

// Config
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', console.error);
client.connect();
// Middleware
app.use(express.static('./public'));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_overrideMethod'));

// Routes
app.set('view engine', 'ejs');

app.get('/home', renderHome);

app.get('/', (req, res) => res.render('pages/login'));

app.get('/tasks', getTasksFromDB);

app.post('/tasks', addTasksToDB);

app.delete('/tasks/:id', deleteTasksFromDB);

app.get('/about', (req, res) => res.render('pages/about'));

app.get('/news', getNewsSearch);

app.post('/news/show', getHeadlineNews);

app.get('/jobs', locJobs);

app.post('/jobs/search', searchJobs);

app.get('/weather', localWeather);

app.post('/weather/search', searchWeather);

app.post('/user', handleLogin);

app.get('/updateInfo', (req, res) => res.render('pages/updateInfo.ejs'));

app.put('/accountUpdate', updateAccount);

app.delete('/accountDelete', deleteAccount);

app.get('/stocks', displaySearchStocks);

app.post('/saveStock', sqlSaveStocks);

app.post('/stocksShow', displaySingleStock);

app.get('/trackedStocks', displayTrackedStocks);

function getTasksFromDB(req, res) {
  getUser(app.get('username')).then((user) => {
    const sqlQuery = 'SELECT * FROM tasks WHERE userid = $1';
    const sqlVals = [user.id];
    client.query(sqlQuery, sqlVals).then((data) => {
      res.json(data.rows);
    }).catch((error) => {
      console.error(error);
    });
  }).catch(error => console.error(error));
}

function addTasksToDB(req,res) {
  getUser(app.get('username')).then((user) => {
    const sqlQuery = 'INSERT INTO tasks (name, userid) VALUES ($1, $2) RETURNING *';
    const sqlVals = [req.body.name, user.id];
    client.query(sqlQuery, sqlVals).then((data) => {
      res.json(data.rows[0]);
    }).catch((error) => {
      console.error(error);
    });
  }).catch(error => console.error(error));
}

function deleteTasksFromDB(req, res) {
  getUser(app.get('username')).then((user) => {
    const sqlQuery = 'DELETE FROM tasks WHERE id = $1 AND userid = $2';
    const sqlVals = [req.params.id, user.id];
    client.query(sqlQuery, sqlVals).then(() => {
      res.json({});
    }).catch((error) => {
      console.error(error);
    });
  }).catch(error => console.error(error));
}

function getQuote() {
  const url = 'https://programming-quotes-api.herokuapp.com/quotes/lang/en';

  return superagent.get(url)
    .then((result) => {
      const quotes = result.body.filter((quote) => {
        return quote.en.length < 150;
      });
      const randomIndex = Math.floor(Math.random() * quotes.length);
      return `${quotes[randomIndex].en} - ${quotes[randomIndex].author}`;
    })
    .catch((error) => {
      console.error(error);
    });
}

function renderHome (req, res) {
  if (!app.get('username')) res.redirect('/');
  else getQuote().then((randomQuote) => {
    res.render('pages/index', { randomQuote , 'username' : app.get('username')});
  });
}

function updateAccount (req, res) {
  const username = req.body.updateUsername || app.get('username');
  const password = req.body.updatePassword || app.get('password');
  app.set('username', username);
  const sqlUpdate = `UPDATE users
  SET username = $1, password = $2
  WHERE id=$3`;
  const updateValues = [username, password, app.get('userId')];
  client.query(sqlUpdate, updateValues)
    .then(res.redirect('/home'))
    .catch(error => console.error(error));
}

function deleteAccount (req, res) {
  const sqlDelete = `DELETE FROM users WHERE id=$1`;
  const sqlVal = [app.get('userId')];
  client.query(sqlDelete, sqlVal)
    .then(() => res.redirect('/'))
    .catch(err => console.error(err));
}

function handleLogin(req, res) {
  req.body.userType === 'returningUser' ? returningUser(req,res) : newUser(req,res);
}

function getUser(userName) {
  const getUser = `SELECT * FROM users WHERE username=$1 LIMIT 1`;
  return client.query(getUser, [userName])
    .then((data) => {
      return data.rows[0];
    })
    .catch((error) => {
      console.error(error);
    });
}

function returningUser(req,res) {
  const sqlQuery = `SELECT password FROM users WHERE username = $1`;
  const sqlVals = [req.body.returningName];
  client.query(sqlQuery, sqlVals)
    .then(result => returningUserCheck(result, req, res))
    .catch(error => console.error(error));
}

function returningUserCheck(result,req,res) {
  if(!result.rows[0]) res.redirect('/');
  else if (req.body.returningPass === result.rows[0].password){
    const username = req.body.returningName;
    app.set('username', username);
    const getUserId = `SELECT id FROM users WHERE username=$1`;
    const idVals = [username];
    client.query(getUserId, idVals)
      .then(result => {
        const currId = result.rows[0].id;
        app.set('userId', currId);
        const getUserLoc = `SELECT location FROM locations WHERE userid=$1`;
        const locVals = [currId];
        client.query(getUserLoc, locVals).then(loc => app.set('location', loc.rows[0].location));
      })
      .catch(error => console.error(error));
    res.redirect('/home');
  } else {
    res.redirect('/');
  }
}

function newUser(req,res) {
  const sqlQuery =  `INSERT INTO users (username, password) VALUES ($1, $2)`;
  const sqlVals = [req.body.newName, req.body.newPass];
  app.set('username', req.body.newName);
  app.set('location', req.body.location);
  client.query(sqlQuery, sqlVals)
    .then(() => userTableInsert(req,res))
    .catch(error => console.error(error));
}

function userTableInsert (req, res) {
  const getUserId = `SELECT id FROM users WHERE username=$1`;
  const userName = [req.body.newName];
  client.query(getUserId, userName)
    .then(result => {
      const locQuery = `INSERT INTO locations (location, userid) VALUES ($1, $2)`;
      const userId = result.rows[0].id;
      const locVals = [req.body.location, userId];
      app.set('userId', userId);
      client.query(locQuery, locVals);
    }).then(res.redirect('/home'))
    .catch(error => console.error(error));
}

app.listen(PORT, () => console.log('Listening on ', PORT));


