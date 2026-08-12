import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  // Map to store connected clients: Map<userId, Set<socketId>>
  private userSockets: Map<string, Set<string>> = new Map();

  afterInit(server: Server) {
    this.logger.log('Notifications WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.query.userId as string;
    const role = client.handshake.query.role as string;

    if (!userId) {
      this.logger.warn(`Client connected without userId: ${client.id}`);
      return;
    }

    // Add to user map
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    // Join a room for the user to make emitting easier
    client.join(`user_${userId}`);
    
    // Join a role-based room (e.g., 'role_ADMIN')
    if (role) {
      client.join(`role_${role.toUpperCase()}`);
    }

    this.logger.log(`Client connected: ${client.id}, User: ${userId}, Role: ${role}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}, User: ${userId}`);
  }

  /**
   * Broadcast a notification to a specific user
   * @param userId The recipient's user ID
   * @param payload The notification payload
   */
  sendToUser(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit('new_notification', payload);
    this.logger.log(`Sent notification to user ${userId}`);
  }

  /**
   * Broadcast a notification to a specific role (e.g., all ADMINs)
   * @param role The role to notify
   * @param payload The notification payload
   */
  sendToRole(role: string, payload: any) {
    this.server.to(`role_${role.toUpperCase()}`).emit('new_notification', payload);
    this.logger.log(`Sent notification to role ${role.toUpperCase()}`);
  }
}
