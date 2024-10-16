const express = require('express');
const router = express.Router();
module.exports = router;

const importTable = require("../index"); //include the parameter of index.js

//router path is showAllPage
router.get('/*', function (req, res) {
    console.log("path = ",__dirname); //process.cwd()
    res.sendFile(__dirname+'/views/view.html');
});





