const jwt = require('jsonwebtoken');
const SECRET = process.env.GISTER_SECRET;

module.exports = function (req,res,next) {
    const token = req.header('x-auth-token');

    try {
        if (token == 'null') return res.status(401).send('Unauthorized access!!');
        const decoded = jwt.verify(token,SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        res.status(400).json({message:'Invalid token!!'})
    }
}