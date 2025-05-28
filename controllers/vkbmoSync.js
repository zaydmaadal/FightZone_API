const axios = require('axios');
const Event = require('../models/Event');

// Sync events from VKBMO API
exports.syncEvents = async (req, res) => {
  try {
    // Fetch events from VKBMO API
    const response = await axios.get('https://inffuse.eventscalendar.co/js/v0.1/calendar/data', {
      params: {
        'inffuse-platform': 'weebly',
        'inffuse-user': '134849841',
        'inffuse-site': '270538925224280173',
        'inffuse-project': '9ec8a24a-f8de-4208-a693-04800cd55286'
      }
    });

    const vkbmoEvents = response.data.project.data.events;
    const syncedEvents = [];

    // Process each event
    for (const vkbmoEvent of vkbmoEvents) {
      // Check if event already exists
      const existingEvent = await Event.findOne({ 
        title: vkbmoEvent.title,
        start: new Date(vkbmoEvent.start)
      });

      if (!existingEvent) {
        // Create new event
        const newEvent = new Event({
          title: vkbmoEvent.title,
          description: vkbmoEvent.description || '',
          start: new Date(vkbmoEvent.start),
          end: new Date(vkbmoEvent.end),
          location: vkbmoEvent.location || 'Locatie niet gespecificeerd',
          createdBy: 'vkbmo-sync',
          type: 'vkbmo',
          visibility: 'public'
        });

        await newEvent.save();
        syncedEvents.push(newEvent);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedEvents.length} new events`,
      syncedEvents
    });

  } catch (error) {
    console.error('Error syncing events:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing events',
      error: error.message
    });
  }
}; 