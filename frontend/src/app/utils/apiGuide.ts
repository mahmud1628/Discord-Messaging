/**
 * API Integration Guide
 * 
 * Replace the mock API calls in this context with real REST API calls.
 * 
 * Authentication Endpoints:
 * - POST /api/auth/login { email, password }
 * - POST /api/auth/register { email, username, displayName, password, dateOfBirth }
 * - POST /api/auth/logout
 * - GET /api/auth/me (get current user)
 * 
 * Server Endpoints:
 * - GET /api/servers (list all servers for user)
 * - POST /api/servers { name, icon }
 * - GET /api/servers/:serverId
 * - PATCH /api/servers/:serverId { name, icon }
 * - DELETE /api/servers/:serverId
 * 
 * Channel Endpoints:
 * - GET /api/servers/:serverId/channels
 * - POST /api/servers/:serverId/channels { name, type }
 * - PATCH /api/channels/:channelId { name }
 * - DELETE /api/channels/:channelId
 * 
 * Message Endpoints:
 * - GET /api/channels/:channelId/messages?limit=50&before=<messageId>
 * - POST /api/channels/:channelId/messages { content }
 * - PATCH /api/messages/:messageId { content }
 * - DELETE /api/messages/:messageId
 * 
 * Reaction Endpoints:
 * - POST /api/messages/:messageId/reactions { emoji }
 * - DELETE /api/messages/:messageId/reactions/:emoji/@me
 * 
 * Pin Endpoints:
 * - POST /api/messages/:messageId/pin
 * - DELETE /api/messages/:messageId/pin
 * - GET /api/channels/:channelId/pins
 * 
 * Example using fetch:
 * 
 * const sendMessage = async (content: string, channelId: string) => {
 *   const response = await fetch(`/api/channels/${channelId}/messages`, {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${localStorage.getItem('token')}`
 *     },
 *     body: JSON.stringify({ content })
 *   });
 *   
 *   if (!response.ok) {
 *     throw new Error('Failed to send message');
 *   }
 *   
 *   const message = await response.json();
 *   return message;
 * };
 */

export const API_INTEGRATION_GUIDE = "See comments above for REST API endpoints";
