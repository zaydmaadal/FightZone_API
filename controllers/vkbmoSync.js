const axios = require('axios');
const Event = require('../models/Event');

function combineDateTime(dateStr, hour, minutes) {
  if (!dateStr) return null;
  const pad = n => n.toString().padStart(2, '0');
  // Default to 0 if hour/minutes are undefined
  return `${dateStr}T${pad(hour || 0)}:${pad(minutes || 0)}:00+02:00`;
}

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

    for (const vkbmoEvent of vkbmoEvents) {
      // Combine start and end datetime
      let start, end;
      if (vkbmoEvent.allday) {
        start = vkbmoEvent.startDate;
        end = vkbmoEvent.endDate;
      } else {
        start = combineDateTime(
          vkbmoEvent.startDate,
          vkbmoEvent.startHour,
          vkbmoEvent.startMinutes
        );
        end = combineDateTime(
          vkbmoEvent.endDate,
          vkbmoEvent.endHour,
          vkbmoEvent.endMinutes
        );
      }

      // Check if event already exists
      const existingEvent = await Event.findOne({ 
        title: vkbmoEvent.title,
        start: new Date(start)
      });

      if (!existingEvent) {
        const newEvent = new Event({
          title: vkbmoEvent.title,
          description: vkbmoEvent.description || '',
          start: new Date(start),
          end: new Date(end),
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