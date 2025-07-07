const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/student_app',{
    useNewUrlParser:true,
    useUnifiedTopology:true
})

const db = mongoose.connection;

db.on('error',console.error.bind(console,'MongoDb not connected'))
db.once('open',()=>{
    console.log("Connected ")
})

module.exports=db;