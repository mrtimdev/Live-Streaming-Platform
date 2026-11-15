import { useState } from 'react';
import { toLocalDateTime } from './schedule';

export default function StreamForm({
  initialValues = { title: '', description: '', thumbnailUrl: '', streamId: '' },
  isEdit = false,
  submitting = false,
  onSubmit,
}) {
  const [scheduledStartAt, setScheduledStartAt] = useState(toLocalDateTime(initialValues.scheduledStartAt));
  const [title, setTitle] = useState(initialValues.title || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialValues.thumbnailUrl || '');
  const [streamId, setStreamId] = useState(initialValues.streamId || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt).toISOString() : null,
      description: description.trim() || null,
      thumbnailUrl: thumbnailUrl.trim() || null,
    };
    if (!isEdit && streamId.trim()) {
      payload.streamId = streamId.trim();
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-200">
          Stream Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Company All-Hands Broadcast"
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Custom Stream ID <span className="text-xs font-normal text-slate-400">(optional, auto-generated if blank)</span>
          </label>
          <input
            type="text"
            pattern="[a-zA-Z0-9_-]{3,64}"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            placeholder="e.g., event-2026"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            3–64 characters: letters, numbers, dashes, or underscores.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-200">Description</label>
        <textarea
          rows={3}
          maxLength={5000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what viewers will watch on this stream..."
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200">
          Thumbnail URL <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <input
          type="url"
          maxLength={500}
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://example.com/thumbnail.jpg"
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="scheduled-start" className="block text-sm font-medium text-slate-200">Scheduled start date & time (optional)</label>
        <input id="scheduled-start" type="datetime-local" value={scheduledStartAt}
          onChange={(event) => setScheduledStartAt(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white" />
        <p className="mt-1 text-xs text-slate-400">Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Viewers see a countdown in their local time. Start the camera or OBS manually. Clear this field to remove the schedule.</p>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEdit ? 'Update Stream' : 'Create Stream'}
        </button>
      </div>
    </form>
  );
}
