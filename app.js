//required modules
require('dotenv').config();
const express = require('express');
const app = express();
const server = http.createServer(app);
const http = require('http');

const cors = require('cors');
const mongoose = require('mongoose');
const socketio = require('socket.io');
const PORT = process.env.PORT || 5000
const router = require('./router');
const User = require('./models/user');

//cors set up
var whitelist = ['https://gister.netlify.app']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(router);
const io = socketio(server);

//database connection string and error handling
const db = process.env.DB_CONN;
let DB = mongoose.connect(db, {useNewUrlParser:true,useUnifiedTopology:true});
    DB.then(()=>console.log(`Database connection @ ${db}`))
      .catch((error)=>console.log(error));

io.on('connect', (socket)=>{
    socket.on('join',async ({id,payload},callback)=>{
        socket.roomid = id;
        try {
            const result = await User.join(id,socket.id,payload);
            socket.join(result.room.name);
            socket.emit('joinSuccess',{ 
                user: 'admin',
                text: `${result.name}, welcome to room ${result.room.name}.`,
                room:result.room,
                name:result.name,
                password:result.password,
                init:payload.init
            });
            socket.broadcast.to(result.room.name).emit('joinSuccess', { user: 'admin', text: `${result.name} has joined!`,room:result.room,init:payload.init });

            callback();

        } catch (error) {
            callback(error);
        }
    });

    socket.on('sendMessage', async ({id,name,message},callback)=>{
        const room = await User.getRoom(id);
        io.to(room.name).emit('message',{ user:name, text: message });
        await User.saveMessage(id,{name,message})
        callback();
    });

    socket.on('setLogout', async({id},callback)=>{
        const result = await User.setLogout(id,socket.id);
        callback(result.logout);
    });

    socket.on('disconnect',async ()=>{
        const {room,name,logout} = await User.removeUser(socket.roomid,socket.id);
        io.to(room.name).emit('logout',{user:'admin',text:`${name} has left`,room,logout});
    });

});

server.listen(PORT, ()=>console.log(`Server running on PORT ${PORT}`));