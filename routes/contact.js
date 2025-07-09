const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

router.post('/contact', async (req,res)=>{
    try{
        const{name,email,subject,message}=req.body

        if(!name || !email || !message){
             return res.status(400).json({ success: false, message: 'Required fields are missing' });
        }
        const newContact = new Contact({name,email,subject,message})
        await newContact.save()
        res.status(201).json({ success: true, message: 'Message stored successfully' });
    }catch(err){
        console.error('Contact Save Error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });

    }

})
module.exports = router;