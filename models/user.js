const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;

const memberSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String
    },
    id:{
        type:String,
        required:true
    },
    logout:{
        type:Boolean,
        default:false
    }
});

const messagesSchema = new Schema({
    user:{
        type:String,
        required:true
    },
    message:{
        type:String,
        required:true
    }
});

const roomSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
        min:6
    },
    members:[memberSchema],
    messages:[messagesSchema]
});

const userSchema = new Schema({
    id:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    picture:{
        type:String,
        required:true
    },
    rooms:[roomSchema]
})

const User = mongoose.model('User',userSchema);
module.exports = User;
const SECRET = process.env.GISTER_SECRET;

module.exports.registerUser = async function(payload){
    let user = await this.findOne({id:payload.id});
    if (user) {
        user.set({
            id:payload.id,
            name:payload.name,
            picture:payload.picture
        });
    } else {
        user =  new User(payload);
    }
    const token = jwt.sign({...user._doc},SECRET);
    await user.save();
    return {user,token};
}

module.exports.getUser = async function(id){
    const user = await this.findById(id);
    return user;
}

module.exports.getRoom = async function(id){
    //find room admin by room id
    const user = await this.findOne({'rooms._id':id});
    
    //get specific room
    let room = user.rooms.find((data)=>{
        return data._id == id;
    });

    return room;
}

module.exports.saveMessage = async function(id,{name,message}){
    //find room admin by room id
    const user = await this.findOne({'rooms._id':id});
    
    //get specific room
    let room = user.rooms.find((data)=>{
        return data._id == id;
    });

    room.messages.push({user:name,message});

    await user.save();

    return user;
}

module.exports.createRoom = async function(id,payload){
    const salt = await bcrypt.genSalt(10);
    payload.password = await bcrypt.hash(payload.password,salt);

    const user = await this.findById(id);
    user.rooms.push(payload);
    return await user.save();
}

module.exports.updateRoom = async function(id,uid,payload){
    const user = await this.findById(uid);
    let room = user.rooms.find((room)=>room._id == id);
    
    if (payload.password == '') {
        payload.password = room.password;
    }
    else {
        const salt = await bcrypt.genSalt(10);
        payload.password = await bcrypt.hash(payload.password,salt);
    }
    
    let roomIndex = user.rooms.indexOf(room)
    
    payload._id = room._id;

    user.rooms.splice(roomIndex,1,payload);
  
    return await user.save();
}

module.exports.deleteRoom = async function(id,roomid){
    const user = await this.findById(id);
    let room = user.rooms.find((room)=>room._id == roomid);
    let roomIndex = user.rooms.indexOf(room)
    user.rooms.splice(roomIndex,1)
    return await user.save();
}

module.exports.setLogout = async function(id,sid){
    const user = await this.findOne({'rooms._id':id});

    //get specific room
    let room = user.rooms.find((data)=>{
        return data._id == id;
    });
  
    //find the member
    let member = room.members.find((member)=>{
        return member.id == sid;
    });
    member.logout = true;

    //check users still logged in
    let membersRemaining = room.members.find((member)=>member.logout === false);

    if (!membersRemaining) {
        room.messages = [];
    }
    await user.save();
    return member;
}

module.exports.join = function(id,uid,payload){
    return new Promise(async (resolve, reject) => {  
        //find room admin by room id
        const user = await this.findOne({'rooms._id':id});
    
        if (!user) {
            reject('This Room does not exist');
            return;
        };
        
        //get specific room
        let room = user.rooms.find((data)=>{
            return data._id == id;
        });
        
        //check if room password match with supplied password
        const isMatch = await bcrypt.compare(payload.password,room.password);
        if (isMatch) {
            //check if user is already in this room
            if (!room.members.some(member=>member.name == payload.name)) {
                let userDetails = {
                    name:payload.name,
                    id:uid
                }
                room.members.push(userDetails);
                await user.save();
                
                return resolve({
                    room,
                    name:userDetails.name,
                    password:payload.password
                });
            }else{return reject('Someone with this username is already in the room') }
        }else{
             return reject('Password Incorrect') 
        }
    })
    
}

module.exports.removeUser = async function(roomid,userid){
    //find room admin by room id
    const user = await this.findOne({'rooms._id':roomid});
    
    if (user) {
        //get specific room
        let room = user.rooms.find((data)=>{
            return data._id == roomid;
        });

        const index = room.members.findIndex(member=>member.id == userid);
        const member = room.members[index];
        room.members.splice(index,1);

        await user.save();
        return {room,name:member.name,logout:member.logout};
    }
    return {room:'',name:'',logout:''}
}