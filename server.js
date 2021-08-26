require('dotenv').config();
const express = require('express'),
      cors = require('cors'),
      app = express(),
      bodyParser = require('body-parser'),
      mongoose = require('mongoose'),
      {Schema, model} = mongoose;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

//statics
app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended:false}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//user Schema
const userSchema = new Schema({
  username: String,
  log: [{
    description:String, 
    duration:Number, 
    date:String
  }],
  count: Number,
});

//user model
const Users = model('UserModel', userSchema);

//get all users
app.get('/api/users', (req, res)=>{
  Users.find().select('username _id').
  exec((err, data)=>err?res.send(err):res.send(data));
});

//createUser 
app.post('/api/users', (req, res, next)=>{
  Users.create({username: req.body.username}, (err)=>{
    if(err) res.send(err);
    Users.findOne({username: req.body.username}).
    select('username _id').
    exec((err, data)=>err?res.send(err):res.send(data))
  });
});

//add exercise
app.post('/api/users/:_id/exercises', (req, res)=>{
  if(!req.body.description){res.send('requires descrption')
  }else 
  if(!req.body.duration){res.send('requires duration')
  }else
  Users.findById(req.params._id, (err, data)=>{
    let curdate = new Date();
    if(err)res.send(err);
    data.log.push({
      description:req.body.description,
      duration:req.body.duration,
      date: req.body.date?new Date(req.body.date).toDateString():curdate.toDateString()
    });
    data.save((err, nuData)=>{
      const {description, duration, date} = nuData.log[nuData.log.length-1];
      const obj = {
        _id: nuData._id,
        username: nuData.username,
        description: description,
        duration: duration,
        date: date       
      };
      if(err)res.send(err);
      res.send(obj)
    });
  });
});

//log exercises
app.get('/api/users/:_id/logs', (req, res)=>{
  Users.findById(req.params._id).
  select('-__v').
  exec((err, nuData)=>{
    if(nuData.log.length==0)res.send('no log yet');
    let {username, log, _id} = nuData;
    let q = req.query;
    if(q.from&&q.to){
      log = log.filter(x => Date.parse(x.date) >= Date.parse(q.from)&&Date.parse(x.date) <= Date.parse(q.to)?true:false)
    }; //filter result by query from, to (date)
    if(q.limit)log = log.splice(q.limit); //limit result by query (int)
    const obj = {username: username, _id:_id, count:log.length, log:log};
    if(err)res.send(err);
    res.send(obj);
  });
});

//remove all user
app.get('/remove-all', (req,res)=>{
  Users.deleteMany((err, data)=>err?res.send(err):res.send("users removed"));
});

const connection = mongoose.connection;
connection.once('open', () => {
    console.log("DB connected.");
});
const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
