const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mongodb = require('mongodb');
const shortid = require('shortid');
require('dotenv').config()
const cors = require('cors')
const mongoose = require('mongoose')
const { handleError, ErrorHandler } = require('./helpers/error')

// TODO:
// improve error handling
// https://medium.com/@stefanledin/how-to-solve-the-unknown-modifier-pushall-error-in-mongoose-d631489f85c0


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
mongoose.connect(process.env.MONGO_LOCAL_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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
    description: String,
    duration: Number,
    date: Date
  }]
}, {
  usePushEach: true
})

const ExerciseTracker = mongoose.model('exercisetracker', exerciseSchema);


// get all users
app.get('/api/exercise/users', (req, res) => {
  let users = []
  ExerciseTracker.find({}, (error, data) => {
    data.forEach((user) => {
      users.push({ username: user['_doc']['user_name'], _id: user['_doc']['_id'] })
    })
    res.json(users)
  })

})


// get user exercise logs

app.get('/api/exercise/log/', (req, res) => {
  // console.log(req.params)
  let { userId, from, to, limit } = req.query

  const result = {
    _id: "",
    username: "",
    count: "",
    log: []
  }


  ExerciseTracker.findById(userId, (error, data) => {
    if (data != null) {
      result._id = data['_id']
      result.username = data['user_name']
      result.count = data['exercises'].length

      data['exercises'].forEach((exercise) => {
        result.log.push({ description: exercise['description'], duration: exercise['duration'], date: exercise['date'] })
      })

      res.json(result)
    }
    else {
      res.status(404).json({ error: "User does not exist", statusCode: 404 })
    }

  })
})


// add an  exercise
app.post('/api/exercise/add', (req, res) => {
  let { userId, description, duration, date } = req.body;

  if (userId === undefined || description === undefined || duration === undefined) {
    throw new ErrorHandler(400, 'Request is missing something');
  }

  ExerciseTracker.findById(userId, (error, data) => {
    if (data != null) {
      let newExercise = { description: description, duration: duration }

      if (date === undefined) {
        let currentDate = new Date(Date.now())
        newExercise.date = currentDate.toDateString()

        data.exercises.push(newExercise)

        data.save((error, updatedData) => {
          if (error) console.error(error)

          newExercise.username = data['user_name'];
          newExercise.userId = data['_id'];

          res.json(newExercise)
        })

      }

      else if (Date.parse(date) === NaN) {
        res.status(400).json({ error: 'Bad request', statusCode: 400 })
      }
      else if (typeof (Date.parse(date)) === 'number') {
        let goodDate = new Date(date)
        newExercise.date = goodDate.toDateString()

        data.exercises.push(newExercise)

        data.save((error, updatedData) => {
          if (error) console.error(error)

          newExercise.username = data['user_name'];
          newExercise.userId = data['_id'];

          res.json(newExercise)
        })
      }
    }
    else {
      res.status(404).json({ error: 'User is not in the database', statusCode: 404 })
    }
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
