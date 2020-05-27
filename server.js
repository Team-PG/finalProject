'use strict';

// Packages
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
// const pg = require('pg');

// Global vars
const PORT = process.env.PORT;
const app = express();

// Config
// const client = new pg.Client(process.env.DATABASE_URL);
// client.on('error', console.error);
// client.connect();
// Middleware
app.use(express.static('./public'));
app.use(express.urlencoded({extended: true}));


app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  // Remember me info, check if info in local storage on initial page load, SQL query to get their info if in local storage
  // if (req.body.newUser) {
  //   const sqlQuery = `INSERT INTO table (username, password, location) VALUES ($1, $2, $3)`;
  //   const valArr = [req.body.newName, req.body.newPass, `${req.body.locationCity}, ${req.body.locationState}`];
  //   client.query(sqlQuery, valArr)
  //     .then(() => {
  //       res.render('index', {userData : false});
  //     });
  // }
  // if (userName) {
  //   res.render('index');
  // } else {
  //   res.redirect('/login');
  // }
  // quotes API
  getQuote().then((randomQuote) => {
    res.render('pages/index', { randomQuote });
  });
});

app.get('/login', (req, res) => [
  res.render('pages/login')
]);

app.get('/about', (req, res) => {
  res.render('pages/about');
});

app.get('/news', getHeadlineNews);

app.put('/news/:type', getNewsSearch);

function getQuote() {
  const url = 'https://programming-quotes-api.herokuapp.com/quotes/lang/en';
  return superagent.get(url).then((result) => {
    const quotes = result.body.filter((quote) => {
      return quote.en.length < 150;
    });
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex].en;
  })
  .catch((error) => {
    console.error(error);
  });
}

function getHeadlineNews(req, res) {
  const apiUrl = `https://api.nytimes.com/svc/topstories/v2/home.json`;
  const queryParams = {
    'api-key': process.env.NEWS_API_KEY
  };

  superagent.get(apiUrl)
    .query(queryParams)
    .then(result => {
      const newNews = result.body.results.map(obj => new NewsHeadline(obj));
      console.log(result.body.results);
      res.render('pages/news', {'news': newNews});
    })
    .catch(error =>{
      res.send(error).status(500);
      console.log(error);
    });
}

function getNewsSearch(req, res){
  // const searchType = req.body.searchType;
  // const apiUrl = `https://api.nytimes.com/svc/topstories/v2/${searchType}.json`
  // const queryParams = {
  //   'api-key': process.env.NEWS_API_KEY
  // };

  // superagent.get(apiUrl)
  //   .query(queryParams)
  //   .then(result => {
  //     const newNews = result.body.results.map(obj => new NewsHeadline(obj));
  //     res.render('news', {'news/:type': newNews});
  //     console.log(result.body.response.docs);
  //   })
  //   .catch(error =>{
  //   res.send(error).status(500);
  //   console.log(error);
  // });
}

function NewsSearch(obj) {

}

function NewsHeadline(obj){
  this.title = obj.title ? obj.title: 'No Title Found';
  this.byline = obj.byline ? obj.byline: 'No Author Found';
  this.abstract = obj.abstract ? obj.abstract: 'No Description Found';
  this.url = obj.url ? obj.url: 'No URL Found';
}

function NewsSearch(obj){

}

function JobCon(obj){
  this.type = obj.type;
  this.url = obj.url;
  this.company = obj.company;
  this.location = obj.location;
  this.title = obj.title;
  this.description = obj.description.replace(/[(]*<[/]*[\w]*[\s]*\S*>[)]*/g, '').replace(/&amp;/g, '&').replace('##', '<br>').replace('\n', '<br>');
  this.createdOn = obj.created_at;
}

app.get('/jobs',(req,res) => {
  const userLang = req.body.userLang ? `description=${userLang}` : '';
  const userLoc = req.body.userLoc ? req.body.userLoc : 'California';
  const apiUrl = `https://jobs.github.com/positions.json?${userLang}&location=${userLoc}`;

  superagent.get(apiUrl)
    .then(result => {
      const jobArr = result.body.map(val => new JobCon(val));
      console.log(result.body);
      res.render('pages/jobs', {'jobArr' : jobArr});
    });
});

app.get('/weather', (req, res) => {
  const apiUrl = 'https://api.weatherbit.io/v2.0/forecast/daily';
  const queryParams = {
    key : process.env.WEATHER_API_KEY,
    city : 'Phoenix, Az',
    days : 7,
  };
  superagent.get(apiUrl)
    .query(queryParams)
    .then(result => {
      const newWeather = result.body.data.map(obj => new Weather(obj));
      console.log(newWeather);
      res.render('pages/weather', {weather : newWeather});
    });
});

// app.post('/user', (req, res) => {
//   if(req.body.userType === 'returningUser'){
//     const sqlQuery = `SELECT password FROM users WHERE username = $1`;
//     const sqlVals = [req.body.returningName];
//     client.query(sqlQuery, sqlVals)
//       .then(result => {
//         if (req.body.returningPass === result.rows[0]){
//           res.redirect('/');
//         } else {
//           res.redirect('/login');
//         }
//       });
//   }
//   console.log(req.body);
// });

function Weather(obj){
  this.forecast = obj.weather.description;
  this.time = new Date(obj.ts * 1000).toDateString();
  this.high = Math.round(obj.high_temp * (9/5) + 32);
  this.low = Math.round(obj.low_temp * (9/5) + 32);
  this.avg = Math.round(obj.temp * (9/5) + 32);
  this.sunrise = new Date(obj.sunrise_ts* 1000).toString().split(' ')[4].slice(0,5);
  this.sunset = new Date(obj.sunset_ts* 1000).toString().split(' ')[4].slice(0,5);


}


app.listen(PORT, () => console.log('Listening on ', PORT));
