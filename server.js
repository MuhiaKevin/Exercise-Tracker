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



// DATABASE 

const mongo_uri = process.env.MONGO_LOCAL_URI
mongoose.connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true, useMongoClient: true })
const db = mongoose.connection;

db.once('open', _ => {
  console.log('Database connected', mongo_uri)
})

db.on('error', err => {
  console.error('connection error: ', err)
})

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  user_name: String,
  exercises : [{
    desc : String,
    duration : Number,
    date : {}
  }]
})

const ExerciseTracker = mongoose.model('exercisetracker', exerciseSchema);


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
          res.json({username : data['user_name'], userid : data['user_id']});
        })
      }
      else {
        // TODO: needs to be changed
        res.status(400).json({error : "User already exists"})
      }

    })
  } catch (error) {
    next(error)
  }
})



// Not found middleware
// app.use((req, res, next) => {
//   return next({ status: 404, message: 'not found' })
// })

// Error Handling middleware
// app.use((err, req, res, next) => {
//   let errCode, errMessage

//   if (err.errors) {
//     // mongoose validation error
//     errCode = 400 // bad request
//     const keys = Object.keys(err.errors)
//     // report the first validation error
//     errMessage = err.errors[keys[0]].message
//   } else {
//     // generic or custom error
//     errCode = err.status || 500
//     errMessage = err.message || 'Internal Server Error'
//   }
//   res.status(errCode).type('txt')
//     .send(errMessage)
// })


app.use((err, req, res, next) => {
  handleError(err, res);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
