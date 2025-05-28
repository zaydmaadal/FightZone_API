const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/db');

// GET alle events
router.get('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const events = await db.collection('events').find({}).toArray();
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Error fetching events' });
  }
});

// POST nieuw event
router.post('/', async (req, res) => {
  try {
    const { title, description, start, end, location, type } = req.body;
    if (!title || !description || !start || !end || !location || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newEvent = {
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      location,
      type,
      createdAt: new Date()
    };
    const { db } = await connectToDatabase();
    const result = await db.collection('events').insertOne(newEvent);
    return res.status(201).json({
      _id: result.insertedId,
      ...newEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Error creating event' });
  }
});

module.exports = router; 