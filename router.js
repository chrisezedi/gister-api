const express = require('express');
const router = express.Router();
const User = require('./models/user');
const Auth = require('./middlewares/auth');
const { google } = require('googleapis');
const oauth2 = google.oauth2('v2');

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CLIENT_REDIRECT_URI
)

router.get('/', (req,res)=>{
    res.send('Server up and running');
});

//get user
router.get('/user',Auth,async (req,res)=>{
    try {
        const user = await User.getUser(req.user._id);
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({error});
    }
});

//google auth
router.post('/google-auth', async(req,res)=>{
    try {
        function getConnectionUrl() {
            return oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                scope: ['profile','email']
            });
        }
        const url = getConnectionUrl();
        res.status(200).json({url});
    } catch (error) {
        res.status(500).json({error});
    }
});

//google redirect
router.post('/get-token', async(req,res)=>{
    try {
            const {tokens} = await oAuth2Client.getToken(req.body.code)
            await oAuth2Client.setCredentials(tokens);
            const response = await oauth2.userinfo.get({auth: oAuth2Client});

            const payload = {
                id:response.data.id,
                name:response.data.given_name,
                picture:response.data.picture
            }

            const {user,token} = await User.registerUser(payload);
            res.status(200).json({user,token}); 
    } catch (error) {
        res.status(200).json({error}); 
    }
})

//signup
router.put('/user', async (req,res)=>{
    try {
        const {user,token} = await User.registerUser(req.body);
        res.status(200).json({user,token});  
    } catch (error) {
        res.status(500).json({error});  
    }
});

//create room
router.post('/room',Auth, async (req,res)=>{
    try { 
        const user = await User.createRoom(req.user._id,req.body);
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({error}); 
    }
});


//update room
router.put('/room/:id', Auth,async (req,res)=>{
    try {
        const user = await User.updateRoom(req.params.id,req.user._id,req.body);
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({error}); 
    }
});

//delete room
router.delete('/room/:id', Auth, async (req,res)=>{
    try {
        const user = await User.deleteRoom(req.user._id,req.params.id);
        res.status(200).json({user});
    } catch (error) {
        res.status(500).json({error}); 
    }
});

//get room
router.get('/room/:id', async (req,res)=>{
    try {
        const room = await User.getRoom(req.params.id);
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json(error);
    }
});
module.exports = router;