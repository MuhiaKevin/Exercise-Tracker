const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongodb = require('mongodb');
const shortid = require('shortid');
require('dotenv').config()
const cors = require('cors')
const mongoose = require('mongoose')
const { handleError, ErrorHandler } = require('./helpers/error')

// middlewares

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



// Database Config 

const mongo_uri = process.env.MONGO_LOCAL_URI
mongoose.connect(mongo_uri, {useMongoClient: true })
const db = mongoose.connection;

db.once('open', _ => {
  console.log('Database connected', mongo_uri)
})

db.on('error', err => {
  console.error('connection error: ', err)
})


// Database  Schema 
const Schema = mongoose.Schema;
const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  user_name: String,
  exercises: [{
    desc: String,
    duration: Number,
    date: {}
  }]
})

const ExerciseTracker = mongoose.model('exercisetracker', exerciseSchema);


// get all users
app.get('/api/exercise/users', (req, res) => {
  let users = []
  ExerciseTracker.find({}, (error, data) => {
    data.forEach((user) =>{
      users.push({username : user['_doc']['user_name'], _id : user['_doc']['_id']})
    })
    res.json(users)
  })

})



// add a new user
app.post('/api/exercise/new-user', (req, res, next) => {
  try {
    let username = req.body.username;

    if (!username) {
      throw new ErrorHandler(400, 'Missing required  username field')
    }

    ExerciseTracker.findOne({ user_name: username }, function (err, findData) {
      // if user does not exist
      if (findData === null) {
        const userid = shortid.generate();
        const user = { user_id: userid, user_name: username }
        const exerciseTracker = new ExerciseTracker(user);

        exerciseTracker.save((error, data) => {
          console.log('Person Added sucessfully')
          res.json({ username: data['user_name'], _id: data['_id'] });
        })
      }
      else {
        // TODO: needs to be changed
        res.status(400).json({ error: "User already exists" })
      }

    })
  } catch (error) {
    next(error)
  }
})


app.use((err, req, res, next) => {
  handleError(err, res);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
