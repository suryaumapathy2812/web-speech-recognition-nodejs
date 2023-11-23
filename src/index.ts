declare var require: any

require('dotenv').config();
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);

import { Server } from 'socket.io';
import { ListMessages, initializeThread, sendMessage } from './assistant';
import { Thread } from 'openai/resources/beta/threads/threads';

const io = new Server(server, {
  cors: {
    origin: "*"
  }
})


type UserSession = {
  user_id: string,
  sessions: string[],
  user: {
    name: string,
    email: string,
    id: string
  },
  thread: Thread
}


const user_sessions: UserSession[] = [];

io.on('connection', (socket) => {
  console.log('a user connected')

  socket.on('user_connected', async (user) => {
    console.log("[USER_CONNECTED]", user);

    let userSession: UserSession | null = null;

    const existing_user_session = user_sessions.find((user_session) => user_session.user_id === user?.email)

    if (existing_user_session) {
      console.debug("[EXISTING_USER_SESSION]", existing_user_session)
      const existing_user_session_socket = existing_user_session.sessions.find((session) => session === socket.id)
      if (!existing_user_session_socket) {
        existing_user_session.sessions.push(socket.id);
      }
      userSession = existing_user_session;
    } else {
      console.debug("[NEW_USER_SESSION]")
      console.log("[USER_CONNECTED]", user);

      const thread = await initializeThread();
      const user_session: any = {};

      user_session.user_id = user?.email;
      user_session.sessions = [socket.id];
      user_session.user = user;
      user_session.thread = thread;

      console.log("[USER_SESSION]", user_session)

      user_sessions.push(user_session);
      userSession = user_session;
    }

    const messages = await ListMessages((userSession?.thread?.id as string));
    socket.emit('user_connection_success', { userSession, messages: messages });

  })


  socket.on('message', async (data: { message: string, userSession: UserSession }) => {

    console.log("[MESSAGE_DATA]", data);

    // OPENAI
    const response = await sendMessage(data.userSession?.thread?.id, data.message);
    console.log("[GPT_RESPONSE]", response);
    socket.emit('conversation_response', response);

  })
})

server.listen(3000, () => {
  console.log('listening on *:3000');
})