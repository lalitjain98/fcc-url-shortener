'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true})
.then(res=>{console.log("Connected to DB!")})
.catch(err=>console.log(err));

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded());
app.use('/public', express.static(process.cwd() + '/public'));
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

const urlSchema = mongoose.Schema({
  url: String,
  shortUrl: {
    type: Number,
    default: 1
  }
})

const Url = mongoose.model('Url', urlSchema);
const dns = require('dns');

app.post('/api/shorturl/new', (req, res, next)=>{
  // console.log(req.body);
  
  if(!req.body.url.match(/(http(s)?:\/\/.)(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)){
    return res.json({error: "invalid URL"});
  }
  
  let cleanUrl = req.body.url;
  cleanUrl = cleanUrl.replace('https://', '');
  cleanUrl = cleanUrl.replace('http://', '');
  
  dns.lookup(cleanUrl, (err, address)=>{
    console.log(err, address);
    if(err) return res.json({error: "invalid URL"});
    next();
  });
}, (req, res)=>{
  Url.aggregate([
    {$group: {_id: null, max: {$max: '$shortUrl'}}},
    {$project: {max: 1}}
  ])
  .then((data)=>{
      console.log("Max short Url", data);
      data = data[0];
      let nextShortUrl = isNaN(Number(data.max)) ? 1 : Number(data.max)+1;
      let shortUrl = new Url({url: req.body.url, shortUrl: nextShortUrl});
      shortUrl.save()
      .then(data=>res.json({original_url: shortUrl.url, short_url: shortUrl.shortUrl}))
      .catch(err=>res.json({error: err}));
  })
  .catch(err=>res.json({error: err}));
})

app.route('/api/shorturl/:shortUrl')
.get((req, res)=>{
  if(!Number(req.params.shortUrl)) return res.json({error: "Invalid Request"});
  Url.findOne({shortUrl: req.params.shortUrl})
  .then(data=>{
    let url = data.url;
    console.log("redirecting to", url);
    res.status(302).redirect(url);
  })
  .catch(err=>{
    res.json({error: err});
  });
});

app.delete('/api/shorturl', (req, res, next)=>{
  Url.remove({}, (err)=>{
    return res.json({error: err})
  });
  res.json({message: "success"});
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});