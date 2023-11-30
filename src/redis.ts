import { Redis } from "ioredis";
import { UserSession } from "./types";


const $REDIS_CLIENT = new Redis(process.env.REDIS_URL as string);

/**
 * This function creates a new user session
 * 
 * @param email 
 * @param newSession 
 * @returns 
 */
async function createUserSession(email: string, newSession: UserSession): Promise<UserSession> {
  await $REDIS_CLIENT.set(email, JSON.stringify(newSession));
  return newSession;
}

/**
 * This function is used to get a user session
 * 
 * @param email 
 * @returns 
 */
async function getUserSession(email: string): Promise<UserSession | null> {
  const sessions = await $REDIS_CLIENT.get(email);
  console.debug("[GET_USER_SESSION]", sessions);
  if (sessions)
    return JSON.parse(sessions);
  return null
}


/**
 * This function is used to set a user session socket
 * 
 * @param email 
 * @param socketId 
 */
async function addUserSessionSocket(email: string, socketId: string): Promise<void> {
  const userSession = await getUserSession(email);
  userSession?.sockets.find((_socket) => _socket === socketId) || userSession?.sockets.push(socketId);
  await $REDIS_CLIENT.set(email, JSON.stringify(userSession));
}


/**
 * This function is used to delete a user session socket
 * 
 * @param email 
 * @param socketId 
 */
async function deleteUserSessionSocket(email: string, socketId: string): Promise<void> {
  const userSession = await getUserSession(email);
  userSession?.sockets.filter((_socket) => _socket !== socketId);
  await $REDIS_CLIENT.set(email, JSON.stringify(userSession));
}



async function getAllUserSessions(): Promise<UserSession[]> {
  const keys = await $REDIS_CLIENT.keys('*');
  if (keys && keys.length > 0) {
    const sessions = await $REDIS_CLIENT.mget(keys);
    return sessions.map((session: any) => JSON.parse(session));
  } else {
    return [];
  }
}




export namespace SESSION {
  export const createSession = createUserSession;
  export const getSession = getUserSession;
}

export namespace SOCKET {
  export const addSocket = addUserSessionSocket;
  export const deleteSocket = deleteUserSessionSocket;
}

export { getAllUserSessions }
