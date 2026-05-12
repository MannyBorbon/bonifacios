import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      if (isAuthEndpoint && !url.includes('login.php')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login.php', credentials),
  logout: () => api.post('/auth/logout.php'),
  getMe: () => api.get('/auth/me.php')
};

export const applicationsAPI = {
  submit: (data) => api.post('/applications/submit.php', data),
  list: (params) => api.get('/applications/list.php', { params }),
  get: (id) => api.get(`/applications/${id}.php`),
  updateStatus: async (id, status, notes = '') => {
    const response = await api.post('/applications/update-status.php', {
      id: parseInt(id),
      status: status,
      notes: notes || ''
    });
    return response.data;
  },
  downloadPDF: (id) => api.get(`/applications/${id}/pdf.php`, { responseType: 'blob' }),
  getStats: () => api.get('/applications/stats.php')
};

export const messagesAPI = {
  getInbox: () => api.get('/messages/inbox.php'),
  getSent: () => api.get('/messages/sent.php'),
  get: (id) => api.get(`/messages/${id}.php`),
  send: (data) => api.post('/messages/send.php', data),
  delete: (id) => api.delete(`/messages/${id}.php`),
  getUnreadCount: () => api.get('/messages/unread-count.php'),
  getUsers: () => api.get('/messages/users.php')
};

export const analyticsAPI = {
  getDashboard: (days = 7) => api.get('/analytics/dashboard.php', { params: { days } }),
  track: (data) => api.post('/analytics/track.php', data)
};

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations.php'),
  getMessages: (conversationId, before = null) => api.get('/chat/messages.php', { params: { conversation_id: conversationId, ...(before ? { before } : {}) } }),
  send: (data) => api.post('/chat/send.php', data),
  upload: (formData) => api.post('/chat/upload.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getUsers: () => api.get('/messages/users.php'),
  getUsersOnline: () => api.get('/chat/users-online.php'),
};

export const siteAnalyticsAPI = {
  getStats: (days = 30) => api.get('/analytics/site-stats.php', { params: { days } }),
  getVisitors: (params = {}) => api.get('/analytics/site-visitors.php', { params }),
};

export const userStatusAPI = {
  getOnsiteStatus: () => api.get('/users/onsite-status.php'),
  setOnsiteStatus: (onsite) => api.post('/users/onsite-status.php', { onsite }),
};

export const trackingAPI = {
  getAnalyticsSummary: () => api.get('/tracking/analytics-summary.php'),
  getUsersSummary: () => api.get('/tracking/users-summary.php'),
  getUserDetail: (userId, date = null) => api.get('/tracking/user-detail.php', { params: { user_id: userId, ...(date ? { date } : {}) } }),
  getChartData: (days = 30) => api.get('/tracking/chart-data.php', { params: { days } }),
  getSessionClicks: (sessionId) => api.get('/tracking/session-clicks.php', { params: { session_id: sessionId } }),
  getSessionPages: (sessionId) => api.get('/tracking/session-pages.php', { params: { session_id: sessionId } })
};

export const quotesAPI = {
  getQuotes: () => api.get('/quotes/list.php'),
  getQuote: (id) => api.get(`/quotes/get.php?id=${id}`),
  createQuote: (data) => api.post('/quotes/create.php', data),
  updateQuote: (id, data) => api.post(`/quotes/update.php?id=${id}`, data),
  deleteQuote: (id) => api.post(`/quotes/delete.php?id=${id}`),
  getNotes: (quoteId) => api.get(`/quotes/notes.php?quote_id=${quoteId}`),
  addNote: (data) => api.post('/quotes/notes.php', data),
  deleteNote: (id) => api.delete(`/quotes/notes.php?id=${id}`),
  getRequirements: (quoteId) => api.get(`/quotes/requirements.php?quote_id=${quoteId}`),
  saveRequirement: (data) => api.post('/quotes/requirements.php', data),
  getBEO: (quoteId) => api.get(`/quotes/beo.php?quote_id=${quoteId}`),
  saveBEO: (data) => api.post('/quotes/beo.php', data),
  getCotizaciones: (quoteId) => api.get(`/quotes/cotizaciones.php?quote_id=${quoteId}`),
  saveCotizacion: (data) => api.post('/quotes/cotizaciones.php', { action: 'save', ...data }),
  markCotizacionFinal: (data) => api.post('/quotes/cotizaciones.php', { action: 'mark_final', ...data }),
  sendCotizacion: (data) => api.post('/quotes/cotizaciones.php', { action: 'send_email', ...data }),
  deleteCotizacion: (id) => api.post('/quotes/cotizaciones.php', { action: 'delete', id }),
};

export const meetingsAPI = {
  getMeetings: () => api.get('/meetings/meetings.php?action=list'),
  getRoom: (id) => api.get(`/meetings/meetings.php?action=room&id=${id}`),
  getMessages: (meetingId) => api.get(`/meetings/meetings.php?action=messages&meeting_id=${meetingId}`),
  createMeeting: (data) => api.post('/meetings/meetings.php', { action: 'create', ...data }),
  startMeeting: (id) => api.post('/meetings/meetings.php', { action: 'start', id }),
  endMeeting: (id) => api.post('/meetings/meetings.php', { action: 'end', id }),
  joinMeeting: (id) => api.post('/meetings/meetings.php', { action: 'join', id }),
  leaveMeeting: (id) => api.post('/meetings/meetings.php', { action: 'leave', id }),
  deleteMeeting: (id) => api.post('/meetings/meetings.php', { action: 'delete', id }),
  sendMessage: (meeting_id, content) => api.post('/meetings/meetings.php', { action: 'send_message', meeting_id, content }),
  setParticipantRole: (meeting_id, user_id, participant_role) => api.post('/meetings/meetings.php', { action: 'set_participant_role', meeting_id, user_id, participant_role }),
  removeParticipant: (meeting_id, user_id) => api.post('/meetings/meetings.php', { action: 'remove_participant', meeting_id, user_id }),
  updateAttendees: (meeting_id, attendee_ids) => api.post('/meetings/meetings.php', { action: 'update_attendees', meeting_id, attendee_ids }),
  getMinutes: (meetingId) => api.get(`/meetings/minutes.php?meeting_id=${meetingId}`),
  saveMinutes: (data) => api.post('/meetings/minutes.php', data),
  getIceServers: () => api.get('/meetings/ice-servers.php'),
  pollSignals: (meetingId) => api.get(`/meetings/webrtc.php?meeting_id=${meetingId}`),
  sendSignal: (data) => api.post('/meetings/webrtc.php', data),
  cleanupSignals: (meetingId) => api.post('/meetings/webrtc.php', { action: 'cleanup', meeting_id: meetingId }),
};

export const pushNotificationsAPI = {
  getStatus: () => api.get('/notifications/push-subscriptions.php'),
  register: (token, platform = 'web') => api.post('/notifications/push-subscriptions.php', {
    action: 'register',
    token,
    platform,
    user_agent: navigator.userAgent || '',
  }),
  unregister: (token) => api.post('/notifications/push-subscriptions.php', {
    action: 'unregister',
    token,
  }),
};

export const userPermissionsAPI = {
  getPermissions: () => api.get('/users/edit-permissions.php'),
  setPermission: (username, canEdit) => api.post('/users/edit-permissions.php', { username, can_edit: canEdit }),
};

export const notificationsAPI = {
  getUnread: () => api.get('/notifications/notifications.php?action=unread'),
  getAll: (limit = 50) => api.get(`/notifications/notifications.php?action=all&limit=${limit}`),
  getMeetingReminders: () => api.get('/notifications/notifications.php?action=meeting_reminders'),
  markRead: (id) => api.post('/notifications/notifications.php', { action: 'mark_read', id }),
  markAllRead: () => api.post('/notifications/notifications.php', { action: 'mark_all_read' }),
  dismissMeetingReminders: () => api.post('/notifications/notifications.php', { action: 'dismiss_meeting_reminders' }),
};

export const calendarAPI = {
  getEvents: (month, year) => api.get(`/calendar/events.php?month=${month}&year=${year}`),
  createEvent: (data) => api.post('/calendar/events.php', { action: 'create', ...data }),
  updateEvent: (id, data) => api.post('/calendar/events.php', { action: 'update', id, ...data }),
  deleteEvent: (id) => api.post('/calendar/events.php', { action: 'delete', id }),
};

export const reservationsAPI = {
  submit: (data) => api.post('/reservations/submit.php', data),
  availability: (date, time) => api.get('/reservations/availability.php', { params: { date, time } }),
  list: (params = {}) => api.get('/reservations/list.php', { params }),
  get: (id) => api.get(`/reservations/get.php?id=${id}`),
  updateStatus: (data) => api.post('/reservations/update-status.php', data),
};

// Workspace foundation contracts (stubs for next iteration)
export const workspaceBoardsAPI = {
  list: () => api.get('/workspace/boards.php'),
  listUsers: () => api.get('/workspace/boards.php', { params: { users: 1 } }),
  create: (payload) => api.post('/workspace/boards.php', { action: 'create_board', ...payload }),
  createCard: (payload) => api.post('/workspace/boards.php', { action: 'create_card', ...payload }),
  createColumn: (payload) => api.post('/workspace/boards.php', { action: 'create_column', ...payload }),
  deleteColumn: (payload) => api.post('/workspace/boards.php', { action: 'delete_column', ...payload }),
  updateBoard: (payload) => api.post('/workspace/boards.php', { action: 'update_board', ...payload }),
  updateColumn: (payload) => api.post('/workspace/boards.php', { action: 'update_column', ...payload }),
  updateCard: (payload) => api.post('/workspace/boards.php', { action: 'update_card', ...payload }),
  deleteCard: (payload) => api.post('/workspace/boards.php', { action: 'delete_card', ...payload }),
  getCardDetail: (payload) => api.post('/workspace/boards.php', { action: 'get_card_detail', ...payload }),
  addChecklistItem: (payload) => api.post('/workspace/boards.php', { action: 'add_checklist_item', ...payload }),
  toggleChecklistItem: (payload) => api.post('/workspace/boards.php', { action: 'toggle_checklist_item', ...payload }),
  deleteChecklistItem: (payload) => api.post('/workspace/boards.php', { action: 'delete_checklist_item', ...payload }),
  addComment: (payload) => api.post('/workspace/boards.php', { action: 'add_comment', ...payload }),
  moveCard: (payload) => api.post('/workspace/boards.php', { action: 'move_card', ...payload }),
  update: (id, payload) => api.post('/workspace/boards.php', { action: 'update_board', board_id: id, ...(payload || {}) }),
  archive: (id) => api.post('/workspace/boards.php', { action: 'archive_board', board_id: id }),
};

export const workspaceListsAPI = {
  listGroups: () => api.get('/workspace/lists.php'),
  createGroup: (payload) => api.post('/workspace/lists.php', { action: 'create_list', ...payload }),
  updateGroup: (payload) => api.post('/workspace/lists.php', { action: 'update_list', ...payload }),
  deleteGroup: (payload) => api.post('/workspace/lists.php', { action: 'delete_list', ...payload }),
  listItems: (groupId) => api.get('/workspace/lists.php', { params: { listId: groupId } }),
  saveItem: (payload) => api.post('/workspace/lists.php', { action: 'add_item', ...payload }),
  updateItem: (payload) => api.post('/workspace/lists.php', { action: 'update_item', ...payload }),
  deleteItem: (payload) => api.post('/workspace/lists.php', { action: 'delete_item', ...payload }),
  toggleItem: (payload) => api.post('/workspace/lists.php', { action: 'toggle_item', ...payload }),
};

export const workspaceNotesAPI = {
  list: () => api.get('/workspace/notes.php'),
  create: (payload) => api.post('/workspace/notes.php', { action: 'create_note', ...payload }),
  togglePin: (payload) => api.post('/workspace/notes.php', { action: 'toggle_pin', ...payload }),
  update: (id, payload) => api.post('/workspace/notes.php', { action: 'update_note', note_id: id, ...(payload || {}) }),
  remove: (id) => api.post('/workspace/notes.php', { action: 'delete_note', note_id: id }),
};

export const workspaceSocialAPI = {
  list: () => api.get('/workspace/social.php'),
  createPost: (payload) => api.post('/workspace/social.php', { action: 'create_post', ...payload }),
  uploadAttachment: (formData) => api.post('/workspace/social.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  createComment: (payload) => api.post('/workspace/social.php', { action: 'create_comment', ...payload }),
  togglePin: (payload) => api.post('/workspace/social.php', { action: 'toggle_pin', ...payload }),
  toggleReaction: (payload) => api.post('/workspace/social.php', { action: 'toggle_reaction', ...payload }),
  markMentionsSeen: () => api.post('/workspace/social.php', { action: 'mark_mentions_seen' }),
  markMentionSeen: (payload) => api.post('/workspace/social.php', { action: 'mark_mention_seen', ...payload }),
};

export const workspaceAssistantAPI = {
  ask: (question) => api.post('/workspace/assistant.php', { action: 'ask', question }),
};

export default api;
