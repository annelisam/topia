'use client';

import EventComposer from '../_components/EventComposer';

export default function CreateEventPage() {
  return (
    <EventComposer
      mode="create"
      initial={{
        eventName: '', dateIso: '', startTime: '', endTime: '', timezone: '',
        city: '', venue: '', link: '', description: '', imageUrl: '', worldId: '', published: false,
      }}
    />
  );
}
