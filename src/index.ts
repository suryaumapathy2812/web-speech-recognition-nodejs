declare var require: any

require('dotenv').config();
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { ListMessages, initializeThread, sendMessage } from './assistant';
import { Thread } from 'openai/resources/beta/threads/threads';
import uuid from 'uuid';

// import { PrismaClient } from '@prisma/client'
// const prisma = new PrismaClient()


type UserSession = {
  user_id: string,
  sockets: string[],
  user: {
    name: string,
    email: string,
    id: string
  },
  thread: Thread
}

const port = process.env.PORT || 8000;
const app = express();

app.get('/', (req, res) => {
  res.send('The app is running');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const user_sessions: UserSession[] = [];

// io.engine.generateId = (req) => {
//   return uuid.v4();
// }

io.on('connection', (SOCKET) => {
  console.log('a user connected');

  SOCKET.on('user_connected', async (user) => {
    console.log("[USER_CONNECTED]", user);

    if (!user) {
      return;
    }

    let userSession: UserSession | null = null;

    const existing_user_session = user_sessions.find((user_session) => user_session.user_id === user?.email)

    if (existing_user_session) {
      console.debug("[EXISTING_USER_SESSION]", existing_user_session)
      const existing_user_session_socket = existing_user_session.sockets.find((_socket) => _socket === SOCKET.id)
      if (!existing_user_session_socket) {
        existing_user_session.sockets.push(SOCKET.id);
      }
      userSession = existing_user_session;
    } else {
      console.debug("[NEW_USER_SESSION]")
      console.log("[USER_CONNECTED]", user);

      const thread = await initializeThread();
      const user_session: UserSession = {
        user_id: user?.email,
        sockets: [SOCKET.id],
        user: user,
        thread: thread,
      };

      console.log("[USER_SESSION]", user_session)

      user_sessions.push(user_session);
      userSession = user_session;
    }

    const messages = await ListMessages((userSession?.thread?.id as string));
    SOCKET.emit('user_connection_success', { userSession, messages: messages });
  })

  SOCKET.on('message', async (data: { message: string, userSession: UserSession }) => {

    console.log("[MESSAGE_DATA]", data);

    // OPENAI
    const response = await sendMessage(data.userSession?.thread?.id, data.message);
    console.log("[GPT_RESPONSE]", response);
    const sessions = user_sessions.find(_s => _s.user_id === data.userSession?.user_id)?.sockets
    console.log("[SESSIONS]", sessions);
    sessions?.forEach(session => {
      io.to(session).emit('conversation_response', response);
    })

    // socket.emit('conversation_response', response);

  })

  SOCKET.on('disconnect', async (data) => {
    console.log('user disconnected');
    console.log("[DISCONNECT_DATA]", data)

    const user_session = user_sessions.find((user_session) => user_session.sockets.find((session) => session === SOCKET.id))
    if (user_session) {
      user_session.sockets = user_session.sockets.filter((session) => session !== SOCKET.id);
      if (user_session.sockets.length === 0) {
        user_sessions.filter((session) => session.user_id !== user_session.user_id);
      }
    }
  })

})

server.listen(port, () => {
  console.log('listening on *:' + port);
})